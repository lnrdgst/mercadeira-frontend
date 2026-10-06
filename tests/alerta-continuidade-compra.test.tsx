import { afterEach, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { AlertaContinuidadeCompraModal } from '../src/features/shopping/components/AlertaContinuidadeCompraModal'
import { renderApp } from './helpers'

afterEach(() => vi.restoreAllMocks())

const alerta = { necessario: true, iniciadaEm: '2026-10-04T12:00:00Z', adiadoAte: null }

test('mostra somente quando o backend informa alerta necessario e fecha localmente', async () => {
  const view = renderApp(<AlertaContinuidadeCompraModal alerta={alerta} token="token" familiaId="familia" listaId="lista" />)
  expect(screen.getByRole('dialog', { name: /Esta compra ainda/ })).toBeVisible()
  expect(screen.getByText(/Iniciada em/)).toBeVisible()
  await view.user.click(screen.getByRole('button', { name: 'Fechar modal' }))
  expect(screen.queryByRole('dialog', { name: /Esta compra ainda/ })).not.toBeInTheDocument()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

test('continuar persiste no endpoint e fecha sem navegar', async () => {
  const atualizada = { id: 'compra', listaId: 'lista', status: 'EM_ANDAMENTO', alertaContinuidade: { ...alerta, necessario: false } }
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(atualizada, { status: 200 }))
  const onAtualizar = vi.fn()
  const view = renderApp(<AlertaContinuidadeCompraModal alerta={alerta} token="token" familiaId="familia" listaId="lista" onAtualizar={onAtualizar} />)
  await view.user.click(screen.getByRole('button', { name: 'Continuar compra' }))
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  expect(String(fetch.mock.calls[0][0])).toContain('/familias/familia/listas/lista/compra/continuar')
  expect(onAtualizar).toHaveBeenCalledWith(atualizada)
  expect(screen.queryByRole('dialog', { name: /Esta compra ainda/ })).not.toBeInTheDocument()
})
