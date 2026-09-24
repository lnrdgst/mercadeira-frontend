import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { screenWakeLockPreferenceKey, useScreenWakeLock } from '../src/features/shopping/hooks/useScreenWakeLock'
import { deferred } from './helpers'

interface Sentinel extends EventTarget {
  release: ReturnType<typeof vi.fn>
}

const wakeLockOriginal = Object.getOwnPropertyDescriptor(navigator, 'wakeLock')
const visibilityOriginal = Object.getOwnPropertyDescriptor(document, 'visibilityState')

function criarSentinel(): Sentinel {
  const sentinel = new EventTarget() as Sentinel
  sentinel.release = vi.fn(async () => {})
  return sentinel
}

function instalarWakeLock(request: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
}

function definirVisibilidade(estado: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: estado })
}

function Tela({ emAndamento = true }: { emAndamento?: boolean }) {
  const wakeLock = useScreenWakeLock(emAndamento)
  return <>
    <p data-testid="suporte">{String(wakeLock.suportado)}</p>
    <p data-testid="preferencia">{String(wakeLock.preferenciaHabilitada)}</p>
    <p data-testid="ativo">{String(wakeLock.ativo)}</p>
    <button type="button" onClick={() => wakeLock.definirPreferencia(!wakeLock.preferenciaHabilitada)}>
      Alternar
    </button>
  </>
}

afterEach(() => {
  localStorage.clear()
  if (wakeLockOriginal) Object.defineProperty(navigator, 'wakeLock', wakeLockOriginal)
  else Reflect.deleteProperty(navigator, 'wakeLock')
  if (visibilityOriginal) Object.defineProperty(document, 'visibilityState', visibilityOriginal)
  vi.restoreAllMocks()
})

test('Compra em andamento com preferência padrão solicita Wake Lock', async () => {
  const sentinel = criarSentinel()
  const request = vi.fn(async () => sentinel)
  instalarWakeLock(request)
  render(<Tela />)

  await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
  expect(screen.getByTestId('ativo')).toHaveTextContent('true')
})

test('preferência persistida como desligada não solicita Wake Lock', async () => {
  localStorage.setItem(screenWakeLockPreferenceKey, 'false')
  const request = vi.fn(async () => criarSentinel())
  instalarWakeLock(request)
  render(<Tela />)

  await act(async () => { await Promise.resolve() })
  expect(request).not.toHaveBeenCalled()
  expect(screen.getByTestId('preferencia')).toHaveTextContent('false')
})

test('desligar libera o lock e persiste a preferência', async () => {
  const sentinel = criarSentinel()
  instalarWakeLock(vi.fn(async () => sentinel))
  render(<Tela />)
  await waitFor(() => expect(screen.getByTestId('ativo')).toHaveTextContent('true'))

  await act(async () => { screen.getByRole('button', { name: 'Alternar' }).click() })
  await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce())
  expect(localStorage.getItem(screenWakeLockPreferenceKey)).toBe('false')
})

test('religar solicita um novo Wake Lock', async () => {
  localStorage.setItem(screenWakeLockPreferenceKey, 'false')
  const request = vi.fn(async () => criarSentinel())
  instalarWakeLock(request)
  render(<Tela />)

  await act(async () => { screen.getByRole('button', { name: 'Alternar' }).click() })
  await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
  expect(localStorage.getItem(screenWakeLockPreferenceKey)).toBe('true')
})

test('unmount libera o Wake Lock ativo', async () => {
  const sentinel = criarSentinel()
  instalarWakeLock(vi.fn(async () => sentinel))
  const { unmount } = render(<Tela />)
  await waitFor(() => expect(screen.getByTestId('ativo')).toHaveTextContent('true'))

  unmount()
  await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce())
})

test('Compra finalizada libera o Wake Lock', async () => {
  const sentinel = criarSentinel()
  instalarWakeLock(vi.fn(async () => sentinel))
  const { rerender } = render(<Tela />)
  await waitFor(() => expect(screen.getByTestId('ativo')).toHaveTextContent('true'))

  rerender(<Tela emAndamento={false} />)
  await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce())
})

test('retorno para visible readquire o lock e hidden não faz nova solicitação', async () => {
  definirVisibilidade('hidden')
  const primeiro = criarSentinel()
  const segundo = criarSentinel()
  const request = vi.fn().mockResolvedValueOnce(primeiro).mockResolvedValueOnce(segundo)
  instalarWakeLock(request)
  render(<Tela />)
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve() })
  expect(request).not.toHaveBeenCalled()

  definirVisibilidade('visible')
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
  primeiro.dispatchEvent(new Event('release'))
  await waitFor(() => expect(screen.getByTestId('ativo')).toHaveTextContent('false'))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
})

test('navegador sem suporte não quebra e informa indisponibilidade ao hook', async () => {
  Reflect.deleteProperty(navigator, 'wakeLock')
  render(<Tela />)
  await act(async () => { await Promise.resolve() })
  expect(screen.getByTestId('suporte')).toHaveTextContent('false')
})

test('falha ao adquirir não interrompe o componente', async () => {
  instalarWakeLock(vi.fn(async () => { throw new Error('recusado') }))
  render(<Tela />)
  await act(async () => { await Promise.resolve() })
  expect(screen.getByTestId('ativo')).toHaveTextContent('false')
  expect(screen.getByRole('button', { name: 'Alternar' })).toBeVisible()
})

test('não cria múltiplos locks enquanto uma solicitação está pendente', async () => {
  const pendente = deferred<Sentinel>()
  const request = vi.fn(() => pendente.promise)
  instalarWakeLock(request)
  render(<Tela />)
  await waitFor(() => expect(request).toHaveBeenCalledOnce())

  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(request).toHaveBeenCalledOnce()
  pendente.resolve(criarSentinel())
})
