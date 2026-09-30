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
  expect(screen.getByRole('link', { name: 'Nova lista de compras' })).toBeVisible()
  expect(preparacao).toHaveClass('border-2', 'border-foreground', 'bg-surface')
  expect(andamento).toHaveClass('border-primary/20', 'bg-primary/5')
  expect(andamento).not.toHaveClass('border-2', 'border-foreground')
  expect(finalizada).toHaveClass('bg-blue-50')
  expect(finalizada).not.toHaveClass('border-2', 'border-foreground')
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

test('ações compactas dos filtros preservam nomes acessíveis e comportamento', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))
  const { user } = renderApp(<ListasPage />)
  await user.click(await screen.findByRole('button', { name: /Toque para buscar listas/ }))

  const dialog = screen.getByRole('dialog', { name: 'Filtrar listas' })
  const limpar = within(dialog).getByRole('button', { name: 'Limpar filtros' })
  expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveAttribute('title', 'Cancelar')
  expect(limpar).toHaveAttribute('title', 'Limpar filtros')
  expect(within(dialog).getByRole('button', { name: 'Buscar' })).toHaveAttribute('title', 'Buscar')

  await user.click(limpar)
  await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))
  expect(screen.queryByRole('dialog', { name: 'Filtrar listas' })).not.toBeInTheDocument()
})
