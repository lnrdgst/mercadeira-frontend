import { screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { criarLancamentoItemCompra, atualizarLancamentoItemCompra, removerLancamentoItemCompra } from '../src/features/shopping/api/shoppingApi'
import { DadosCompraItem } from '../src/features/shopping/components/DadosCompraItem'
import type { ItemCompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

const item: ItemCompraResponse = { id: 'item-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 1, status: 'NO_CARRINHO', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, valorTotal: 10, podeGerenciarLancamentos: true, lancamentos: [{ id: 'l-1', precoUnitario: 5, quantidade: 2, valorTotal: 10 }], acoes: { podeColocarNoCarrinho: false, podeRestaurarNoCarrinho: false, podeSolicitarRemocao: true, podeRemoverDiretamente: true, podeDecidirRemocao: false } }
const props = { item, disabled: false, podeGerenciar: true, onCriar: vi.fn(async () => {}), onAtualizar: vi.fn(async () => {}), onRemover: vi.fn(async () => {}) }

test('confirma preço antes de persistir o lançamento e usa a quantidade padrão', async () => {
  const { user } = renderApp(<DadosCompraItem {...props} />)
  await user.click(screen.getByRole('button', { name: 'Registrar outro preço' }))
  await user.click(screen.getByRole('button', { name: 'Número 3' }))
  expect(props.onCriar).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByRole('textbox', { name: 'Quantidade comprada' })).toHaveValue('1')
  await user.click(screen.getByRole('button', { name: 'Confirmar lançamento' }))
  expect(props.onCriar).toHaveBeenCalledWith({ precoUnitario: 3, quantidade: 1 })
})

test('edita e exclui um lançamento em fluxos separados', async () => {
  const { user } = renderApp(<DadosCompraItem {...props} />)
  await user.click(screen.getByRole('button', { name: /Editar lançamento/ }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar lançamento' }))
  expect(props.onAtualizar).toHaveBeenCalledWith('l-1', { precoUnitario: 5, quantidade: 2 })
  await user.click(screen.getByRole('button', { name: /Excluir lançamento/ }))
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveTextContent('Excluir lançamento?')
  await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))
  expect(props.onRemover).toHaveBeenCalledWith('l-1')
})

test('usa endpoints de lançamentos com payload numérico', async () => {
  const fetch = vi.mocked(globalThis.fetch)
  fetch.mockResolvedValueOnce(Response.json(item, { status: 200 })).mockResolvedValueOnce(Response.json(item, { status: 200 })).mockResolvedValueOnce(Response.json(item, { status: 200 }))
  await criarLancamentoItemCompra('token', 'familia', 'lista', 'item', { precoUnitario: 2.5, quantidade: 2 })
  await atualizarLancamentoItemCompra('token', 'familia', 'lista', 'item', 'lancamento', { precoUnitario: 3, quantidade: 1 })
  await removerLancamentoItemCompra('token', 'familia', 'lista', 'item', 'lancamento')
  expect(fetch).toHaveBeenNthCalledWith(1, expect.stringMatching(/itens\/item\/lancamentos$/), expect.objectContaining({ method: 'POST', body: JSON.stringify({ precoUnitario: 2.5, quantidade: 2 }) }))
  expect(fetch).toHaveBeenNthCalledWith(2, expect.stringMatching(/itens\/item\/lancamentos\/lancamento$/), expect.objectContaining({ method: 'PUT' }))
  expect(fetch).toHaveBeenNthCalledWith(3, expect.stringMatching(/itens\/item\/lancamentos\/lancamento$/), expect.objectContaining({ method: 'DELETE' }))
})
