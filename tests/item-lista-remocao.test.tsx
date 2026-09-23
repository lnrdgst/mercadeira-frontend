import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { deferred, renderApp } from './helpers'

// jsdom não implementa showModal/close. Só simulamos a abertura/fechamento;
// foco, Tab, Escape e callbacks são executados pelo componente de produção.
const showModalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true, writable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true, writable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') },
  })
})
afterAll(() => {
  cleanup()
  for (const [name, descriptor] of [['showModal', showModalOriginal], ['close', closeOriginal]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

function preparar(deletar: () => Promise<Response> = async () => new Response(null, { status: 204 }), podeAlterar = true,
  respostas: { listar?: () => Promise<Response>; iniciar?: () => Promise<Response> } = {}) {
  let removido = false
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = String(input)
    if (path.endsWith('/compra') && options?.method === 'POST' && respostas.iniciar) return respostas.iniciar()
    if (options?.method === 'DELETE') {
      expect(path).toMatch(/\/familias\/familia-a\/listas\/lista-a\/itens\/item-a$/)
      const resposta = await deletar()
      if (resposta.ok) removido = true
      return resposta
    }
    if (path.endsWith('/participantes')) return Response.json([])
    if (path.endsWith('/itens') && respostas.listar) return respostas.listar()
    if (path.endsWith('/itens')) return Response.json(removido ? [] : [{
      id: 'item-a', descricao: 'Arroz', quantidade: 1, unidadeMedida: 'KG', marca: null, observacoes: null, ordemExibicao: 0,
    }])
    if (path.endsWith('/listas/lista-a')) return Response.json({
      id: 'lista-a', nome: 'Compras da semana', status: 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null,
      criador: { nome: 'Ana', membroFamiliaId: 'membro-a', usuarioId: 'usuario-a' },
      contextoUsuario: { membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: podeAlterar, podeGerenciarParticipantes: false, podeAlterarItens: podeAlterar, podeEditarDadosBasicos: false, podeSairDaLista: false, podeExcluirLista: false },
    })
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  const view = renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' })
  return { ...view, fetchMock, deletes: () => fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE') }
}

async function botaoRemover() {
  const item = (await screen.findByRole('heading', { name: 'Arroz' })).closest('li')!
  return within(item).getByRole('button', { name: 'Remover da lista' })
}

test('abre por teclado, identifica item e modal, contém Tab/Shift+Tab e Escape devolve foco ao acionador', async () => {
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
  const { user, deletes } = preparar()
  const acionador = await botaoRemover()
  acionador.focus()
  await user.keyboard('{Enter}')
  const dialog = screen.getByRole('dialog', { name: 'Remover este item da lista?' })
  expect(showModal).toHaveBeenCalledOnce()
  expect(dialog).toHaveAccessibleDescription('O item “Arroz” será removido desta lista.')
  const cancelar = within(dialog).getByRole('button', { name: 'Cancelar' })
  const confirmar = within(dialog).getByRole('button', { name: 'Remover' })
  expect(cancelar).toHaveFocus()
  await user.tab({ shift: true })
  expect(confirmar).toHaveFocus()
  await user.tab()
  expect(cancelar).toHaveFocus()
  await user.tab()
  expect(confirmar).toHaveFocus()
  await user.tab({ shift: true })
  expect(cancelar).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(acionador).toHaveFocus()
  expect(deletes()).toHaveLength(0)
})

test('Cancelar fecha sem request e restaura foco; reabrir mantém o foco inicial correto', async () => {
  const { user, deletes } = preparar()
  const acionador = await botaoRemover()
  await user.click(acionador)
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
  expect(acionador).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  const cancelEvent = new Event('cancel', { cancelable: true })
  fireEvent(screen.getByRole('dialog'), cancelEvent)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(acionador).toHaveFocus()
  expect(deletes()).toHaveLength(0)
})

test('durante DELETE bloqueia cancelamento e envio duplicado, anuncia progresso e conserva foco interno', async () => {
  const resposta = deferred<Response>()
  const { user, deletes } = preparar(() => resposta.promise)
  await user.click(await botaoRemover())
  const dialog = screen.getByRole('dialog')
  const confirmar = within(dialog).getByRole('button', { name: 'Remover' })
  await user.click(confirmar)
  fireEvent.click(confirmar)
  expect(confirmar).toBeDisabled()
  expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(within(dialog).getByRole('status')).toHaveTextContent('Removendo item...')
  expect(deletes()).toHaveLength(1)
  await user.keyboard('{Escape}')
  const cancelEvent = new Event('cancel', { cancelable: true })
  fireEvent(dialog, cancelEvent)
  expect(cancelEvent.defaultPrevented).toBe(true)
  await user.tab()
  expect(within(dialog).getByRole('heading')).toHaveFocus()
  await user.tab({ shift: true })
  expect(within(dialog).getByRole('heading')).toHaveFocus()
  expect(dialog).toHaveAttribute('open')
  await act(async () => resposta.resolve(new Response(null, { status: 204 })))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

test('sucesso 204 remove o item e leva foco ao título Itens quando o acionador desaparece', async () => {
  const { user, deletes } = preparar()
  const acionador = await botaoRemover()
  await user.click(acionador)
  await user.tab()
  await user.keyboard('{Enter}')
  expect(await screen.findByText('Nenhum item adicionado ainda.')).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(acionador).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Itens' })).toHaveFocus()
  expect(screen.getByRole('status')).toHaveTextContent('Item removido.')
  expect(deletes()).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Iniciar compra' })).toBeDisabled()
  expect(screen.getByText('Adicione pelo menos um item para iniciar a compra.')).toBeInTheDocument()
})

test('erro é anunciado dentro do modal e permite repetir por teclado antes de cancelar', async () => {
  const { user, deletes } = preparar(async () => Response.json({
    timestamp: '2026-09-13T12:00:00Z', status: 409, erro: 'CONFLITO_DE_ESTADO', mensagem: 'A lista não permite esta remoção.', path: '/api/listas',
  }, { status: 409 }))
  const acionador = await botaoRemover()
  await user.click(acionador)
  await user.tab()
  await user.keyboard('{Enter}')
  const dialog = screen.getByRole('dialog')
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('A lista não permite esta remoção.')
  await user.tab()
  expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  await user.tab()
  await user.keyboard('{Enter}')
  await waitFor(() => expect(deletes()).toHaveLength(2))
  await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeEnabled())
  await user.keyboard('{Escape}')
  expect(acionador).toHaveFocus()
  expect(screen.getByRole('heading', { name: 'Arroz' })).toBeInTheDocument()
})

test('consulta sem capability de alteração não oferece remoção nem modal', async () => {
  preparar(undefined, false)
  expect(await screen.findByRole('heading', { name: 'Arroz' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remover da lista' })).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('lista vazia desabilita início, explica o motivo e não abre confirmação nem envia POST', async () => {
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
  const { user, fetchMock } = preparar(undefined, true, { listar: async () => Response.json([]) })
  expect(await screen.findByText('Adicione pelo menos um item para iniciar a compra.')).toBeInTheDocument()
  const iniciar = screen.getByRole('button', { name: 'Iniciar compra' })
  expect(iniciar).toBeDisabled()
  await user.click(iniciar)
  expect(showModal).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
})

test('não inicia durante consulta ou erro; após retry com item ativo permite confirmar ou cancelar', async () => {
  const consulta = deferred<Response>()
  const listar = vi.fn().mockReturnValueOnce(consulta.promise).mockImplementation(async () => Response.json([
    { id: 'item-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 0 },
  ]))
  const { user, fetchMock } = preparar(undefined, true, { listar })
  const iniciar = await screen.findByRole('button', { name: 'Iniciar compra' })
  expect(iniciar).toBeDisabled()
  expect(screen.queryByText('Adicione pelo menos um item para iniciar a compra.')).not.toBeInTheDocument()
  await act(async () => consulta.resolve(new Response(null, { status: 503 })))
  const tentarNovamente = await screen.findByRole('button', { name: 'Tentar novamente' })
  expect(iniciar).toBeDisabled()
  expect(screen.queryByText('Adicione pelo menos um item para iniciar a compra.')).not.toBeInTheDocument()
  await user.click(tentarNovamente)
  expect(await screen.findByRole('heading', { name: 'Arroz' })).toBeInTheDocument()
  expect(iniciar).toBeEnabled()
  await user.click(iniciar)
  const dialog = screen.getByRole('dialog', { name: 'Iniciar compra' })
  expect(within(dialog).getByRole('button', { name: 'Confirmar e iniciar' })).toBeEnabled()
  await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
})

test('mudança concorrente após abrir confirmação continua exibindo o erro real do backend', async () => {
  const mensagem = 'A lista de compra precisa ter ao menos um item ativo para iniciar a compra.'
  const { user, fetchMock } = preparar(undefined, true, { iniciar: async () => Response.json({
    timestamp: '2026-09-13T12:00:00Z', status: 409, erro: 'CONFLITO_DE_ESTADO', mensagem, path: '/api/compra',
  }, { status: 409 }) })
  await screen.findByRole('heading', { name: 'Arroz' })
  await user.click(screen.getByRole('button', { name: 'Iniciar compra' }))
  const dialog = screen.getByRole('dialog', { name: 'Iniciar compra' })
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar e iniciar' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(mensagem)
  expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeEnabled()
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
  expect(screen.getByRole('heading', { name: 'Compras da semana' })).toBeInTheDocument()
})
