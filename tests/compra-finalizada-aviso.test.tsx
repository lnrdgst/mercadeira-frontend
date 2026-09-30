import { afterEach, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { CompraFinalizadaAviso } from '../src/features/shopping/components/CompraFinalizadaAviso'
import { CompraRevisaoPage } from '../src/features/shopping/pages/CompraRevisaoPage'
import { renderApp } from './helpers'

afterEach(() => vi.restoreAllMocks())

function compra(status: 'EM_ANDAMENTO' | 'FINALIZADA') {
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status, iniciadaEm: '2026-09-01T12:00:00Z', finalizadaEm: status === 'FINALIZADA' ? '2026-09-01T13:00:00Z' : null, finalizadaPor: null,
    participantes: [], contextoUsuario: { participanteCompra: false, podeFinalizarCompra: false, podeReutilizarLista: false }, itens: [],
  }
}

test('renders a compact sticky notice for a finalized purchase', () => {
  renderApp(<CompraFinalizadaAviso />)

  const notice = screen.getByRole('status')
  expect(notice).toHaveClass('sticky', 'top-2')
  expect(notice).toHaveTextContent('Compra finalizada')
  expect(notice).toHaveTextContent('Esta compra não pode mais ser alterada.')
})

test('shows the notice only for a finalized purchase', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(compra('FINALIZADA')))
  const { unmount } = renderApp(<Routes><Route path="/listas/:listaId/compra/revisao" element={<CompraRevisaoPage />} /></Routes>, { route: '/listas/lista-a/compra/revisao' })
  await screen.findByRole('heading', { name: 'Resumo da compra' })
  expect(screen.getByRole('status')).toHaveClass('sticky')
  unmount()

  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(compra('EM_ANDAMENTO')))
  renderApp(<Routes><Route path="/listas/:listaId/compra/revisao" element={<CompraRevisaoPage />} /></Routes>, { route: '/listas/lista-a/compra/revisao' })
  await screen.findByText('Semana')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
