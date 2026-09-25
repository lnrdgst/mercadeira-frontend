import { apiRequest } from '../../../shared/api/apiClient'
import type {
  CriarFamiliaRequest,
  FamiliaResponse,
  MembroFamiliaResponse,
  MinhaSolicitacaoPendenteResponse,
  SolicitacaoFamiliaResponse,
  SolicitacaoCriadaResponse,
  SolicitarEntradaRequest,
} from '../types/family'

export function buscarFamilias(token: string) {
  return apiRequest<FamiliaResponse[]>('/familias', { token })
}

export function buscarMembrosFamilia(token: string, familiaId: string, signal?: AbortSignal) {
  return apiRequest<MembroFamiliaResponse[]>(`/familias/${familiaId}/membros`, { token, signal })
}

export function transferirAdministracaoFamilia(token: string, familiaId: string, membroId: string) {
  return apiRequest<void>(`/familias/${familiaId}/membros/${membroId}/transferir-administracao`, { method: 'POST', token })
}

export function removerIntegranteFamilia(token: string, familiaId: string, membroId: string) {
  return apiRequest<void>(`/familias/${familiaId}/membros/${membroId}`, { method: 'DELETE', token })
}

export function sairDaFamilia(token: string, familiaId: string) {
  return apiRequest<void>(`/familias/${familiaId}/membros/me`, { method: 'DELETE', token })
}
export function excluirFamilia(token: string, familiaId: string) {
  return apiRequest<void>(`/familias/${familiaId}`, { method: 'DELETE', token })
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
