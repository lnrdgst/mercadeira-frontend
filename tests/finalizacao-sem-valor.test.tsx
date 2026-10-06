import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { CompraRevisaoPage } from '../src/features/shopping/pages/CompraRevisaoPage'
import { renderApp } from './helpers'

const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})

afterEach(() => {
  vi.restoreAllMocks()
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal)
  if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close)
})

test('avisa e permite finalizar sem valor financeiro registrado', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status: 'EM_ANDAMENTO', iniciadaEm: '2026-10-02T18:00:00Z', finalizadaEm: null, finalizadaPor: null,
    participantes: [], itens: [{ id: 'item-a', descricao: 'Arroz', status: 'NO_CARRINHO', ordemExibicao: 1, quantidade: null, unidadeMedida: null, marca: null, observacoes: null, adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: {} }],
    registrosFinanceiros: [], totalRegistrado: 0,
    contextoUsuario: { participanteCompra: true, podeFinalizarCompra: true, podeReutilizarLista: false },
  }))
  const view = renderApp(<Routes><Route path="/listas/:listaId/compra/revisao" element={<CompraRevisaoPage />} /></Routes>, { route: '/listas/lista-a/compra/revisao' })

  await view.user.click(await screen.findByRole('button', { name: 'Finalizar compra' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText(/Nenhum valor foi registrado/)).toBeVisible()
  expect(within(dialog).getByRole('button', { name: 'Finalizar sem valor' })).toBeVisible()
  expect(within(dialog).getByRole('button', { name: 'Voltar para revisão' })).toBeVisible()
})
