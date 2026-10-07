import { screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ItemCompraCard } from '../src/features/shopping/components/ItemCompraCard'
import type { ItemCompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

const itemBase: ItemCompraResponse = {
  id: 'item-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 1,
  status: 'NO_CARRINHO', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null,
  acoes: { podeColocarNoCarrinho: false, podeRestaurarNoCarrinho: false, podeSolicitarRemocao: true, podeRemoverDiretamente: true, podeDecidirRemocao: false },
}

test('a remoção direta reutiliza o fluxo de solicitação autoaprovável', async () => {
  const onRemover = vi.fn(async () => {})
  const { user } = renderApp(<ItemCompraCard item={itemBase} participante onColocar={vi.fn(async () => {})} onRestaurar={vi.fn(async () => {})} onRemover={onRemover} onReconciliar={vi.fn(async () => {})} />)

  await user.click(screen.getByRole('button', { name: 'Remover do carrinho: Arroz' }))

  expect(onRemover).toHaveBeenCalledOnce()
  expect(onRemover).toHaveBeenCalledWith('item-a', 'solicitar-remocao')
})

test('sem capability de decisão ou solicitação não há ação de remoção', () => {
  renderApp(<ItemCompraCard item={{ ...itemBase, acoes: { ...itemBase.acoes, podeSolicitarRemocao: false, podeRemoverDiretamente: false, podeDecidirRemocao: false } }} participante onColocar={vi.fn(async () => {})} onRestaurar={vi.fn(async () => {})} onRemover={vi.fn(async () => {})} onReconciliar={vi.fn(async () => {})} />)

  expect(screen.queryByRole('button', { name: /remoção|remover/i })).not.toBeInTheDocument()
})

test('participante presente e autorizado recebe controles para registrar os dados da compra', () => {
  renderApp(<ItemCompraCard item={itemBase} participante onColocar={vi.fn(async () => {})} onRestaurar={vi.fn(async () => {})} onRemover={vi.fn(async () => {})} onReconciliar={vi.fn(async () => {})} podeInformarDadosCompra onAtualizarDadosCompra={vi.fn(async () => {})} />)

  expect(screen.getByRole('button', { name: 'Informar' })).toBeInTheDocument()
})

test('participante remoto visualiza dados registrados, mas não recebe controles de edição', () => {
  renderApp(<ItemCompraCard item={{ ...itemBase, precoUnitario: 10, quantidadeComprada: 2, valorTotal: 20 }} participante onColocar={vi.fn(async () => {})} onRestaurar={vi.fn(async () => {})} onRemover={vi.fn(async () => {})} onReconciliar={vi.fn(async () => {})} podeInformarDadosCompra={false} onAtualizarDadosCompra={vi.fn(async () => {})} />)

  expect(screen.getByLabelText('Dados da compra: Arroz')).toHaveTextContent(/Preço unitário:\s*R\$\s*10,00/)
  expect(screen.queryByRole('button', { name: /informar|alterar/i })).not.toBeInTheDocument()
})
