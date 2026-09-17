import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { Link, Route, Routes } from 'react-router'
import { CompraAndamentoPage } from '../src/features/shopping/pages/CompraAndamentoPage'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import type { CompraResponse } from '../src/features/shopping/types/shopping'
import { deferred, renderApp } from './helpers'

const showModalDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
})
afterAll(() => {
  if (showModalDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalDescriptor)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
})

function compra(): CompraResponse {
  return {
    id: 'c-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status: 'EM_ANDAMENTO', iniciadaEm: '2026-09-17T12:00:00Z', finalizadaEm: null, finalizadaPor: null,
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: true, podeFinalizarCompra: true, podeReutilizarLista: false },
    participantes: [{ id: 'p-a', membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana', papel: 'MEMBRO', geradoEm: '2026-09-17T12:00:00Z', presencaOperacional: { estado: 'PRESENTE', alteradaEm: '2026-09-17T12:00:00Z' } }],
    itens: [{ id: 'i-a', descricao: 'Arroz', status: 'PENDENTE', ordemExibicao: 1, quantidade: null, unidadeMedida: null, marca: null, observacoes: null,
      adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null,
      acoes: { podeColocarNoCarrinho: true, podeRestaurarNoCarrinho: false, podeSolicitarRemocao: false, podeDecidirRemocao: false } }],
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
})

async function preparar({ inicial = compra(), get = async () => Response.json(compra()), post = async () => Response.json(compra().itens[0]) } = {}) {
  let consultas = 0
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, options) => {
    if (options?.method === 'POST' || options?.method === 'PUT') return post()
    return ++consultas === 1 ? Response.json(inicial) : get()
  })
  const view = renderApp(<AuthenticatedUserContext value={{ usuario: { id: 'u-a', nome: 'Ana', email: 'a@test.local' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}>
    <Link to="/listas/lista-b/compra">Outra compra</Link>
    <Routes><Route path="/listas/:listaId/compra" element={<CompraAndamentoPage />} /></Routes>
  </AuthenticatedUserContext>, { route: '/listas/lista-a/compra' })
  await act(async () => {})
  return { ...view, http, gets: () => http.mock.calls.filter(([, options]) => options?.method === 'GET') }
}

async function avancar(ms = 5_000) { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

async function conexao(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  await act(async () => { fireEvent(window, new Event(online ? 'online' : 'offline')) })
}

test('offline suspende sem apagar dados; online reconcilia imediatamente a Compra completa e retoma um único timer', async () => {
  const nova = compra(); nova.nomeLista = 'Reconectada'
  nova.participantes[0].presencaOperacional.estado = 'NAO_PRESENTE'
  nova.itens[0].acoes.podeColocarNoCarrinho = false
  nova.itens.push({ ...nova.itens[0], id: 'i-b', descricao: 'Item remoto' })
  const { gets } = await preparar({ get: async () => Response.json(nova) })
  await conexao(false)
  expect(vi.getTimerCount()).toBe(0)
  await avancar(30_000)
  fireEvent(window, new Event('focus'))
  expect(gets()).toHaveLength(1)
  expect(screen.getByRole('heading', { name: 'Semana' })).toBeInTheDocument()
  await conexao(true)
  expect(gets()).toHaveLength(2)
  expect(screen.getByRole('heading', { name: 'Reconectada' })).toBeInTheDocument()
  expect(screen.getByText('Não está no mercado')).toBeInTheDocument()
  expect(screen.getByText('Item remoto')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Colocar no carrinho:/ })).not.toBeInTheDocument()
  await act(async () => { fireEvent(window, new Event('focus')); fireEvent(document, new Event('visibilitychange')); fireEvent(window, new Event('online')) })
  expect(gets()).toHaveLength(2)
  expect(vi.getTimerCount()).toBe(1)
  await avancar()
  expect(gets()).toHaveLength(3)
})

