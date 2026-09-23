import type { CategoriaCompra, UnidadeMedida } from '../../shopping-lists/types/shoppingList'

export type PresencaOperacional = 'NAO_INFORMADA' | 'PRESENTE' | 'NAO_PRESENTE'
export type DeclaracaoPresenca = 'NAO_PRESENTE'
export const presencaLabels: Record<PresencaOperacional, string> = {
  NAO_INFORMADA: 'Presença não informada',
  PRESENTE: 'No mercado',
  NAO_PRESENTE: 'Não está no mercado',
}

export interface ParticipanteCompraResponse {
  id: string
  membroFamiliaId: string
  usuarioId: string
  nome: string
  papel: 'ADMINISTRADOR' | 'MEMBRO'
  geradoEm: string
  presencaOperacional: { estado: PresencaOperacional; alteradaEm: string | null }
}

export interface ContextoUsuarioCompraResponse {
  participanteCompra: boolean
  podeAlterarPresenca: boolean
  podeFinalizarCompra: boolean
  podeReutilizarLista: boolean
  podeCriarListaComItensQueFicaramDeFora?: boolean
  podeSolicitarPresenca?: boolean
  podeCancelarSolicitacaoPresenca?: boolean
  podeDeclararSaida?: boolean
  podeSolicitarResponsabilidade?: boolean
  podeCancelarSolicitacaoResponsabilidade?: boolean
  precisaEstarPresenteParaFinalizar?: boolean
}

export interface ReferenciaParticipanteCompra {
  participanteCompraId: string
  membroFamiliaId: string
  usuarioId: string
  nome: string
}

export type AutorItemCompraResponse = ReferenciaParticipanteCompra

export type EstadoSolicitacaoPresenca = 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA'
export type MotivoCancelamentoPresenca = 'SOLICITANTE' | 'SEM_PRESENTES' | 'COMPRA_FINALIZADA'
export type MotivoResponsabilidade = 'INICIO_COMPRA' | 'PRIMEIRA_ENTRADA' | 'SUCESSAO' | 'REASSUNCAO' | 'SEM_PRESENTES' | 'BOOTSTRAP_V10' | 'LEGADO_SEM_ELEGIVEL'

export interface ResponsabilidadeOperacionalResponse {
  responsavel: ReferenciaParticipanteCompra | null
  ciclo: number
  cicloAtivo: boolean
  revisao: number
  responsavelAnteriorId: string | null
  alteradaPorParticipanteCompraId: string | null
  alteradaEm: string | null
  motivo: MotivoResponsabilidade | null
}

export interface SolicitacaoPresencaResponse {
  id: string
  solicitanteParticipanteCompraId: string
  ciclo: number
  solicitadaEm: string
  estado: EstadoSolicitacaoPresenca
  encerradaPorParticipanteCompraId: string | null
  encerradaEm: string | null
  motivoCancelamento: MotivoCancelamentoPresenca | null
  acoes: { podeDecidirPresenca: boolean }
}

export type EstadoSolicitacaoResponsabilidade = 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA'
export interface SolicitacaoResponsabilidadeResponse {
  id: string
  solicitanteParticipanteCompraId: string
  responsavelAtualParticipanteCompraId: string
  ciclo: number
  revisao: number
  solicitadaEm: string
  estado: EstadoSolicitacaoResponsabilidade
  encerradaPorParticipanteCompraId: string | null
  encerradaEm: string | null
  acoes: { podeDecidirResponsabilidade: boolean }
}

export interface AcoesItemCompraResponse {
  podeColocarNoCarrinho: boolean
  podeSolicitarRemocao: boolean
  podeDecidirRemocao: boolean
  podeRestaurarNoCarrinho: boolean
}

export interface RemocaoItemCompraResponse {
  solicitadaPor: ReferenciaParticipanteCompra
  solicitadaEm: string
  decisao: 'APROVADA' | 'REJEITADA' | null
  decididaPor: ReferenciaParticipanteCompra | null
  decididaEm: string | null
}

export interface RestauracaoItemCompraResponse {
  restauradoPor: ReferenciaParticipanteCompra
  restauradoEm: string
}

export type AcaoRemocaoItemCompra = 'solicitar-remocao' | 'aprovar-remocao' | 'rejeitar-remocao'

export interface AdicionarItemCompraRequest {
  descricao: string
  quantidade: number | null
  unidadeMedida: UnidadeMedida | null
  marca: string | null
  observacoes: string | null
}

export interface ItemCompraResponse {
  id: string
  itemListaOrigemId?: string | null
  adicionadoDuranteCompra: boolean
  descricao: string
  quantidade: number | null
  unidadeMedida: UnidadeMedida | null
  marca: string | null
  observacoes: string | null
  ordemExibicao: number
  status: 'PENDENTE' | 'NO_CARRINHO' | 'REMOCAO_SOLICITADA' | 'REMOVIDO'
  remocao: RemocaoItemCompraResponse | null
  restauracao: RestauracaoItemCompraResponse | null
  acoes: AcoesItemCompraResponse
  adicionadoPor: AutorItemCompraResponse | null
  adicionadoEm: string | null
  colocadoNoCarrinhoPor: AutorItemCompraResponse | null
  colocadoNoCarrinhoEm: string | null
}

export interface CompraResponse {
  id: string
  listaId: string
  nomeLista: string
  categoria: CategoriaCompra
  estabelecimento: string | null
  status: 'EM_ANDAMENTO' | 'FINALIZADA'
  iniciadaEm: string
  finalizadaPor: ReferenciaParticipanteCompra | null
  finalizadaEm: string | null
  responsabilidadeOperacional?: ResponsabilidadeOperacionalResponse
  minhaSolicitacaoPresenca?: SolicitacaoPresencaResponse | null
  solicitacoesPresencaPendentes?: SolicitacaoPresencaResponse[]
  minhaSolicitacaoResponsabilidade?: SolicitacaoResponsabilidadeResponse | null
  solicitacoesResponsabilidadePendentes?: SolicitacaoResponsabilidadeResponse[]
  participantes: ParticipanteCompraResponse[]
  itens: ItemCompraResponse[]
  contextoUsuario: ContextoUsuarioCompraResponse
}
