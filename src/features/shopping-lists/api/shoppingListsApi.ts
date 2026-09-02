import { apiRequest } from '../../../shared/api/apiClient'
import type {
  CriarListaCompraRequest,
  ListaCompraDetalheResponse,
  ListaCompraResumoResponse,
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
