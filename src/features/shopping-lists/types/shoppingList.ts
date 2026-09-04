import type { PapelFamilia } from '../../family/types/family'

export type CategoriaCompra =
  | 'SUPERMERCADO'
  | 'ROUPAS'
  | 'BRINQUEDOS'
  | 'ACESSORIOS'
  | 'UTENSILIOS'
  | 'OUTROS'

export type StatusListaCompra =
  | 'EM_PREPARACAO'
  | 'EM_COMPRA'
  | 'FINALIZADA'
  | 'CANCELADA'

export interface ListaCompraResumoResponse {
  id: string
  nome: string
  categoria: CategoriaCompra
  estabelecimento: string | null
  status: StatusListaCompra
  criadaEm: string
  atualizadaEm: string
}

export interface CriadorListaResponse {
  membroFamiliaId: string
  usuarioId: string
  nome: string
}

export interface ContextoUsuarioListaResponse {
  membroFamiliaId: string
  papelFamilia: PapelFamilia
  participanteAtivo: boolean
  podeGerenciarParticipantes: boolean
  podeAlterarItens: boolean
}

export interface ListaCompraDetalheResponse extends ListaCompraResumoResponse {
  criador: CriadorListaResponse
  contextoUsuario: ContextoUsuarioListaResponse
}

export interface CriarListaCompraRequest {
  nome: string
  categoria: CategoriaCompra
  estabelecimento: string | null
}

export interface MembroFamiliaResponse {
  membroFamiliaId: string
  usuarioId: string
  nome: string
  email: string
  papel: PapelFamilia
}

export interface ParticipanteListaResponse {
  membroFamiliaId: string
  usuarioId: string
  nome: string
  papelFamilia: PapelFamilia
  entrouEm: string
}

export type UnidadeMedida =
  | 'UNIDADE'
  | 'KG'
  | 'G'
  | 'LITRO'
  | 'ML'
  | 'PACOTE'
  | 'CAIXA'

export interface ItemListaCompraResponse {
  id: string
  descricao: string
  quantidade: number | null
  unidadeMedida: UnidadeMedida | null
  marca: string | null
  observacoes: string | null
  ordemExibicao: number
  criadoEm: string
  atualizadoEm: string
}

export interface SalvarItemListaRequest {
  descricao: string
  quantidade: number | null
  unidadeMedida: UnidadeMedida | null
  marca: string | null
  observacoes: string | null
}

export const categoriaCompraLabels: Record<CategoriaCompra, string> = {
  SUPERMERCADO: 'Supermercado',
  ROUPAS: 'Roupas',
  BRINQUEDOS: 'Brinquedos',
  ACESSORIOS: 'Acessórios',
  UTENSILIOS: 'Utensílios',
  OUTROS: 'Outros',
}

export const statusListaCompraLabels: Record<StatusListaCompra, string> = {
  EM_PREPARACAO: 'Em preparação',
  EM_COMPRA: 'Em compra',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
}

export const unidadeMedidaLabels: Record<UnidadeMedida, string> = {
  UNIDADE: 'un.',
  KG: 'kg',
  G: 'g',
  LITRO: 'L',
  ML: 'ml',
  PACOTE: 'pacote',
  CAIXA: 'caixa',
}
