import type { UUID } from '../../auth/types/auth'

export type FamiliaStatus = 'ATIVA' | 'INATIVA'
export type PapelFamilia = 'ADMINISTRADOR' | 'MEMBRO'
export type PapelFamiliar = PapelFamilia

export interface FamiliaResponse {
  id: UUID
  nome: string
  codigoIngresso: string
  status: FamiliaStatus
  papel: PapelFamilia
  contextoUsuario?: ContextoUsuarioFamiliaResponse
}

export interface ContextoUsuarioFamiliaResponse {
  podeGerenciarIntegrantes: boolean
}

export interface MembroFamiliaResponse {
  membroFamiliaId: UUID
  usuarioId: UUID
  nome: string
  email: string
  papel: PapelFamilia
  usuarioAtual: boolean
}

export type StatusSolicitacaoFamilia =
  | 'PENDENTE'
  | 'APROVADA'
  | 'REJEITADA'
  | 'CANCELADA'

export interface FamiliaSolicitadaResponse {
  id: UUID
  nome: string
}

export interface MinhaSolicitacaoPendenteResponse {
  id: UUID
  status: 'PENDENTE'
  solicitadaEm: string
  familia: FamiliaSolicitadaResponse
}

export interface SolicitanteFamiliaResponse {
  id: UUID
  nome: string
  email: string
}

export interface SolicitacaoFamiliaResponse {
  id: UUID
  status: StatusSolicitacaoFamilia
  solicitadaEm: string
  solicitante: SolicitanteFamiliaResponse
}

export interface CriarFamiliaRequest {
  nome: string
}

export interface SolicitarEntradaRequest {
  codigoIngresso: string
}

export interface SolicitacaoCriadaResponse {
  id: UUID
  status: 'PENDENTE'
  solicitadaEm: string
  solicitante: {
    id: UUID
    nome: string
    email: string
  }
}
