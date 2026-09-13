import { screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { AppRouter } from '../src/app/router/AppRouter'
import { renderApp } from './helpers'

test('link antigo de Histórico abre Minhas Listas e navegação do piloto tem três destinos', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))
  renderApp(<AppRouter />, { route: '/historico' })
  expect(await screen.findByRole('heading', { name: 'Minhas listas' })).toBeInTheDocument()
  expect(await screen.findByText('Você ainda não possui listas.')).toBeInTheDocument()
  const nav = within(screen.getByRole('navigation', { name: 'Navegação principal' }))
  expect(nav.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/inicio', '/listas', '/familia'])
  expect(nav.getByRole('link', { name: 'Listas' })).toHaveAttribute('aria-current', 'page')
  expect(nav.queryByRole('link', { name: 'Histórico' })).not.toBeInTheDocument()
})
