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

function compra(statusItem: 'PENDENTE' | 'NO_CARRINHO') {
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status: 'EM_ANDAMENTO', iniciadaEm: '2026-09-01T12:00:00Z', finalizadaEm: null, finalizadaPor: null, participantes: [],
    contextoUsuario: { participanteCompra: true, podeFinalizarCompra: true, podeReutilizarLista: false },
    itens: [{ id: 'item-a', descricao: 'Arroz', status: statusItem, ordemExibicao: 1, quantidade: null, unidadeMedida: null, marca: null, observacoes: null, adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: {} }],
  }
}

async function abrirConfirmacao(statusItem: 'PENDENTE' | 'NO_CARRINHO') {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(compra(statusItem)))
  const view = renderApp(<Routes><Route path="/listas/:listaId/compra/revisao" element={<CompraRevisaoPage />} /></Routes>, { route: '/listas/lista-a/compra/revisao' })
  await view.user.click(await screen.findByRole('button', { name: 'Finalizar compra' }))
  return screen.getByRole('dialog')
}

test('confirmação de compra com pendente informa que ele permanecerá não comprado', async () => {
  const dialog = await abrirConfirmacao('PENDENTE')

  expect(within(dialog).getByText('A compra será encerrada. Itens pendentes permanecerão registrados como não comprados. Após finalizar, os itens não poderão mais ser alterados.')).toBeVisible()
})

test('confirmação de compra sem pendente não menciona itens não comprados', async () => {
  const dialog = await abrirConfirmacao('NO_CARRINHO')

  expect(within(dialog).getByText('A compra será encerrada. Após finalizar, os itens não poderão mais ser alterados.')).toBeVisible()
  expect(within(dialog).queryByText(/Itens pendentes permanecerão registrados como não comprados/)).not.toBeInTheDocument()
})
