import { screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { DadosCompraItem } from '../src/features/shopping/components/DadosCompraItem'
import type { ItemCompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

const item: ItemCompraResponse = { id: 'item-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 1, status: 'NO_CARRINHO', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: { podeColocarNoCarrinho: false, podeRestaurarNoCarrinho: false, podeSolicitarRemocao: false, podeDecidirRemocao: false } }

test('não permite que quem não possui capability gerencie lançamentos', () => {
  renderApp(<DadosCompraItem item={item} disabled={false} podeGerenciar={false} onCriar={vi.fn()} onAtualizar={vi.fn()} onRemover={vi.fn()} />)
  expect(screen.getByText('Preço não informado')).toBeVisible()
  expect(screen.queryByRole('button', { name: /informar preço/i })).not.toBeInTheDocument()
})
