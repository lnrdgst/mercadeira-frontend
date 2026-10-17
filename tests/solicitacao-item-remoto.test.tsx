import { act, fireEvent, screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import { CompraAndamentoPage } from '../src/features/shopping/pages/CompraAndamentoPage'
import type { CompraResponse, PresencaOperacional, SolicitacaoItemCompraResponse } from '../src/features/shopping/types/shopping'
import { deferred, renderApp } from './helpers'

function pedido(id = 's-a', participante = 'p-a'): SolicitacaoItemCompraResponse {
  return { id, descricao: 'Leite', quantidade: 1.125, unidadeMedida: 'LITRO', status: 'PENDENTE', criadoEm: '2026-10-11T12:00:00Z', solicitanteParticipanteCompraId: participante, solicitante: { id: participante, nome: participante === 'p-a' ? 'Ana' : 'Camila' }, decididoEm: null, decisor: null }
}

function compra(estado: PresencaOperacional = 'NAO_PRESENTE', decide = false): CompraResponse {
  return {
    id: 'c-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_ANDAMENTO', iniciadaEm: '2026-10-11T12:00:00Z', finalizadaEm: null, finalizadaPor: null,
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: false, podeFinalizarCompra: false, podeReutilizarLista: false, podeAdicionarItemDuranteCompra: estado !== 'NAO_INFORMADA', podeSolicitarItemRemoto: estado === 'NAO_PRESENTE', podeDecidirSolicitacoesItens: decide },
    participantes: [{ id: 'p-a', membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana', papel: 'MEMBRO', geradoEm: '2026-10-11T12:00:00Z', presencaOperacional: { estado, alteradaEm: null } }],
    solicitacoesItensPendentes: [], itens: [],
  }
}

const showModalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) } })
})
afterAll(() => {
  if (showModalOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalOriginal)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  if (closeOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeOriginal)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

async function preparar(inicial = compra(), get: () => Promise<Response> = async () => Response.json(inicial), post: () => Promise<Response> = async () => Response.json(pedido(), { status: 201 })) {
  let consultas = 0
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (String(input).includes('/itens/sugestoes?')) return Response.json([{ descricao: 'Leite', unidadeMedida: 'LITRO' }])
    if (options?.method === 'POST') return post()
    return ++consultas === 1 ? Response.json(inicial) : get()
  })
  const view = renderApp(<AuthenticatedUserContext value={{ usuario: { id: 'u-a', nome: 'Ana', email: 'a@test.local' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}>
    <Routes><Route path="/listas/:listaId/compra" element={<CompraAndamentoPage />} /></Routes>
  </AuthenticatedUserContext>, { route: '/listas/lista-a/compra' })
  await act(async () => {})
  return { ...view, http, posts: () => http.mock.calls.filter(([, options]) => options?.method === 'POST'), gets: () => http.mock.calls.filter(([url, options]) => options?.method === 'GET' && !String(url).includes('/sugestoes')) }
}

async function clicar(nome: string) { await act(async () => { fireEvent.click(screen.getByRole('button', { name: nome })) }) }
async function avancar(ms = 5000) { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

test('remoto vê solicitação, não inclusão direta nem ação de carrinho', async () => {
  const inicial = compra()
  inicial.itens = [{ id: 'i-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 1, status: 'PENDENTE', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: { podeColocarNoCarrinho: false, podeSolicitarRemocao: false, podeDecidirRemocao: false, podeRestaurarNoCarrinho: false } }]
  await preparar(inicial)
  expect(screen.getByRole('button', { name: '+ Solicitar novo item' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Adicionar novo item à compra' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Colocar no carrinho/ })).not.toBeInTheDocument()
})

test.each(['PRESENTE', 'NAO_INFORMADA'] as const)('%s não recebe ação remota e preserva o fluxo presencial', async (estado) => {
  await preparar(compra(estado))
  expect(screen.queryByRole('button', { name: '+ Solicitar novo item' })).not.toBeInTheDocument()
  expect(!!screen.queryByRole('button', { name: 'Adicionar novo item à compra' })).toBe(estado === 'PRESENTE')
})

test('presença remota e papel ADMINISTRADOR não concedem capabilities ausentes', async () => {
  const inicial = compra()
  inicial.contextoUsuario.podeSolicitarItemRemoto = false
  inicial.contextoUsuario.podeAdicionarItemDuranteCompra = false
  inicial.participantes[0].papel = 'ADMINISTRADOR'
  inicial.solicitacoesItensPendentes = [pedido()]
  await preparar(inicial)
  expect(screen.queryByRole('button', { name: '+ Solicitar novo item' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Recusar' })).not.toBeInTheDocument()
})

test('formulário reutiliza autosuggest, envia só dados do contrato e mostra sucesso e pendência', async () => {
  const atualizada = compra(); atualizada.solicitacoesItensPendentes = [pedido()]
  const { posts, gets } = await preparar(compra(), async () => Response.json(atualizada))
  await clicar('+ Solicitar novo item')
  const dialog = screen.getByRole('dialog', { name: 'Solicitar novo item' })
  expect(dialog.closest('[data-modal-portal]')?.parentElement).toBe(document.body)
  expect(dialog).toHaveClass('overflow-hidden', 'flex-col', 'max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]')
  expect(screen.getByRole('button', { name: 'Fechar modal' })).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Enviar solicitação' }).parentElement).toHaveClass('sticky', 'bottom-0')
  expect(within(dialog).queryByLabelText('Marca')).not.toBeInTheDocument()
  expect(within(dialog).queryByLabelText('Observações')).not.toBeInTheDocument()
  fireEvent.focus(within(dialog).getByLabelText('Descrição'))
  fireEvent.change(within(dialog).getByLabelText('Descrição'), { target: { value: 'le' } })
  await avancar(200)
  await act(async () => { fireEvent.click(within(dialog).getByRole('option', { name: /Leite/ })) })
  expect(within(dialog).getByLabelText('Descrição')).toHaveValue('Leite')
  expect(within(dialog).getByLabelText('Unidade')).toHaveValue('LITRO')
  fireEvent.change(within(dialog).getByLabelText('Quantidade'), { target: { value: '1.125' } })
  await clicar('Enviar solicitação')
  expect(posts()).toHaveLength(1)
  expect(String(posts()[0][0])).toMatch(/\/api\/compras\/c-a\/solicitacoes-itens$/)
  expect(new Headers(posts()[0][1]?.headers).get('Authorization')).toBe('Bearer token-teste')
  expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ descricao: 'Leite', quantidade: 1.125, unidadeMedida: 'LITRO' })
  expect(screen.getByText(/Solicitação enviada/)).toBeVisible()
  expect(screen.getByText('Aguardando aprovação')).toBeVisible()
  expect(screen.getByText('1,125 L')).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Fechar modal' })).not.toBeInTheDocument()
  expect(gets()).toHaveLength(2)
  expect(screen.getByText('Esta compra não possui itens.')).toBeVisible()
})

test('cancelar desmonta o formulário e o overlay do Portal sem criar outro modal', async () => {
  await preparar()
  await clicar('+ Solicitar novo item')
  const dialog = screen.getByRole('dialog', { name: 'Solicitar novo item' })
  expect(document.querySelectorAll('[data-modal-portal]')).toHaveLength(1)

  await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' })) })

  expect(screen.queryByRole('dialog', { name: 'Solicitar novo item' })).not.toBeInTheDocument()
  expect(document.querySelector('[data-modal-portal]')).not.toBeInTheDocument()
})

test.each(['   ', '0', '1.2345'])('validação rejeita descrição/quantidade inválida (%s) sem POST', async (valor) => {
  const { posts } = await preparar()
  await clicar('+ Solicitar novo item')
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Descrição'), { target: { value: valor === '   ' ? valor : 'Leite' } })
  if (valor !== '   ') fireEvent.change(within(dialog).getByLabelText('Quantidade'), { target: { value: valor } })
  // Submissão direta também verifica a validação compartilhada, além da validação HTML.
  await act(async () => { fireEvent.submit(dialog.querySelector('form')!) })
  expect(within(dialog).getByRole('alert')).toBeVisible()
  expect(posts()).toHaveLength(0)
})

test('pendência própria é visível, sem mostrar pedidos de terceiros nem ações de decisão', async () => {
  const inicial = compra(); inicial.solicitacoesItensPendentes = [pedido(), { ...pedido('s-b', 'p-b'), descricao: 'Dipirona' }]
  await preparar(inicial)
  expect(screen.getByText('Leite')).toBeVisible()
  expect(screen.queryByText('Dipirona')).not.toBeInTheDocument()
  expect(screen.getByText('Aguardando aprovação')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
})

test('responsável MEMBRO vê nome histórico e decisões pela capability, sem depender de papel', async () => {
  const inicial = compra('PRESENTE', true); inicial.solicitacoesItensPendentes = [pedido('s-b', 'p-b')]
  inicial.solicitacoesItensPendentes[0].descricao = 'Tesoura para acabamento de tecidos e trabalhos artesanais com descrição longa'
  await preparar(inicial)
  expect(screen.getByText('Novo item solicitado')).toBeVisible()
  const card = screen.getByText('Novo item solicitado').closest('li')!
  expect(card).toHaveClass('rounded-card', 'bg-surface', 'w-full', 'min-w-0', '[overflow-wrap:anywhere]')
  expect(card).toHaveClass('border-orange-200')
  expect(card).not.toHaveClass('rounded-control', 'rounded-full')
  expect(card).toHaveTextContent('Tesoura para acabamento de tecidos e trabalhos artesanais com descrição longa')
  expect(screen.getByText('Solicitado por Camila')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Aprovar' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Recusar' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Aprovar' })).toHaveClass('bg-orange-800')
  expect(screen.getByRole('button', { name: 'Recusar' })).toHaveClass('border-orange-800', 'text-orange-800')
})

test.each(['Aprovar', 'Recusar'])('%s chama endpoint, recarrega Compra e remove pendência; somente aprovação recebe ItemCompra', async (acao) => {
  const inicial = compra('PRESENTE', true); inicial.solicitacoesItensPendentes = [pedido('s-b', 'p-b')]
  const atualizada = compra('PRESENTE', true)
  if (acao === 'Aprovar') atualizada.itens = [{ id: 'i-backend', descricao: 'Leite', quantidade: 1.125, unidadeMedida: 'LITRO', marca: null, observacoes: null, ordemExibicao: 1, status: 'PENDENTE', adicionadoDuranteCompra: true, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: { podeColocarNoCarrinho: true, podeSolicitarRemocao: false, podeDecidirRemocao: false, podeRestaurarNoCarrinho: false } }]
  const { posts, gets } = await preparar(inicial, async () => Response.json(atualizada), async () => Response.json({ ...pedido(), status: acao === 'Aprovar' ? 'APROVADA' : 'RECUSADA' }))
  await clicar(acao)
  expect(posts()).toHaveLength(1)
  expect(String(posts()[0][0])).toMatch(new RegExp(`/compras/c-a/solicitacoes-itens/s-b/${acao === 'Aprovar' ? 'aprovar' : 'recusar'}$`))
  expect(posts()[0][1]?.body).toBeUndefined()
  expect(gets()).toHaveLength(2)
  expect(screen.queryByText('Novo item solicitado')).not.toBeInTheDocument()
  if (acao === 'Aprovar') expect(screen.getByRole('button', { name: 'Colocar no carrinho: Leite' })).toBeVisible()
  else expect(screen.queryByText('Leite')).not.toBeInTheDocument()
  expect(screen.getByText(acao === 'Aprovar' ? 'Solicitação aprovada.' : 'Solicitação recusada.')).toBeVisible()
})

test.each(['Aprovar', 'Recusar'])('erro ao %s preserva pendência, mostra alerta e libera ações', async (acao) => {
  const inicial = compra('PRESENTE', true); inicial.solicitacoesItensPendentes = [pedido('s-b', 'p-b')]
  await preparar(inicial, undefined, async () => new Response(null, { status: 409 }))
  await clicar(acao)
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.getByText('Leite')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Aprovar' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Recusar' })).toBeEnabled()
})

test.each(['Aprovar', 'Recusar'])('%s bloqueia duplo clique e ambas ações enquanto comando está pendente', async (acao) => {
  const inicial = compra('PRESENTE', true); inicial.solicitacoesItensPendentes = [pedido()]
  const pendente = deferred<Response>()
  const { posts } = await preparar(inicial, async () => Response.json(compra('PRESENTE', true)), () => pendente.promise)
  await clicar(acao)
  expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Recusar' })).toBeDisabled()
  await clicar(acao)
  expect(posts()).toHaveLength(1)
  await act(async () => pendente.resolve(Response.json(pedido())))
})

test('criação evita duplo envio e mantém formulário quando POST falha', async () => {
  const pendente = deferred<Response>()
  const { posts } = await preparar(compra(), undefined, () => pendente.promise)
  await clicar('+ Solicitar novo item')
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Leite' } })
  await clicar('Enviar solicitação')
  expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()
  await act(async () => { fireEvent.submit(screen.getByRole('dialog').querySelector('form')!) })
  expect(posts()).toHaveLength(1)
  await act(async () => pendente.resolve(new Response(null, { status: 400 })))
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.getByLabelText('Descrição')).toHaveValue('Leite')
  expect(screen.getByRole('button', { name: 'Enviar solicitação' })).toBeEnabled()
})

test('polling único recebe pendências e capabilities e reflete decisão de outro cliente', async () => {
  let atualizada = compra('PRESENTE', true)
  const { gets } = await preparar(atualizada, async () => Response.json(atualizada))
  expect(vi.getTimerCount()).toBe(1)
  atualizada = { ...atualizada, solicitacoesItensPendentes: [pedido('s-b', 'p-b')] }
  await avancar()
  expect(screen.getByRole('button', { name: 'Aprovar' })).toBeVisible()
  expect(vi.getTimerCount()).toBe(1)
  atualizada = { ...atualizada, solicitacoesItensPendentes: [], contextoUsuario: { ...atualizada.contextoUsuario, podeDecidirSolicitacoesItens: false, podeSolicitarItemRemoto: true } }
  await avancar()
  expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '+ Solicitar novo item' })).toBeVisible()
  expect(gets()).toHaveLength(3)
  expect(vi.getTimerCount()).toBe(1)
  expect(gets().every(([url]) => String(url).endsWith('/familias/familia-a/listas/lista-a/compra'))).toBe(true)
})

test('POST confirmado com refresh falho não é reenviado; retry e polling recuperam sem duplicar item', async () => {
  const inicial = compra('PRESENTE', true); inicial.solicitacoesItensPendentes = [pedido()]
  let falhar = true
  const { posts } = await preparar(inicial, async () => { if (falhar) throw new TypeError('offline'); return Response.json(compra('PRESENTE', true)) }, async () => Response.json(pedido()))
  await clicar('Aprovar')
  expect(screen.getByRole('alert')).toHaveTextContent('A operação foi confirmada')
  expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
  expect(posts()).toHaveLength(1)
  await clicar('Atualizar compra')
  expect(screen.getByRole('alert')).toHaveTextContent('Tente novamente')
  falhar = false
  await avancar()
  expect(screen.queryByText('Novo item solicitado')).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(posts()).toHaveLength(1)
})

test('quantidade e unidade opcionais são enviadas como null, sem campos extras', async () => {
  const { posts } = await preparar()
  await clicar('+ Solicitar novo item')
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: '  Dipirona  ' } })
  await clicar('Enviar solicitação')
  expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ descricao: 'Dipirona', quantidade: null, unidadeMedida: null })
})

