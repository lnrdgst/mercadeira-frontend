import { apiRequest } from '../../../shared/api/apiClient'
import type {
  CriarListaCompraRequest,
  ItemListaCompraResponse,
  ListaCompraDetalheResponse,
  ListaCompraResumoResponse,
  MembroFamiliaResponse,
  ParticipanteListaResponse,
  SalvarItemListaRequest,
} from '../types/shoppingList'

function listasPath(familiaId: string) {
  return `/familias/${familiaId}/listas`
}

export function buscarListas(token: string, familiaId: string) {
  return apiRequest<ListaCompraResumoResponse[]>(listasPath(familiaId), { token })
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

export function buscarLista(token: string, familiaId: string, listaId: string) {
  return apiRequest<ListaCompraDetalheResponse>(`${listasPath(familiaId)}/${listaId}`, {
    token,
  })
}

function listaPath(familiaId: string, listaId: string) {
  return `${listasPath(familiaId)}/${listaId}`
}

export function buscarMembrosFamilia(token: string, familiaId: string) {
  return apiRequest<MembroFamiliaResponse[]>(`/familias/${familiaId}/membros`, { token })
}

export function buscarParticipantesLista(token: string, familiaId: string, listaId: string) {
  return apiRequest<ParticipanteListaResponse[]>(`${listaPath(familiaId, listaId)}/participantes`, { token })
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

export function buscarItensLista(token: string, familiaId: string, listaId: string) {
  return apiRequest<ItemListaCompraResponse[]>(`${listaPath(familiaId, listaId)}/itens`, { token })
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
