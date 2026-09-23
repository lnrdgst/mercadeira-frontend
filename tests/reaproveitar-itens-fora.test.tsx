import { beforeAll, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { screen, within } from '@testing-library/react'
import { CompraRevisaoPage } from '../src/features/shopping/pages/CompraRevisaoPage'
import { renderApp } from './helpers'

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})

function compra(status = 'FINALIZADA') {
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status, iniciadaEm: '2026-09-01T12:00:00Z', finalizadaEm: '2026-09-01T13:00:00Z', finalizadaPor: null, participantes: [],
    contextoUsuario: { participanteCompra: false, podeFinalizarCompra: false, podeReutilizarLista: true, podeCriarListaComItensQueFicaramDeFora: true },
    itens: [
      { id: 'pendente', descricao: 'Pendente', status: 'PENDENTE', ordemExibicao: 0, quantidade: null, unidadeMedida: null, marca: null, observacoes: null, adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: {} },
      { id: 'removido', descricao: 'Removido', status: 'REMOVIDO', ordemExibicao: 1, quantidade: null, unidadeMedida: null, marca: null, observacoes: null, adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: {} },
      { id: 'carrinho', descricao: 'Carrinho', status: 'NO_CARRINHO', ordemExibicao: 2, quantidade: null, unidadeMedida: null, marca: null, observacoes: null, adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: {} },
    ],
  }
}

function preparar() {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = String(input)
    if (options?.method === 'POST' && path.endsWith('/reaproveitar-itens-fora')) return Response.json({ id: 'nova' }, { status: 201 })
    if (options?.method === 'POST' && path.endsWith('/reutilizar')) return Response.json({ id: 'nova' }, { status: 201 })
    return Response.json(compra())
  })
  return { fetch, ...renderApp(<Routes><Route path="/listas/:listaId/compra/revisao" element={<CompraRevisaoPage />} /><Route path="/listas/nova" element={<h1>Nova lista</h1>} /></Routes>, { route: '/listas/lista-a/compra/revisao' }) }
}

test('lista finalizada oferece seleção somente de pendentes e removidos e envia os ids selecionados', async () => {
  const { user, fetch } = preparar()
  await user.click(await screen.findByRole('button', { name: 'Criar lista com itens que ficaram de fora' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('Pendente')).toBeInTheDocument()
  expect(within(dialog).getByText('Removido')).toBeInTheDocument()
  expect(within(dialog).queryByText('Carrinho')).not.toBeInTheDocument()
  await user.click(within(dialog).getByRole('checkbox', { name: /Removido/ }))
  await user.click(within(dialog).getByRole('button', { name: 'Criar nova lista' }))
  await screen.findByRole('heading', { name: 'Nova lista' })
  const [, options] = fetch.mock.calls.find(([input, options]) => String(input).endsWith('/reaproveitar-itens-fora') && options?.method === 'POST')!
  expect(JSON.parse(String(options?.body))).toEqual({ itemIds: ['pendente'] })
})

test('não apresenta a ação quando a capability não foi concedida', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ...compra(), contextoUsuario: { participanteCompra: false, podeFinalizarCompra: false, podeReutilizarLista: true, podeCriarListaComItensQueFicaramDeFora: false } }))
  renderApp(<Routes><Route path="/listas/:listaId/compra/revisao" element={<CompraRevisaoPage />} /></Routes>, { route: '/listas/lista-a/compra/revisao' })
  await screen.findByText('Semana')
  expect(screen.queryByRole('button', { name: 'Criar lista com itens que ficaram de fora' })).not.toBeInTheDocument()
})

test('após a finalização confirmada abre a seleção dos itens elegíveis', async () => {
  const emAndamento = { ...compra('EM_ANDAMENTO'), contextoUsuario: { participanteCompra: true, podeFinalizarCompra: true, podeReutilizarLista: false, podeCriarListaComItensQueFicaramDeFora: false } }
  let finalizou = false
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).endsWith('/finalizar')) { finalizou = true; return Response.json(compra()) }
    return Response.json(finalizou ? compra() : emAndamento)
  })
  const { user } = renderApp(<Routes><Route path="/listas/:listaId/compra/revisao" element={<CompraRevisaoPage />} /></Routes>, { route: '/listas/lista-a/compra/revisao' })
  await user.click(await screen.findByRole('button', { name: 'Finalizar compra' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar finalização' }))
  expect(await screen.findByRole('dialog')).toHaveTextContent('Criar lista com itens que ficaram de fora?')
})
