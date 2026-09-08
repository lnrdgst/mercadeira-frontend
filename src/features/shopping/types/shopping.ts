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
}

export interface AutorItemCompraResponse {
  participanteCompraId: string
  membroFamiliaId: string
  usuarioId: string
  nome: string
}

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
  status: 'PENDENTE' | 'NO_CARRINHO'
  adicionadoPor: AutorItemCompraResponse | null
  adicionadoEm: string | null
  colocadoNoCarrinhoPor: AutorItemCompraResponse | null
  colocadoNoCarrinhoEm: string | null
}

export interface CompraAtivaResponse {
  id: string
  listaId: string
  nomeLista: string
  categoria: CategoriaCompra
  estabelecimento: string | null
  status: 'EM_ANDAMENTO'
  iniciadaEm: string
  participantes: ParticipanteCompraResponse[]
  itens: ItemCompraResponse[]
  contextoUsuario: ContextoUsuarioCompraResponse
}
