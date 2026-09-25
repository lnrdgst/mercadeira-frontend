import { apiRequest, apiRequestComHeaders } from '../../../shared/api/apiClient'
import type {
  CriarListaCompraRequest,
  ItemListaCompraResponse,
  ListaCompraDetalheResponse,
  ListaCompraResumoResponse,
  HistoricoListaCompraResponse,
  MembroFamiliaResponse,
  ParticipanteListaResponse,
  SalvarItemListaRequest,
  CategoriaCompra,
} from '../types/shoppingList'

function listasPath(familiaId: string) {
  return `/familias/${familiaId}/listas`
}

export interface SugestaoItem { descricao: string; unidadeMedida: import('../types/shoppingList').UnidadeMedida | null }

export function buscarSugestoesItens(token: string, familiaId: string, listaId: string, categoria: CategoriaCompra, termo: string) {
  const params = new URLSearchParams({ listaId, categoria, termo })
  return apiRequest<SugestaoItem[]>(`/familias/${familiaId}/itens/sugestoes?${params}`, { token })
}

export interface FiltrosListas { criadaDe?: string; criadaAte?: string; criadaPorUsuarioId?: string; participanteMembroFamiliaId?: string; page?: string; size?: string }
function comFiltros(path: string, filtros: FiltrosListas = {}) {
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries(filtros)) if (valor) params.set(chave, valor)
  return params.size ? `${path}?${params}` : path
}
export function buscarListas(token: string, familiaId: string, filtros?: FiltrosListas) {
  return apiRequestComHeaders<ListaCompraResumoResponse[]>(comFiltros(listasPath(familiaId), filtros), { token })
}

export function buscarTotalHistoricoListas(token: string, familiaId: string) {
  return apiRequest<{ total: number }>(`${listasPath(familiaId)}/historico/total`, { token })
}

export function buscarHistoricoListas(token: string, familiaId: string, page: number, size = 20, filtros?: FiltrosListas) {
  return apiRequest<HistoricoListaCompraResponse>(comFiltros(`${listasPath(familiaId)}/historico`, { ...filtros, page: String(page), size: String(size) }), { token })
}

export function criarLista(
  token: string,
  familiaId: string,
  data: CriarListaCompraRequest,
) {
  return apiRequest<ListaCompraResumoResponse>(listasPath(familiaId), {
    method: 'POST',
    body: data,
    token,
  })
}

export function buscarLista(token: string, familiaId: string, listaId: string, signal?: AbortSignal) {
  return apiRequest<ListaCompraDetalheResponse>(`${listasPath(familiaId)}/${listaId}`, {
    token, signal,
  })
}

export async function reutilizarLista(token: string, familiaId: string, listaId: string) {
  const response = await apiRequest<ListaCompraResumoResponse>(`${listasPath(familiaId)}/${listaId}/reutilizar`, { token, method: 'POST' })
  if (!response.data) throw new Error('Não foi possível confirmar a criação. Confira Minhas Listas antes de tentar novamente.')
  return response.data
}

export async function reaproveitarItensForaCompra(token: string, familiaId: string, listaId: string, itemIds: string[]) {
  const response = await apiRequest<ListaCompraResumoResponse>(`${listasPath(familiaId)}/${listaId}/reaproveitar-itens-fora`, {
    token, method: 'POST', body: { itemIds },
  })
  if (!response.data) throw new Error('Não foi possível criar a nova lista. Confira Minhas Listas antes de tentar novamente.')
  return response.data
}

function listaPath(familiaId: string, listaId: string) {
  return `${listasPath(familiaId)}/${listaId}`
}

export function atualizarDadosLista(token: string, familiaId: string, listaId: string, data: CriarListaCompraRequest) {
  return apiRequest<ListaCompraDetalheResponse>(listaPath(familiaId, listaId), { method: 'PUT', body: data, token })
}

export function excluirLista(token: string, familiaId: string, listaId: string) {
  return apiRequest<void>(listaPath(familiaId, listaId), { method: 'DELETE', token })
}

export function buscarMembrosFamilia(token: string, familiaId: string) {
  return apiRequest<MembroFamiliaResponse[]>(`/familias/${familiaId}/membros`, { token })
}

export function buscarParticipantesLista(token: string, familiaId: string, listaId: string, signal?: AbortSignal) {
  return apiRequest<ParticipanteListaResponse[]>(`${listaPath(familiaId, listaId)}/participantes`, { token, signal })
}

export function adicionarParticipanteLista(
  token: string,
  familiaId: string,
  listaId: string,
  membroFamiliaId: string,
) {
  return apiRequest<void>(`${listaPath(familiaId, listaId)}/participantes`, {
    method: 'POST',
    body: { membroFamiliaId },
    token,
  })
}

export function removerParticipanteLista(
  token: string,
  familiaId: string,
  listaId: string,
  membroFamiliaId: string,
) {
  return apiRequest<void>(`${listaPath(familiaId, listaId)}/participantes/${membroFamiliaId}`, {
    method: 'DELETE',
    token,
  })
}

export function buscarItensLista(token: string, familiaId: string, listaId: string, signal?: AbortSignal) {
  return apiRequest<ItemListaCompraResponse[]>(`${listaPath(familiaId, listaId)}/itens`, { token, signal })
}

export function criarItemLista(token: string, familiaId: string, listaId: string, data: SalvarItemListaRequest) {
  return apiRequest<ItemListaCompraResponse>(`${listaPath(familiaId, listaId)}/itens`, {
    method: 'POST',
    body: data,
    token,
  })
}

export function atualizarItemLista(token: string, familiaId: string, listaId: string, itemId: string, data: SalvarItemListaRequest) {
  return apiRequest<ItemListaCompraResponse>(`${listaPath(familiaId, listaId)}/itens/${itemId}`, {
    method: 'PUT',
    body: data,
    token,
  })
}

export function removerItemLista(token: string, familiaId: string, listaId: string, itemId: string) {
  return apiRequest<void>(`${listaPath(familiaId, listaId)}/itens/${itemId}`, {
    method: 'DELETE',
    token,
  })
}

export function reordenarItensLista(token: string, familiaId: string, listaId: string, itemIds: string[]) {
  return apiRequest<void>(`${listaPath(familiaId, listaId)}/itens/ordem`, {
    method: 'PUT',
    body: { itens: itemIds },
    token,
  })
}
