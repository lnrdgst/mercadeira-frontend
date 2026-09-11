import type { CategoriaCompra, UnidadeMedida } from '../../shopping-lists/types/shoppingList'

export interface ParticipanteCompraResponse {
  id: string
  membroFamiliaId: string
  usuarioId: string
  nome: string
  papel: 'ADMINISTRADOR' | 'MEMBRO'
  geradoEm: string
}

export interface ContextoUsuarioCompraResponse {
  participanteCompra: boolean
  podeFinalizarCompra: boolean
}

export interface ReferenciaParticipanteCompra {
  participanteCompraId: string
  membroFamiliaId: string
  usuarioId: string
  nome: string
}

export type AutorItemCompraResponse = ReferenciaParticipanteCompra

export interface AcoesItemCompraResponse {
  podeSolicitarRemocao: boolean
  podeDecidirRemocao: boolean
}

export interface RemocaoItemCompraResponse {
  solicitadaPor: ReferenciaParticipanteCompra
  solicitadaEm: string
  decisao: 'APROVADA' | 'REJEITADA' | null
  decididaPor: ReferenciaParticipanteCompra | null
  decididaEm: string | null
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
  participantes: ParticipanteCompraResponse[]
  itens: ItemCompraResponse[]
  contextoUsuario: ContextoUsuarioCompraResponse
}
