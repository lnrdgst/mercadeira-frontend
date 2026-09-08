import { apiRequest } from '../../../shared/api/apiClient'
import type { CompraAtivaResponse } from '../types/shopping'

async function requisitarCompra(token: string, familiaId: string, listaId: string, method: 'GET' | 'POST') {
  const response = await apiRequest<CompraAtivaResponse>(
    `/familias/${familiaId}/listas/${listaId}/compra`,
    { token, method },
  )
  if (!response.data) throw new Error('Não foi possível recuperar os dados da compra.')
  return response.data
}

export function iniciarCompra(token: string, familiaId: string, listaId: string) {
  return requisitarCompra(token, familiaId, listaId, 'POST')
}

export function buscarCompra(token: string, familiaId: string, listaId: string) {
  return requisitarCompra(token, familiaId, listaId, 'GET')
}
