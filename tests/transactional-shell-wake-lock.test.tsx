import { act, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { useEffect } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { TransactionalShell } from '../src/app/layouts/TransactionalShell'
import { useCompraTransacional } from '../src/features/shopping/session/CompraTransacionalContext'
import type { CompraResponse } from '../src/features/shopping/types/shopping'

type StatusCompra = CompraResponse['status']
type Sentinel = EventTarget & { release: ReturnType<typeof vi.fn> }

const wakeLockOriginal = Object.getOwnPropertyDescriptor(navigator, 'wakeLock')

function criarSentinel(): Sentinel {
  const sentinel = new EventTarget() as Sentinel
  sentinel.release = vi.fn(async () => {})
  return sentinel
}

function RotaCompra({ status, destino }: { status: StatusCompra; destino: string }) {
  const { atualizarStatusCompra } = useCompraTransacional()
  useEffect(() => { atualizarStatusCompra('lista-a', status) }, [atualizarStatusCompra, status])
  return <><p>{destino}</p><Link to={destino === 'Andamento' ? '/listas/lista-a/compra/revisao' : '/listas/lista-a/compra'}>Navegar</Link></>
}

function renderFluxo(statusAndamento: StatusCompra = 'EM_ANDAMENTO', statusRevisao: StatusCompra = 'EM_ANDAMENTO', rotaInicial = '/listas/lista-a/compra') {
  return render(<MemoryRouter initialEntries={[rotaInicial]}>
    <Routes>
      <Route element={<TransactionalShell />}>
        <Route path="/listas/:listaId/compra" element={<RotaCompra status={statusAndamento} destino="Andamento" />} />
        <Route path="/listas/:listaId/compra/revisao" element={<RotaCompra status={statusRevisao} destino="Revisão" />} />
      </Route>
    </Routes>
  </MemoryRouter>)
}

afterEach(() => {
  localStorage.clear()
  if (wakeLockOriginal) Object.defineProperty(navigator, 'wakeLock', wakeLockOriginal)
  else Reflect.deleteProperty(navigator, 'wakeLock')
  vi.restoreAllMocks()
})

test('TransactionalShell preserva o mesmo Wake Lock entre andamento e revisão', async () => {
  const sentinel = criarSentinel()
  const request = vi.fn(async () => sentinel)
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  renderFluxo()

  await waitFor(() => expect(request).toHaveBeenCalledOnce())
  await act(async () => { screen.getByRole('link', { name: 'Navegar' }).click() })
  expect(await screen.findByText('Revisão')).toBeVisible()
  expect(sentinel.release).not.toHaveBeenCalled()
  expect(request).toHaveBeenCalledOnce()

  await act(async () => { screen.getByRole('link', { name: 'Navegar' }).click() })
  expect(await screen.findByText('Andamento')).toBeVisible()
  expect(sentinel.release).not.toHaveBeenCalled()
  expect(request).toHaveBeenCalledOnce()
})

test('status FINALIZADA no fluxo libera Wake Lock e revisão finalizada não solicita', async () => {
  const sentinel = criarSentinel()
  const request = vi.fn(async () => sentinel)
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  const view = renderFluxo('EM_ANDAMENTO', 'FINALIZADA')

  await waitFor(() => expect(request).toHaveBeenCalledOnce())
  await act(async () => { screen.getByRole('link', { name: 'Navegar' }).click() })
  expect(await screen.findByText('Revisão')).toBeVisible()
  await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce())
  expect(request).toHaveBeenCalledOnce()
  view.unmount()
})

test('sair do TransactionalShell libera Wake Lock', async () => {
  const sentinel = criarSentinel()
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: vi.fn(async () => sentinel) } })
  const view = renderFluxo()
  await waitFor(() => expect(screen.getByText('Andamento')).toBeVisible())

  view.unmount()
  await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce())
})

test('revisão aberta já FINALIZADA não solicita Wake Lock', async () => {
  const request = vi.fn(async () => criarSentinel())
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  renderFluxo('EM_ANDAMENTO', 'FINALIZADA', '/listas/lista-a/compra/revisao')

  expect(await screen.findByText('Revisão')).toBeVisible()
  await act(async () => { await Promise.resolve() })
  expect(request).not.toHaveBeenCalled()
})

test('preferência desligada permanece desligada ao navegar entre as rotas transacionais', async () => {
  const sentinel = criarSentinel()
  const request = vi.fn(async () => sentinel)
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  renderFluxo()

  await waitFor(() => expect(request).toHaveBeenCalledOnce())
  await act(async () => { screen.getByRole('button', { name: 'Desligar' }).click() })
  await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce())
  await act(async () => { screen.getByRole('link', { name: 'Navegar' }).click() })
  expect(await screen.findByText('Revisão')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Ligar' })).toBeVisible()
  expect(request).toHaveBeenCalledOnce()
})
