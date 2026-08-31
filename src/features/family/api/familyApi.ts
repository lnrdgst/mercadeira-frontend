import { apiRequest } from '../../../shared/api/apiClient'
import type { FamiliaResponse } from '../types/family'

export function buscarFamiliaAtiva(token: string) {
  return apiRequest<FamiliaResponse>('/familias/ativa', { token })
}
