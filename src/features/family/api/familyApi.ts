import { apiRequest } from '../../../shared/api/apiClient'
import type {
  CriarFamiliaRequest,
  FamiliaResponse,
  MinhaSolicitacaoPendenteResponse,
  SolicitacaoFamiliaResponse,
  SolicitacaoCriadaResponse,
  SolicitarEntradaRequest,
} from '../types/family'

export function buscarFamilias(token: string) {
  return apiRequest<FamiliaResponse[]>('/familias', { token })
}

export function buscarMinhasSolicitacoesPendentes(token: string) {
  return apiRequest<MinhaSolicitacaoPendenteResponse[]>(
    '/familias/solicitacoes/minhas-pendentes',
    { token },
  )
}

export function buscarSolicitacoesFamilia(token: string, familiaId: string) {
  return apiRequest<SolicitacaoFamiliaResponse[]>(
    `/familias/${familiaId}/solicitacoes`,
    { token },
  )
}

export function aprovarSolicitacaoFamilia(
  token: string,
  familiaId: string,
  solicitacaoId: string,
) {
  return apiRequest<void>(
    `/familias/${familiaId}/solicitacoes/${solicitacaoId}/aprovar`,
    { method: 'POST', token },
  )
}

export function rejeitarSolicitacaoFamilia(
  token: string,
  familiaId: string,
  solicitacaoId: string,
) {
  return apiRequest<void>(
    `/familias/${familiaId}/solicitacoes/${solicitacaoId}/rejeitar`,
    { method: 'POST', token },
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
