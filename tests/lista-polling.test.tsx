import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { deferred, renderApp } from './helpers'

type EstadoRemoto = {
  nome: string
  status?: 'EM_PREPARACAO' | 'EM_COMPRA'
  podeAlterarItens?: boolean
  participantes?: { nome: string }[]
  itens?: { id: string; descricao: string; ordemExibicao: number }[]
}

function respostas(estado: EstadoRemoto) {
  return {
    lista: {
      id: 'lista-a', nome: estado.nome, status: estado.status || 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null,
      criadaEm: '2026-09-20T12:00:00Z', atualizadaEm: '2026-09-20T12:00:00Z',
      criador: { nome: 'Ana', membroFamiliaId: 'membro-a', usuarioId: 'usuario-a' },
      contextoUsuario: { membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: true, podeGerenciarParticipantes: false, podeAlterarItens: estado.podeAlterarItens ?? true, podeEditarDadosBasicos: true },
    },
    participantes: (estado.participantes || [{ nome: 'Ana' }]).map((participante, indice) => ({ membroFamiliaId: `membro-${indice}`, usuarioId: `usuario-${indice}`, nome: participante.nome, papelFamilia: 'MEMBRO', entrouEm: '2026-09-20T12:00:00Z' })),
    itens: estado.itens || [{ id: 'item-a', descricao: 'Arroz', ordemExibicao: 0 }].map((item) => ({ ...item, quantidade: null, unidadeMedida: null, marca: null, observacoes: null, criadoEm: '2026-09-20T12:00:00Z', atualizadoEm: '2026-09-20T12:00:00Z' })),
  }
}

function respostaPara(path: string, estado: EstadoRemoto) {
  const resposta = respostas(estado)
  if (path.endsWith('/participantes')) return Response.json(resposta.participantes)
  if (path.endsWith('/itens')) return Response.json(resposta.itens)
  return Response.json(resposta.lista)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-20T12:00:00Z'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function preparar(remoto: () => EstadoRemoto | Promise<EstadoRemoto> = () => ({ nome: 'Lista inicial' })) {
  let iniciais = 0
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = String(input)
    if (options?.method && options.method !== 'GET') return new Response(null, { status: 204 })
    const estado = iniciais++ < 3 ? { nome: 'Lista inicial' } : await remoto()
    return respostaPara(path, estado)
  })
  const view = renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' })
  await act(async () => {})
  expect(screen.getByRole('heading', { name: 'Lista inicial' })).toBeInTheDocument()
  return { ...view, http, gets: () => http.mock.calls.filter(([, options]) => !options?.method || options.method === 'GET') }
}

async function avancar(ms = 5_000) { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

async function conexao(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  await act(async () => { fireEvent(window, new Event(online ? 'online' : 'offline')) })
}

test('a cada 5 segundos reconcilia lista, participantes, itens, ordem e capabilities sem loading global', async () => {
  const { gets } = await preparar(() => ({
    nome: 'Lista remota', podeAlterarItens: false, participantes: [{ nome: 'Ana' }, { nome: 'Bruno' }],
    itens: [{ id: 'item-b', descricao: 'Feijao remoto', ordemExibicao: 0 }, { id: 'item-a', descricao: 'Arroz', ordemExibicao: 1 }],
  }))
  expect(gets()).toHaveLength(3)
  await avancar(4_999)
  expect(gets()).toHaveLength(3)
  await avancar(1)
  expect(gets()).toHaveLength(6)
  expect(screen.getByRole('heading', { name: 'Lista remota' })).toBeInTheDocument()
  expect(screen.getByText('Bruno')).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 3 }).map((item) => item.textContent)).toEqual(['Feijao remoto', 'Arroz'])
  expect(screen.queryByRole('button', { name: 'Adicionar item na lista' })).not.toBeInTheDocument()
  expect(screen.queryByText('Carregando lista...')).not.toBeInTheDocument()
})

test('aba oculta ou offline pausa; visibilidade, foco e online reconciliam imediatamente sem duplicar GET', async () => {
  const { gets } = await preparar(() => ({ nome: 'Reconectada' }))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  fireEvent(document, new Event('visibilitychange'))
  await avancar(20_000)
  expect(gets()).toHaveLength(3)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  await act(async () => { fireEvent(document, new Event('visibilitychange')); fireEvent(window, new Event('focus')) })
  expect(gets()).toHaveLength(6)
  await conexao(false)
  await avancar(20_000)
  expect(gets()).toHaveLength(6)
  await conexao(true)
  expect(gets()).toHaveLength(9)
  expect(screen.getByRole('heading', { name: 'Reconectada' })).toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(1)
})

test('falha de GET preserva o estado e o próximo ciclo recupera sem retry agressivo', async () => {
  let falhar = true
  const { gets } = await preparar(async () => {
    if (falhar) throw new TypeError('rede instavel')
    return { nome: 'Recuperada' }
  })
  await avancar()
  expect(screen.getByRole('heading', { name: 'Lista inicial' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  falhar = false
  await avancar()
  expect(gets()).toHaveLength(9)
  expect(screen.getByRole('heading', { name: 'Recuperada' })).toBeInTheDocument()
})

test('resposta abortada e antiga não reaplica dados após reconciliação mais recente', async () => {
  const pendentes = [deferred<Response>(), deferred<Response>(), deferred<Response>()]
  let pendente = true
  const { gets, http } = await preparar((() => ({ nome: 'Nova leitura' })))
  http.mockImplementation((input) => {
    const path = String(input)
    if (pendente) return pendentes.shift()!.promise
    return Promise.resolve(respostaPara(path, { nome: 'Nova leitura' }))
  })
  await avancar()
  expect(gets()).toHaveLength(6)
  const sinal = gets()[3][1]!.signal!
  await conexao(false)
  expect(sinal.aborted).toBe(true)
  pendente = false
  await conexao(true)
  expect(gets()).toHaveLength(9)
  await act(async () => { pendentes.forEach((resposta) => resposta.resolve(respostaPara('/api/familias/familia-a/listas/lista-a', { nome: 'Leitura antiga' }))) })
  expect(screen.getByRole('heading', { name: 'Nova leitura' })).toBeInTheDocument()
})

test('transição remota para compra encerra polling e desmontagem limpa timer e listeners', async () => {
  let emCompra = false
  const { unmount, gets } = await preparar(() => emCompra ? { nome: 'Lista inicial', status: 'EM_COMPRA' } : { nome: 'Lista inicial' })
  emCompra = true
  await avancar()
  expect(screen.getByRole('link', { name: 'Ver compra em andamento' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Adicionar item na lista' })).not.toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
  await avancar(30_000)
  expect(gets()).toHaveLength(6)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  fireEvent(window, new Event('focus')); fireEvent(window, new Event('online')); fireEvent(document, new Event('visibilitychange'))
  await avancar(30_000)
  expect(gets()).toHaveLength(6)
})
