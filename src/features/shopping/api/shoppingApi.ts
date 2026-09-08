import { apiRequest } from '../../../shared/api/apiClient'
import type { AdicionarItemCompraRequest, CompraAtivaResponse, ItemCompraResponse } from '../types/shopping'

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

export async function colocarItemNoCarrinho(token: string, familiaId: string, listaId: string, itemCompraId: string) {
  const response = await apiRequest<ItemCompraResponse>(
    `/familias/${familiaId}/listas/${listaId}/compra/itens/${itemCompraId}/colocar-no-carrinho`,
    { token, method: 'POST' },
  )
  if (!response.data) throw new Error('Não foi possível recuperar o item atualizado.')
  return response.data
}

export async function adicionarItemCompra(token: string, familiaId: string, listaId: string, data: AdicionarItemCompraRequest) {
  const { descricao, quantidade, unidadeMedida, marca, observacoes } = data
  const response = await apiRequest<ItemCompraResponse>(
    `/familias/${familiaId}/listas/${listaId}/compra/itens`,
    { token, method: 'POST', body: { descricao, quantidade, unidadeMedida, marca, observacoes } },
  )
  if (!response.data) throw new Error('Não foi possível recuperar o item adicionado. Confira a compra antes de tentar novamente.')
  return response.data
}