test.each(['Enviar solicitação', 'Aprovar', 'Recusar'])('401 no comando %s segue o encerramento da sessão existente', async (acao) => {
  const inicial = compra(acao === 'Enviar solicitação' ? 'NAO_PRESENTE' : 'PRESENTE', acao !== 'Enviar solicitação')
  inicial.solicitacoesItensPendentes = [pedido()]
  const { session } = await preparar(inicial, undefined, async () => new Response(null, { status: 401 }))
  if (acao === 'Enviar solicitação') {
    await clicar('+ Solicitar novo item')
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Leite' } })
  }
  await clicar(acao)
  expect(session.logout).toHaveBeenCalledOnce()
})

test('criação confirmada com refresh falho fecha o modal e bloqueia reenvio até refresh manual', async () => {
  let falhar = true
  const atualizada = compra(); atualizada.solicitacoesItensPendentes = [pedido()]
  const { posts } = await preparar(compra(), async () => { if (falhar) throw new TypeError('offline'); return Response.json(atualizada) })
  await clicar('+ Solicitar novo item')
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Leite' } })
  await clicar('Enviar solicitação')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText(/Solicitação enviada/)).toBeVisible()
  expect(screen.getByRole('button', { name: '+ Solicitar novo item' })).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('A operação foi confirmada')
  falhar = false
  await clicar('Atualizar compra')
  expect(screen.getByText('Aguardando aprovação')).toBeVisible()
  expect(screen.getByRole('button', { name: '+ Solicitar novo item' })).toBeEnabled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(posts()).toHaveLength(1)
})
