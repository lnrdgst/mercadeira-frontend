import { act, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { CompraAndamentoPage } from '../src/features/shopping/pages/CompraAndamentoPage'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import type { CompraResponse, PresencaOperacional } from '../src/features/shopping/types/shopping'
import { deferred, renderApp } from './helpers'

function compra(estado: PresencaOperacional = 'NAO_INFORMADA'): CompraResponse {
  const propria = { id: 'p-a', membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana', papel: 'MEMBRO' as const, geradoEm: '2026-09-01T12:00:00Z', presencaOperacional: { estado, alteradaEm: estado === 'NAO_INFORMADA' ? null : '2026-09-01T12:30:00Z' } }
  const responsavel = { id: 'p-b', membroFamiliaId: 'm-b', usuarioId: 'u-b', nome: 'Bia', papel: 'MEMBRO' as const, geradoEm: '2026-09-01T12:00:00Z', presencaOperacional: { estado: 'PRESENTE' as const, alteradaEm: '2026-09-01T12:10:00Z' } }
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status: 'EM_ANDAMENTO', iniciadaEm: '2026-09-01T12:00:00Z', finalizadaEm: null, finalizadaPor: null,
    responsabilidadeOperacional: { responsavel: { participanteCompraId: 'p-b', membroFamiliaId: 'm-b', usuarioId: 'u-b', nome: 'Bia' }, ciclo: 1, cicloAtivo: true, revisao: 3, responsavelAnteriorId: null, alteradaPorParticipanteCompraId: 'p-b', alteradaEm: '2026-09-01T12:10:00Z', motivo: 'INICIO_COMPRA' },
    minhaSolicitacaoPresenca: null, solicitacoesPresencaPendentes: [],
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: estado === 'PRESENTE', podeFinalizarCompra: true, podeReutilizarLista: false, podeSolicitarPresenca: estado !== 'PRESENTE', podeCancelarSolicitacaoPresenca: false, podeDeclararSaida: estado === 'PRESENTE', podeSolicitarResponsabilidade: estado === 'PRESENTE', podeCancelarSolicitacaoResponsabilidade: false },
    participantes: [propria, responsavel],
    itens: [{ id: 'item-a', descricao: 'Arroz', status: 'PENDENTE', ordemExibicao: 0, quantidade: null, unidadeMedida: null, marca: null, observacoes: null, adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: { podeColocarNoCarrinho: false, podeSolicitarRemocao: false, podeDecidirRemocao: false, podeRestaurarNoCarrinho: false } }],
  }
}

function preparar({ inicial = compra(), comando = async () => Response.json(compra()), get = async () => Response.json(inicial) }: { inicial?: CompraResponse; comando?: () => Promise<Response>; get?: () => Promise<Response> } = {}) {
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, options) => options?.method === 'GET' ? get() : comando())
  const view = renderApp(<AuthenticatedUserContext value={{ usuario: { id: 'u-a', nome: 'Ana', email: 'ana@example.test' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}><Routes><Route path="/listas/:listaId/compra" element={<CompraAndamentoPage />} /></Routes></AuthenticatedUserContext>, { route: '/listas/lista-a/compra' })
  return { ...view, http, comandos: () => http.mock.calls.filter(([, options]) => options?.method !== 'GET') }
}

test.each([['NAO_INFORMADA', 'Presença não informada'], ['NAO_PRESENTE', 'Não está no mercado']] as const)('preserva a semântica de %s e oferece solicitação apenas pela capability', async (estado, label) => {
  preparar({ inicial: compra(estado) })
  expect(await screen.findByText(label)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Solicitar presença no mercado' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Adicionar item' })).toBeEnabled()
})

test('solicitação confirmada usa o novo comando sem body e não repete escrita em clique duplo', async () => {
  const pendente = deferred<Response>()
  const { user, comandos } = preparar({ comando: () => pendente.promise })
  await user.click(await screen.findByRole('button', { name: 'Solicitar presença no mercado' }))
  expect(screen.getByRole('dialog', { name: 'Confirmar solicitação de presença' })).toBeInTheDocument()
  await user.dblClick(screen.getByRole('button', { name: 'Confirmar solicitação' }))
  expect(comandos()).toHaveLength(1)
  expect(String(comandos()[0][0])).toMatch(/\/minha-presenca\/solicitacoes$/)
  expect(comandos()[0][1]!.body).toBeUndefined()
  await act(async () => pendente.resolve(Response.json(compra('PRESENTE'))))
})

test('zero presentes explica a responsabilidade, mas deixa a decisão atômica para o servidor', async () => {
  const zero = compra(); zero.responsabilidadeOperacional = { ...zero.responsabilidadeOperacional!, responsavel: null, cicloAtivo: false }
  const { user } = preparar({ inicial: zero })
  await user.click(await screen.findByRole('button', { name: 'Solicitar presença no mercado' }))
  expect(screen.getByText(/se tornará responsável operacional/i)).toBeInTheDocument()
})

