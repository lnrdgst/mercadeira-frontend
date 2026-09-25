import { screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ListasPage } from '../src/features/shopping-lists/pages/ListasPage'
import { renderApp } from './helpers'

test('mantém preparação neutra, apresenta andamento em verde e finalizada em azul sem alterar rotas', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([
    { id: 'preparacao', nome: 'Preparação', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_PREPARACAO', criadaEm: '2026-09-01T10:00:00Z', atualizadaEm: '2026-09-01T10:00:00Z' },
    { id: 'andamento', nome: 'Andamento', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_COMPRA', criadaEm: '2026-09-01T10:00:00Z', atualizadaEm: '2026-09-01T10:00:00Z' },
    { id: 'finalizada', nome: 'Finalizada', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'FINALIZADA', criadaEm: '2026-09-01T10:00:00Z', atualizadaEm: '2026-09-01T10:00:00Z' },
  ]))
  renderApp(<ListasPage />)

  const preparacao = (await screen.findByRole('heading', { name: 'Preparação' })).closest('a')!
  const andamento = screen.getByRole('heading', { name: 'Andamento' }).closest('a')!
  const finalizada = screen.getByRole('heading', { name: 'Finalizada' }).closest('a')!
  expect(screen.getByText('Em preparação')).toBeVisible()
  expect(screen.getByText('Em andamento')).toBeVisible()
  expect(within(finalizada).getAllByText('Finalizada')).toHaveLength(2)
  expect(preparacao).toHaveClass('border-foreground/10', 'bg-surface')
  expect(andamento).toHaveClass('border-primary/20', 'bg-primary/5')
  expect(finalizada).toHaveClass('bg-blue-50')
  expect(finalizada.className).toMatch(/border-blue-\d+/)
  expect(andamento).toHaveAttribute('href', '/listas/andamento/compra')
  expect(finalizada).toHaveAttribute('href', '/listas/finalizada/compra/revisao')
  expect(preparacao).toHaveAttribute('href', '/listas/preparacao')
})

test('apresenta datas ISO dos filtros ativos em PT-BR', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))
  renderApp(<ListasPage />, { route: '/listas?dataInicial=2026-09-18&dataFinal=2026-09-20' })
  expect(await screen.findByText('De: 18/09/2026')).toBeVisible()
  expect(screen.getByText('Até: 20/09/2026')).toBeVisible()
})
