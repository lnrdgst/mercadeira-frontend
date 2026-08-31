import type { UUID } from '../../auth/types/auth'

export type FamiliaStatus = 'ATIVA' | 'INATIVA'
export type PapelFamiliar = 'ADMINISTRADOR' | 'MEMBRO'

export interface FamiliaResponse {
  id: UUID
  nome: string
  codigoIngresso: string
  status: FamiliaStatus
  papel: PapelFamiliar
}
