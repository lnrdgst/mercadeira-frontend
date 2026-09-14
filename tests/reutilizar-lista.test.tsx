import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { CompraRevisaoPage } from '../src/features/shopping/pages/CompraRevisaoPage'
import { deferred, renderApp } from './helpers'

const descriptors = ['showModal', 'close'].map((name) => [name, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)] as const)
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})
afterAll(() => {
  cleanup()
  for (const [name, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

function compra(podeReutilizarLista = true, statuses = ['PENDENTE', 'NO_CARRINHO', 'REMOVIDO', 'PENDENTE']) {
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status: 'FINALIZADA', iniciadaEm: '2026-09-01T12:00:00Z', finalizadaEm: '2026-09-01T13:00:00Z', finalizadaPor: null,
    participantes: [], contextoUsuario: { participanteCompra: false, podeFinalizarCompra: false, podeReutilizarLista },
    itens: statuses.map((status, index) => ({
      id: `item-${index}`, descricao: `Produto ${index}`, status, ordemExibicao: index, quantidade: null, unidadeMedida: null,
      marca: null, observacoes: null, adicionadoDuranteCompra: index === 3, adicionadoPor: null, adicionadoEm: null,
      colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null,
      acoes: { podeSolicitarRemocao: false, podeDecidirRemocao: false, podeRestaurarNoCarrinho: false },
    })),
  }
}

function preparar({ inicial = compra(), post = async () => Response.json({ id: 'nova' }, { status: 201 }), get = async () => Response.json(compra(false)) } = {}) {
  let consultas = 0
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (options?.method === 'POST') {
      expect(String(input)).toMatch(/\/familias\/familia-a\/listas\/lista-a\/reutilizar$/)
      expect(options.body).toBeUndefined()
      return post()
    }
    expect(String(input)).toMatch(/\/listas\/lista-a\/compra$/)
    return ++consultas === 1 ? Response.json(inicial) : get()
  })
  const view = renderApp(<Routes>
    <Route path="/listas/:listaId/revisao" element={<CompraRevisaoPage />} />
    <Route path="/listas/nova" element={<h1>Nova preparação</h1>} />
  </Routes>, { route: '/listas/lista-a/revisao' })
  return { ...view, http, posts: () => http.mock.calls.filter(([, options]) => options?.method === 'POST') }
}

async function abrir(user: ReturnType<typeof renderApp>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Usar esta lista novamente' }))
  return screen.getByRole('dialog', { name: 'Criar nova lista a partir desta?' })
}

test('GET da finalizada oferece ação ao observador pela capability; confirmação explica cópia e cancelar retorna foco', async () => {
  const { user, posts } = preparar()
  const dialog = await abrir(user)
  expect(within(dialog).getByText(/3 item\(ns\)/)).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Usar esta lista novamente' })).toHaveFocus()
  expect(posts()).toHaveLength(0)
})

test.each([false, true])('não oferece reutilização sem capability ou com compra em andamento (%s)', async (andamento) => {
  const inicial = compra(false)
  if (andamento) inicial.status = 'EM_ANDAMENTO'
  preparar({ inicial })
  await screen.findByRole('heading', { name: andamento ? 'Revisão da compra' : 'Resumo da compra' })
  await screen.findByText('Semana')
  expect(screen.queryByRole('button', { name: 'Usar esta lista novamente' })).not.toBeInTheDocument()
})

test('POST sem body impede envio duplicado e cancelamento durante espera; 201 navega para nova lista', async () => {
  const pendente = deferred<Response>()
  const { user, posts } = preparar({ post: () => pendente.promise })
  const dialog = await abrir(user)
  await user.dblClick(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' }))
  expect(posts()).toHaveLength(1)
  expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
  expect(dialog).toBeInTheDocument()
  await act(async () => pendente.resolve(Response.json({ id: 'nova' }, { status: 201 })))
  expect(await screen.findByRole('heading', { name: 'Nova preparação' })).toBeInTheDocument()
})

test('compra só com removidos explica preparação vazia e permite confirmar', async () => {
  const { user } = preparar({ inicial: compra(true, ['REMOVIDO']) })
  const dialog = await abrir(user)
  expect(within(dialog).getByText('Não há itens reutilizáveis. A nova lista será criada vazia.')).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' })).toBeEnabled()
})

test.each([403, 409])('%s reconcilia por GET e respeita capability revogada sem repetir POST', async (status) => {
  const { user, posts, http } = preparar({ post: async () => Response.json({ message: 'Indisponível' }, { status }) })
  const dialog = await abrir(user)
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' }))
  expect(await screen.findByText('A reutilização não está mais disponível para esta compra.')).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' })).toBeDisabled()
  expect(http).toHaveBeenCalledTimes(3)
  expect(posts()).toHaveLength(1)
})

test('reconciliação falha bloqueia confirmação até GET bem-sucedido', async () => {
  let falhar = true
  const { user, posts } = preparar({
    post: async () => Response.json({}, { status: 409 }),
    get: async () => { if (falhar) throw new TypeError('offline'); return Response.json(compra()) },
  })
  const dialog = await abrir(user)
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' }))
  const atualizar = await screen.findByRole('button', { name: 'Atualizar compra' })
  expect(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' })).toBeDisabled()
  falhar = false
  await user.click(atualizar)
  await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' })).toBeEnabled())
  expect(posts()).toHaveLength(1)
})

test('falha de rede orienta conferir Minhas Listas e não repete criação automaticamente', async () => {
  const { user, posts } = preparar({ post: async () => { throw new TypeError('offline') } })
  const dialog = await abrir(user)
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' }))
  expect(await screen.findByRole('link', { name: 'Minhas Listas' })).toHaveAttribute('href', '/listas')
  expect(posts()).toHaveLength(1)
})

test('401 encerra sessão', async () => {
  const { user, session } = preparar({ post: async () => Response.json({}, { status: 401 }) })
  const dialog = await abrir(user)
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' }))
  await waitFor(() => expect(session.logout).toHaveBeenCalledOnce())
})

test('resposta após sair da página não navega nem repete o POST', async () => {
  const pendente = deferred<Response>()
  const { user, unmount, posts } = preparar({ post: () => pendente.promise })
  const dialog = await abrir(user)
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar e criar lista' }))
  unmount()
  await act(async () => pendente.resolve(Response.json({ id: 'nova' }, { status: 201 })))
  expect(screen.queryByRole('heading', { name: 'Nova preparação' })).not.toBeInTheDocument()
  expect(posts()).toHaveLength(1)
})
