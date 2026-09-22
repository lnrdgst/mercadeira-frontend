import { act, screen, within } from '@testing-library/react'
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
  expect(screen.getByRole('button', { name: 'Adicionar novo item à compra' })).toBeEnabled()
  const secao = screen.getByRole('heading', { name: 'Participantes' }).closest('section')!
  expect(secao.querySelector('.border-t')).not.toBeNull()
})

test('ordena visualmente o responsável primeiro, preserva a presença e identifica o usuário atual', async () => {
  preparar({ inicial: compra('PRESENTE') })
  const secao = (await screen.findByRole('heading', { name: 'Participantes' })).closest('section')!
  const participantes = within(secao).getAllByRole('listitem')
  expect(participantes[0]).toHaveTextContent('Bia')
  expect(participantes[0]).toHaveTextContent('Responsável operacional')
  expect(participantes[0]).toHaveClass('border', 'border-blue-400', 'bg-blue-50')
  expect(participantes[1]).toHaveTextContent('Ana (você)')
  expect(participantes[1]).toHaveClass('bg-primary/10')
  expect(within(participantes[1]).getByTitle('Ana')).toHaveTextContent('Ana (você)')
})

test('participante comum não presente mantém linha cinza', async () => {
  preparar({ inicial: compra('NAO_PRESENTE') })
  const secao = (await screen.findByRole('heading', { name: 'Participantes' })).closest('section')!
  expect(within(secao).getAllByRole('listitem')[1]).toHaveClass('bg-foreground/5')
})

test('só exibe divisor operacional quando há conteúdo abaixo dos participantes', async () => {
  const semAcoes = compra('NAO_INFORMADA')
  semAcoes.contextoUsuario.podeSolicitarPresenca = false
  semAcoes.contextoUsuario.podeDeclararSaida = false
  semAcoes.contextoUsuario.podeSolicitarResponsabilidade = false
  preparar({ inicial: semAcoes })
  const secao = (await screen.findByRole('heading', { name: 'Participantes' })).closest('section')!
  expect(secao.querySelector('.border-t')).toBeNull()

})

test('mantém colocar no carrinho condicionado à capability e com identidade azul', async () => {
  const atual = compra()
  atual.itens[0].acoes.podeColocarNoCarrinho = true
  preparar({ inicial: atual })
  expect(await screen.findByRole('button', { name: 'Colocar no carrinho: Arroz' })).toHaveClass('border-blue', 'text-blue-500')
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
  expect(screen.getByRole('dialog')).toHaveTextContent(/tornar/)
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

test('rejeicao sem capability nao oferece nova solicitacao', async () => {
  const rejeitada = compra()
  rejeitada.minhaSolicitacaoPresenca = { id: 's-a', solicitanteParticipanteCompraId: 'p-a', ciclo: 1, solicitadaEm: '2026-09-01T12:40:00Z', estado: 'REJEITADA', encerradaPorParticipanteCompraId: 'p-b', encerradaEm: '2026-09-01T12:41:00Z', motivoCancelamento: null, acoes: { podeDecidirPresenca: false } }
  rejeitada.contextoUsuario.podeSolicitarPresenca = false
  preparar({ inicial: rejeitada })
  expect(await screen.findByRole('button', { name: 'Adicionar novo item à compra' })).toBeEnabled()
  expect(screen.queryByRole('button', { name: 'Solicitar presença no mercado' })).not.toBeInTheDocument()
})

test('primeiro clique para sair apenas pede confirmação e voltar preserva a presença', async () => {
  const presente = compra('PRESENTE')
  const { user, comandos } = preparar({ inicial: presente, comando: async () => Response.json(presente) })
  await user.click(await screen.findByRole('button', { name: 'Não estou no mercado' }))
  expect(comandos()).toHaveLength(0)
  const confirmacao = screen.getByRole('dialog', { name: 'Confirmar saída do mercado' })
  expect(confirmacao).toHaveTextContent('poderá ser necessário solicitar presença novamente')
  expect(confirmacao).toHaveClass('border-t', 'border-foreground/10')
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(comandos()).toHaveLength(0)
  expect(screen.getByRole('button', { name: 'Não estou no mercado' })).toBeEnabled()
})

test('confirma saída uma única vez pelo PUT existente e bloqueia dupla submissão', async () => {
  const presente = compra('PRESENTE')
  const pendente = deferred<Response>()
  const { user, comandos } = preparar({ inicial: presente, comando: () => pendente.promise })
  await user.click(await screen.findByRole('button', { name: 'Não estou no mercado' }))
  const confirmar = screen.getByRole('button', { name: 'Confirmar que não estou no mercado' })
  await user.dblClick(confirmar)
  expect(comandos()).toHaveLength(1)
  expect(comandos()[0][1]!.method).toBe('PUT')
  expect(JSON.parse(comandos()[0][1]!.body as string)).toEqual({ estado: 'NAO_PRESENTE' })
  expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled()
  await act(async () => pendente.resolve(Response.json(presente)))
})

test('responsável operacional também confirma a saída antes de chamar o backend', async () => {
  const presente = compra('PRESENTE')
  presente.responsabilidadeOperacional = { ...presente.responsabilidadeOperacional!, responsavel: { participanteCompraId: 'p-a', membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana' } }
  const { user, comandos } = preparar({ inicial: presente, comando: async () => Response.json(presente) })
  await user.click(await screen.findByRole('button', { name: 'Não estou no mercado' }))
  expect(comandos()).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Confirmar que não estou no mercado' }))
  expect(comandos()[0][1]!.method).toBe('PUT')
})

test('responsabilidade continua passando pela confirmação já existente', async () => {
  const presente = compra('PRESENTE')
  const { user, comandos } = preparar({ inicial: presente, comando: async () => Response.json(presente) })
  await user.click(await screen.findByRole('button', { name: 'Solicitar responsabilidade operacional' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar solicitação' }))
  expect(String(comandos()[0][0])).toMatch(/\/responsabilidade-operacional\/solicitacoes$/)
  expect(comandos()[0][1]!.body).toBeUndefined()
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
