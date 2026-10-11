import { screen, waitFor, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ListasPage } from '../src/features/shopping-lists/pages/ListasPage'
import { renderApp } from './helpers'

function respostaListas() {
  return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json', 'X-Total-Compras-Anteriores': '1' } })
}

test('filtra listas e histórico por item selecionado, junto aos demais filtros', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/membros')) return Response.json([{ membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Ana' }])
    if (url.includes('/itens/sugestoes?')) return Response.json([{ descricao: 'Arroz', unidadeMedida: 'KG' }, { descricao: 'Arroz integral', unidadeMedida: 'PACOTE' }])
    if (url.includes('/historico?')) return Response.json({ content: [], page: 0, hasNext: false })
    if (url.includes('/listas')) return respostaListas()
    throw new Error(`Endpoint inesperado: ${url}`)
  })

  const { user } = renderApp(<ListasPage />)
  await screen.findByRole('button', { name: /Toque para buscar listas/ })
  await user.click(screen.getByRole('button', { name: /Toque para buscar listas/ }))

  const dialog = screen.getByRole('dialog', { name: 'Filtrar listas' })
  expect(within(dialog).queryByText('Criada por')).not.toBeInTheDocument()
  const item = within(dialog).getByRole('combobox', { name: 'Item(ns)' })
  await user.type(item, 'a')
  await new Promise((resolve) => setTimeout(resolve, 250))
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/itens/sugestoes?'))).toBe(false)

  await user.type(item, 'r')
  await user.click(await within(dialog).findByRole('option', { name: /Arroz integral/ }))
  await user.type(within(dialog).getByRole('textbox', { name: 'A partir do dia:' }), '01092026')
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Participante' }), 'membro-a')
  await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))

  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => {
    const href = String(url)
    return href.includes('/listas?') && href.includes('item=Arroz+integral') && href.includes('criadaDe=2026-09-01') && href.includes('participanteMembroFamiliaId=membro-a')
  })).toBe(true))
  expect(screen.getByText('Item: Arroz integral')).toBeVisible()

  await user.click(screen.getByRole('button', { name: /Compras anteriores/ }))
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/listas/historico?') && String(url).includes('item=Arroz+integral'))).toBe(true))

  await user.click(screen.getByRole('button', { name: /Busca de listas com/ }))
  await user.click(within(screen.getByRole('dialog', { name: 'Filtrar listas' })).getByRole('button', { name: 'Limpar filtros' }))
  await user.click(screen.getByRole('button', { name: /Toque para buscar listas/ }))
  expect(screen.getByRole('combobox', { name: 'Item(ns)' })).toHaveValue('')
})

test('apresenta estado vazio das sugestões sem aplicar texto não selecionado', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/membros')) return Response.json([])
    if (url.includes('/itens/sugestoes?')) return Response.json([])
    if (url.includes('/listas')) return respostaListas()
    throw new Error(`Endpoint inesperado: ${url}`)
  })

  const { user } = renderApp(<ListasPage />)
  await user.click(await screen.findByRole('button', { name: /Toque para buscar listas/ }))
  const dialog = screen.getByRole('dialog', { name: 'Filtrar listas' })
  await user.type(within(dialog).getByRole('combobox', { name: 'Item(ns)' }), 'feijao')
  expect(await within(dialog).findByText('Nenhum item encontrado.')).toBeVisible()
  await user.click(within(dialog).getByRole('button', { name: 'Buscar' }))

  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/listas?') && String(url).includes('item='))).toBe(false))
})