test('pendência não altera estado físico e permite somente o cancelamento entregue pela capability', async () => {
  const pendente = compra()
  pendente.minhaSolicitacaoPresenca = { id: 's-a', solicitanteParticipanteCompraId: 'p-a', ciclo: 1, solicitadaEm: '2026-09-01T12:40:00Z', estado: 'PENDENTE', encerradaPorParticipanteCompraId: null, encerradaEm: null, motivoCancelamento: null, acoes: { podeDecidirPresenca: false } }
  pendente.contextoUsuario.podeCancelarSolicitacaoPresenca = true
  const { user, comandos } = preparar({ inicial: pendente, comando: async () => Response.json(compra()) })
  expect(await screen.findByText('Aguardando confirmação do responsável operacional.')).toBeInTheDocument()
  expect(screen.getByText('Presença não informada')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar solicitação' }))
  expect(String(comandos()[0][0])).toMatch(/\/minha-presenca\/solicitacoes\/s-a\/cancelar$/)
})

test('somente a capability do pedido expõe confirmar e recusar ao responsável', async () => {
  const responsavel = compra('PRESENTE')
  responsavel.responsabilidadeOperacional = { ...responsavel.responsabilidadeOperacional!, responsavel: { participanteCompraId: 'p-a', membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana' } }
  responsavel.solicitacoesPresencaPendentes = [{ id: 's-b', solicitanteParticipanteCompraId: 'p-b', ciclo: 1, solicitadaEm: '2026-09-01T12:40:00Z', estado: 'PENDENTE', encerradaPorParticipanteCompraId: null, encerradaEm: null, motivoCancelamento: null, acoes: { podeDecidirPresenca: true } }]
  const { user, comandos } = preparar({ inicial: responsavel, comando: async () => Response.json(responsavel) })
  await user.click(await screen.findByRole('button', { name: 'Confirmar presença' }))
  expect(String(comandos()[0][0])).toMatch(/\/solicitacoes-presenca\/s-b\/aprovar$/)
  await user.click(screen.getByRole('button', { name: 'Recusar' }))
  expect(String(comandos()[1][0])).toMatch(/\/solicitacoes-presenca\/s-b\/rejeitar$/)
})

test('a transferência de responsabilidade é decidida apenas pela capability do pedido', async () => {
  const responsavel = compra('PRESENTE')
  responsavel.responsabilidadeOperacional = { ...responsavel.responsabilidadeOperacional!, responsavel: { participanteCompraId: 'p-a', membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana' } }
  responsavel.solicitacoesResponsabilidadePendentes = [{ id: 'r-b', solicitanteParticipanteCompraId: 'p-b', responsavelAtualParticipanteCompraId: 'p-a', ciclo: 1, revisao: 3, solicitadaEm: '2026-09-01T12:40:00Z', estado: 'PENDENTE', encerradaPorParticipanteCompraId: null, encerradaEm: null, acoes: { podeDecidirResponsabilidade: true } }]
  const { user, comandos } = preparar({ inicial: responsavel, comando: async () => Response.json(responsavel) })
  await user.click(await screen.findByRole('button', { name: 'Aprovar responsabilidade' }))
  expect(String(comandos()[0][0])).toMatch(/\/solicitacoes-responsabilidade\/r-b\/aprovar$/)
  await user.click(screen.getByRole('button', { name: 'Rejeitar' }))
  expect(String(comandos()[1][0])).toMatch(/\/solicitacoes-responsabilidade\/r-b\/rejeitar$/)
})

test('rejeição de presença no ciclo mantém a decisão visível e não oferece nova solicitação sem capability', async () => {
  const rejeitada = compra()
  rejeitada.minhaSolicitacaoPresenca = { id: 's-a', solicitanteParticipanteCompraId: 'p-a', ciclo: 1, solicitadaEm: '2026-09-01T12:40:00Z', estado: 'REJEITADA', encerradaPorParticipanteCompraId: 'p-b', encerradaEm: '2026-09-01T12:41:00Z', motivoCancelamento: null, acoes: { podeDecidirPresenca: false } }
  rejeitada.contextoUsuario.podeSolicitarPresenca = false
  preparar({ inicial: rejeitada })
  expect(await screen.findByText(/última solicitação foi rejeitada/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Solicitar presença no mercado' })).not.toBeInTheDocument()
})

test('saída continua no PUT NAO_PRESENTE e responsabilidade passa por solicitação confirmada', async () => {
  const presente = compra('PRESENTE')
  const { user, comandos } = preparar({ inicial: presente, comando: async () => Response.json(presente) })
  await user.click(await screen.findByRole('button', { name: 'Não estou no mercado' }))
  expect(comandos()[0][1]!.method).toBe('PUT')
  expect(JSON.parse(comandos()[0][1]!.body as string)).toEqual({ estado: 'NAO_PRESENTE' })
  await user.click(screen.getByRole('button', { name: 'Solicitar responsabilidade operacional' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar solicitação' }))
  expect(String(comandos()[1][0])).toMatch(/\/responsabilidade-operacional\/solicitacoes$/)
  expect(comandos()[1][1]!.body).toBeUndefined()
})

test('erro de comando reconcilia por GET e não faz nova escrita', async () => {
  const atualizada = compra('NAO_PRESENTE'); atualizada.contextoUsuario.podeSolicitarPresenca = false
  let consultas = 0
  const { user, comandos, http } = preparar({ comando: async () => Response.json({}, { status: 409 }), get: async () => Response.json(++consultas === 1 ? compra() : atualizada) })
  await user.click(await screen.findByRole('button', { name: 'Solicitar presença no mercado' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar solicitação' }))
  expect(await screen.findByText('Não está no mercado')).toBeInTheDocument()
  expect(comandos()).toHaveLength(1)
  expect(http.mock.calls.filter(([, options]) => options?.method === 'GET')).toHaveLength(2)
})