test('online não garante conexão: falha preserva estado e próximo ciclo recupera sem retry agressivo', async () => {
  let falhar = true
  const nova = compra(); nova.nomeLista = 'Recuperada'
  const { gets } = await preparar({ get: async () => { if (falhar) throw new TypeError('rede instável'); return Response.json(nova) } })
  await conexao(false); await conexao(true)
  expect(gets()).toHaveLength(2)
  expect(screen.getByRole('heading', { name: 'Semana' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await avancar(4_999)
  expect(gets()).toHaveLength(2)
  falhar = false; await avancar(1)
  expect(screen.getByRole('heading', { name: 'Recuperada' })).toBeInTheDocument()
  expect(gets()).toHaveLength(3)
})

test('offline aborta consulta antiga; reconexão não permite reaplicar resposta anterior', async () => {
  const pendente = deferred<Response>(); let consultas = 0
  const nova = compra(); nova.nomeLista = 'Depois da reconexão'
  const { gets } = await preparar({ get: () => ++consultas === 1 ? pendente.promise : Promise.resolve(Response.json(nova)) })
  await avancar()
  await conexao(false)
  expect(gets()[1][1]!.signal!.aborted).toBe(true)
  await conexao(true)
  await act(async () => pendente.resolve(Response.json(compra())))
  expect(screen.getByRole('heading', { name: 'Depois da reconexão' })).toBeInTheDocument()
})

test('online em aba oculta aguarda visibilidade e depois reconhece finalização remota', async () => {
  const finalizada = compra(); finalizada.status = 'FINALIZADA'
  const { gets } = await preparar({ get: async () => Response.json(finalizada) })
  await conexao(false)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  fireEvent(document, new Event('visibilitychange'))
  await conexao(true); await avancar(20_000)
  expect(gets()).toHaveLength(1)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  await act(async () => { fireEvent(document, new Event('visibilitychange')) })
  expect(screen.getByRole('link', { name: 'Ver resumo' })).toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
  await conexao(false); await conexao(true); await avancar(20_000)
  expect(gets()).toHaveLength(2)
})

test('online durante escrita respeita prioridade local; próximo ciclo continua normalmente', async () => {
  const pendente = deferred<Response>()
  const { gets } = await preparar({ post: () => pendente.promise })
  fireEvent.click(screen.getByRole('button', { name: 'Colocar no carrinho: Arroz' }))
  await conexao(false); await conexao(true)
  expect(gets()).toHaveLength(1)
  await act(async () => pendente.resolve(Response.json(compra().itens[0])))
  await avancar()
  expect(gets()).toHaveLength(2)
})

test('inicialmente offline mantém carregamento existente, mas não inicia polling até online', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  const { gets } = await preparar()
  await avancar(20_000)
  expect(gets()).toHaveLength(1)
  expect(vi.getTimerCount()).toBe(0)
  await conexao(true)
  expect(gets()).toHaveLength(2)
  expect(vi.getTimerCount()).toBe(1)
})

test('5s aplica Compra completa: novo item, presença, contexto e capabilities sem loading recorrente', async () => {
  const nova = compra()
  nova.itens.push({ ...nova.itens[0], id: 'i-b', descricao: 'Feijão remoto', ordemExibicao: 2 })
  nova.participantes[0].presencaOperacional.estado = 'NAO_PRESENTE'
  nova.contextoUsuario.participanteCompra = false
  nova.contextoUsuario.podeAlterarPresenca = false
  nova.itens.forEach(i => { i.acoes.podeColocarNoCarrinho = false })
  const { gets } = await preparar({ get: async () => Response.json(nova) })
  expect(gets()).toHaveLength(1)
  await avancar(4_999)
  expect(gets()).toHaveLength(1)
  await avancar(1)
  expect(gets()).toHaveLength(2)
  expect(screen.getByText('Feijão remoto')).toBeInTheDocument()
  expect(screen.getByText('Não está no mercado')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Adicionar item' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Colocar no carrinho:/ })).not.toBeInTheDocument()
  expect(screen.queryByText('Carregando compra...')).not.toBeInTheDocument()
})

test.each([false, true])('finalizada interrompe/não inicia consultas (%s)', async (inicialmenteFinalizada) => {
  const finalizada = compra(); finalizada.status = 'FINALIZADA'
  const { gets } = await preparar({ inicial: inicialmenteFinalizada ? finalizada : compra(), get: async () => Response.json(finalizada) })
  await avancar()
  expect(screen.getByRole('link', { name: 'Ver resumo' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Adicionar item' })).not.toBeInTheDocument()
  await avancar(90_000)
  expect(gets()).toHaveLength(inicialmenteFinalizada ? 1 : 2)
})

test('aba oculta suspende; retorno consulta imediatamente e focus próximo não duplica', async () => {
  const { gets } = await preparar()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  fireEvent(document, new Event('visibilitychange'))
  await avancar(45_000)
  expect(gets()).toHaveLength(1)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  await act(async () => { fireEvent(document, new Event('visibilitychange')) })
  await act(async () => { fireEvent(window, new Event('focus')) })
  expect(gets()).toHaveLength(2)
  await avancar()
  expect(gets()).toHaveLength(3)
})

test('foco visível consulta e não sobrepõe GET lento nem bloqueia ações', async () => {
  const pendente = deferred<Response>()
  const { gets } = await preparar({ get: () => pendente.promise })
  await act(async () => { fireEvent(window, new Event('focus')) })
  expect(gets()).toHaveLength(2)
  await avancar(45_000)
  expect(gets()).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Adicionar item' })).toBeEnabled()
  expect(screen.queryByText('Carregando compra...')).not.toBeInTheDocument()
  await act(async () => pendente.resolve(Response.json(compra())))
})

test('mutação invalida polling antigo mesmo se transporte ignorar abort; sem GET redundante', async () => {
  const pendente = deferred<Response>()
  const novo = { ...compra().itens[0], status: 'NO_CARRINHO', acoes: { ...compra().itens[0].acoes, podeColocarNoCarrinho: false } }
  const { gets } = await preparar({ get: () => pendente.promise, post: async () => Response.json(novo) })
  await avancar()
  const signal = gets()[1][1]!.signal!
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Colocar no carrinho: Arroz' })) })
  expect(signal.aborted).toBe(true)
  expect(screen.getByText('✓ No carrinho')).toBeInTheDocument()
  await act(async () => pendente.resolve(Response.json(compra())))
  expect(screen.getByText('✓ No carrinho')).toBeInTheDocument()
  expect(gets()).toHaveLength(2)
})

test('escrita em andamento pausa GET, retomando ciclo após terminar', async () => {
  const pendente = deferred<Response>()
  const { gets } = await preparar({ post: () => pendente.promise })
  fireEvent.click(screen.getByRole('button', { name: 'Colocar no carrinho: Arroz' }))
  await avancar(45_000)
  expect(gets()).toHaveLength(1)
  await act(async () => pendente.resolve(Response.json(compra().itens[0])))
  expect(gets()).toHaveLength(1)
  await avancar()
  expect(gets()).toHaveLength(2)
})

test.each([0, 403, 404, 503])('falha %s preserva conteúdo e recupera no próximo ciclo', async status => {
  let falhar = true
  const nova = compra(); nova.nomeLista = 'Atualizada'
  const { gets } = await preparar({ get: async () => { if (!falhar) return Response.json(nova); if (!status) throw new TypeError('offline'); return Response.json({}, { status }) } })
  await avancar()
  expect(screen.getByRole('heading', { name: 'Semana' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  falhar = false
  await avancar()
  expect(screen.getByRole('heading', { name: 'Atualizada' })).toBeInTheDocument()
  expect(gets()).toHaveLength(3)
})

test('401 encerra sessão e para polling mesmo antes da desmontagem', async () => {
  const { session, gets } = await preparar({ get: async () => new Response(null, { status: 401 }) })
  await avancar(60_000)
  expect(session.logout).toHaveBeenCalledOnce()
  expect(gets()).toHaveLength(2)
})

test('desmontagem cancela request e remove timers/listeners', async () => {
  const pendente = deferred<Response>()
  const { unmount, gets } = await preparar({ get: () => pendente.promise })
  await avancar()
  const signal = gets()[1][1]!.signal!
  unmount()
  expect(signal.aborted).toBe(true)
  expect(vi.getTimerCount()).toBe(0)
  fireEvent(window, new Event('focus')); fireEvent(document, new Event('visibilitychange'))
  fireEvent(window, new Event('online')); fireEvent(window, new Event('offline'))
  await avancar(60_000)
  await act(async () => pendente.resolve(Response.json(compra())))
  expect(gets()).toHaveLength(2)
})

test('troca de lista descarta GET atrasado e mantém uma rotina no novo contexto', async () => {
  const pendente = deferred<Response>()
  let consultas = 0
  const nova = { ...compra(), id: 'c-b', listaId: 'lista-b', nomeLista: 'Outra lista' }
  const { gets } = await preparar({ get: () => ++consultas === 1 ? pendente.promise : Promise.resolve(Response.json(nova)) })
  await avancar()
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Outra compra' })) })
  expect(gets()[1][1]!.signal!.aborted).toBe(true)
  await act(async () => pendente.resolve(Response.json(compra())))
  expect(screen.getByRole('heading', { name: 'Outra lista' })).toBeInTheDocument()
  await avancar()
  expect(gets()).toHaveLength(4)
})

test('modal, campos e foco sobrevivem a atualização remota', async () => {
  const nova = compra(); nova.itens.push({ ...nova.itens[0], id: 'i-b', descricao: 'Novo remoto' })
  await preparar({ get: async () => Response.json(nova) })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }))
  const modal = screen.getByRole('dialog', { name: 'Adicionar item à compra' })
  const descricao = within(modal).getByLabelText('Descrição')
  fireEvent.change(descricao, { target: { value: 'Texto não enviado' } }); descricao.focus()
  await avancar()
  expect(screen.getByRole('dialog', { name: 'Adicionar item à compra' })).toBe(modal)
  expect(descricao).toHaveValue('Texto não enviado')
  expect(descricao).toHaveFocus()
  expect(screen.getByText('Novo remoto')).toBeInTheDocument()
})

test('ocultar aborta leitura; focus antes de visibilitychange compartilha GET ao retornar', async () => {
  const pendente = deferred<Response>()
  let numero = 0
  const nova = compra(); nova.nomeLista = 'Estado recente'
  const { gets } = await preparar({ get: () => ++numero === 1 ? pendente.promise : Promise.resolve(Response.json(nova)) })
  await avancar()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  fireEvent(document, new Event('visibilitychange'))
  expect(gets()[1][1]!.signal!.aborted).toBe(true)
  await avancar(5_000)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  await act(async () => { fireEvent(window, new Event('focus')) })
  await act(async () => { fireEvent(document, new Event('visibilitychange')) })
  expect(gets()).toHaveLength(3)
  await act(async () => pendente.resolve(Response.json(compra())))
  expect(screen.getByRole('heading', { name: 'Estado recente' })).toBeInTheDocument()
})

test('carregamento inicial cancelado ao sair não cria polling órfão', async () => {
  const resposta = deferred<Response>()
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(() => resposta.promise)
  const view = renderApp(<AuthenticatedUserContext value={{ usuario: null, loading: true, error: false, recarregarUsuario: vi.fn(async () => {}) }}>
    <Routes><Route path="/listas/:listaId/compra" element={<CompraAndamentoPage />} /></Routes>
  </AuthenticatedUserContext>, { route: '/listas/lista-a/compra' })
  expect(screen.getByText('Carregando compra...')).toBeInTheDocument()
  view.unmount()
  expect(http.mock.calls[0][1]!.signal!.aborted).toBe(true)
  await act(async () => resposta.resolve(Response.json(compra())))
  await avancar(60_000)
  expect(http).toHaveBeenCalledOnce()
})

test.each(['NO_CARRINHO', 'REMOCAO_SOLICITADA', 'REMOVIDO', 'restauracao'] as const)('descobre estado, capabilities e auditoria remotos: %s', async estado => {
  const nova = compra()
  const autor = { participanteCompraId: 'p-b', membroFamiliaId: 'm-b', usuarioId: 'u-b', nome: 'Bruno' }
  const item = nova.itens[0]
  item.status = estado === 'restauracao' ? 'NO_CARRINHO' : estado
  item.colocadoNoCarrinhoPor = autor
  item.acoes.podeColocarNoCarrinho = false
  item.acoes.podeDecidirRemocao = estado === 'REMOCAO_SOLICITADA'
  item.acoes.podeRestaurarNoCarrinho = estado === 'REMOVIDO'
  if (estado === 'restauracao') item.restauracao = { restauradoPor: autor, restauradoEm: '2026-09-17T12:01:00Z' }
  else if (estado !== 'NO_CARRINHO') item.remocao = { solicitadaPor: autor, solicitadaEm: '2026-09-17T12:01:00Z', decisao: estado === 'REMOVIDO' ? 'APROVADA' : null, decididaPor: estado === 'REMOVIDO' ? autor : null, decididaEm: null }
  await preparar({ get: async () => Response.json(nova) })
  await avancar()
  expect(screen.getByText('Colocado no carrinho por Bruno')).toBeInTheDocument()
  if (estado === 'REMOCAO_SOLICITADA') expect(screen.getByRole('button', { name: 'Aprovar remoção: Arroz' })).toBeEnabled()
  if (estado === 'REMOVIDO') expect(screen.getByRole('button', { name: 'Restaurar ao carrinho: Arroz' })).toBeEnabled()
  if (estado === 'restauracao') expect(screen.getByText(/Restaurado por Bruno/)).toBeInTheDocument()
})
