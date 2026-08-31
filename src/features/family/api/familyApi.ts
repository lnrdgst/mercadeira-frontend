import { apiRequest } from '../../../shared/api/apiClient'
import type {
  CriarFamiliaRequest,
  FamiliaResponse,
  MinhaSolicitacaoPendenteResponse,
  SolicitacaoCriadaResponse,
  SolicitarEntradaRequest,
} from '../types/family'

export function buscarFamiliaAtiva(token: string) {
  return apiRequest<FamiliaResponse>('/familias/ativa', { token })
}

export function buscarMinhasSolicitacoesPendentes(token: string) {
  return apiRequest<MinhaSolicitacaoPendenteResponse[]>(
    '/familias/solicitacoes/minhas-pendentes',
    { token },
  )
}

export function criarFamilia(token: string, data: CriarFamiliaRequest) {
  return apiRequest<FamiliaResponse>('/familias', { method: 'POST', body: data, token })
}

export function solicitarEntrada(token: string, data: SolicitarEntradaRequest) {
  return apiRequest<SolicitacaoCriadaResponse>('/familias/solicitacoes', {
    method: 'POST',
    body: data,
    token,
  })
}
