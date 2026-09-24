import { screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ListasPage } from '../src/features/shopping-lists/pages/ListasPage'
import { renderApp } from './helpers'

const recente = { id: 'recente', nome: 'Recente', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'FINALIZADA', criadaEm: '2026-09-20T10:00:00Z', atualizadaEm: '2026-09-20T10:00:00Z' }
const antiga = { id: 'antiga', nome: 'Antiga', categoria: 'OUTROS', estabelecimento: null, status: 'FINALIZADA', criadaEm: '2026-08-01T10:00:00Z', atualizadaEm: '2026-08-01T10:00:00Z' }

test('histórico fica fechado, é carregado sob demanda, preserva páginas e abre resumo', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json([recente], { headers: { 'X-Total-Compras-Anteriores': '2' } }))
    .mockResolvedValueOnce(Response.json({ content: [{ lista: antiga, finalizadaEm: '2026-08-01T12:00:00Z' }], page: 0, size: 20, totalElements: 2, totalPages: 2, hasNext: true }))
    .mockResolvedValueOnce(Response.json({ content: [{ lista: { ...antiga, id: 'antiga-2', nome: 'Antiga 2' }, finalizadaEm: '2026-07-01T12:00:00Z' }], page: 1, size: 20, totalElements: 2, totalPages: 2, hasNext: false }))
  const { user } = renderApp(<ListasPage />)
  expect(await screen.findByRole('heading', { name: 'Recente' })).toBeVisible()
  const accordion = screen.getByRole('button', { name: 'Compras anteriores (2)' })
  expect(accordion).toHaveAttribute('aria-expanded', 'false')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await user.click(accordion)
  expect(await screen.findByRole('heading', { name: 'Antiga' })).toBeVisible()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  await user.click(accordion)
  await user.click(accordion)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  await user.click(screen.getByRole('button', { name: 'Carregar mais' }))
  expect(await screen.findByRole('heading', { name: 'Antiga 2' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /Antiga.*Ver resumo/ })[0]).toHaveAttribute('href', '/listas/antiga/compra/revisao')
})

test('sem compras antigas não mostra accordion', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json([], { headers: { 'X-Total-Compras-Anteriores': '0' } }))
  renderApp(<ListasPage />)
  await screen.findByText('Você ainda não possui listas.')
  expect(screen.queryByRole('button', { name: /Compras anteriores/ })).not.toBeInTheDocument()
})
