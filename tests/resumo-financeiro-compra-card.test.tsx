import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ResumoFinanceiroCompraCard } from '../src/features/shopping-lists/components/ResumoFinanceiroCompraCard'
import type { ResumoFinanceiroCompraResponse, StatusListaCompra } from '../src/features/shopping-lists/types/shoppingList'

function renderizar(status: StatusListaCompra, resumoFinanceiro?: ResumoFinanceiroCompraResponse | null) {
  return render(<ResumoFinanceiroCompraCard status={status} resumoFinanceiro={resumoFinanceiro} />)
}

test('não acrescenta informação financeira sem registros', () => {
  renderizar('FINALIZADA', null)
  expect(screen.queryByText(/R\$/)).not.toBeInTheDocument()
})

test('mostra estabelecimento e total para um registro', () => {
  renderizar('FINALIZADA', { totalRegistrado: 130, quantidadeRegistrosFinanceiros: 1, quantidadeEstabelecimentos: 1, estabelecimentoResumo: 'Supermercado X' })
  expect(screen.getByText('Supermercado X')).toBeVisible()
  expect(screen.getByText(/R\$\s*130,00/)).toBeVisible()
  expect(screen.queryByText(/registro/)).not.toBeInTheDocument()
})

test('mostra somente total para um registro sem estabelecimento', () => {
  renderizar('FINALIZADA', { totalRegistrado: 130, quantidadeRegistrosFinanceiros: 1, quantidadeEstabelecimentos: 0, estabelecimentoResumo: null })
  expect(screen.getByText(/R\$\s*130,00/)).toBeVisible()
  expect(screen.queryByText(/não informado/i)).not.toBeInTheDocument()
})

test('resume vários registros do mesmo estabelecimento', () => {
  renderizar('FINALIZADA', { totalRegistrado: 130, quantidadeRegistrosFinanceiros: 2, quantidadeEstabelecimentos: 1, estabelecimentoResumo: 'Supermercado X' })
  expect(screen.getByText('Supermercado X')).toBeVisible()
  expect(screen.getByText(/2 registros.*130,00/)).toBeVisible()
})

test('não repete o estabelecimento já exibido no card', () => {
  render(<><p>Supermercado X</p><ResumoFinanceiroCompraCard status="FINALIZADA" estabelecimentoJaExibido="Supermercado X" resumoFinanceiro={{ totalRegistrado: 130, quantidadeRegistrosFinanceiros: 2, quantidadeEstabelecimentos: 1, estabelecimentoResumo: 'Supermercado X' }} /></>)
  expect(screen.getAllByText('Supermercado X')).toHaveLength(1)
  expect(screen.getByText(/2 registros.*130,00/)).toBeVisible()
})

test('resume vários estabelecimentos sem listar seus nomes', () => {
  renderizar('FINALIZADA', { totalRegistrado: 130, quantidadeRegistrosFinanceiros: 3, quantidadeEstabelecimentos: 2, estabelecimentoResumo: null })
  expect(screen.getByText('2 estabelecimentos')).toBeVisible()
  expect(screen.getByText(/3 registros.*130,00/)).toBeVisible()
})

test.each(['EM_PREPARACAO', 'EM_COMPRA'] as const)('não mostra resumo em %s', (status) => {
  renderizar(status, { totalRegistrado: 130, quantidadeRegistrosFinanceiros: 1, quantidadeEstabelecimentos: 1, estabelecimentoResumo: 'Supermercado X' })
  expect(screen.queryByText('Supermercado X')).not.toBeInTheDocument()
  expect(screen.queryByText(/R\$/)).not.toBeInTheDocument()
})
