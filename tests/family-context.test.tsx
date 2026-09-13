import { act, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { FamilyProvider } from '../src/features/family/session/FamilyProvider'
import { useFamilyContext } from '../src/features/family/session/familyContext'
import { ListasPage } from '../src/features/shopping-lists/pages/ListasPage'
import { deferred, familyFixture, renderApp } from './helpers'

const storageKey = 'mercadeira.familia.selecionada'
const familiaA = familyFixture()
const familiaB = familyFixture({ id: 'familia-b', nome: 'Família B', codigoIngresso: 'TESTE-B' })

function SeletorFamilia() {
  const { familiaSelecionada, familias, selecionarFamilia, loading } = useFamilyContext()
  return <>
    <p role="status">{loading ? 'Carregando contexto' : familiaSelecionada?.nome || 'Sem seleção'}</p>
    {familias.map((familia) => <button key={familia.id} onClick={() => selecionarFamilia(familia.id)}>{familia.nome}</button>)}
  </>
}

test('restaura apenas o ID persistido, usando os dados atuais retornados pela API', async () => {
  localStorage.setItem(storageKey, familiaB.id)
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([familiaA, { ...familiaB, nome: 'Nome atualizado' }]))
  renderApp(<FamilyProvider><SeletorFamilia /></FamilyProvider>)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Nome atualizado'))
  expect(localStorage.getItem(storageKey)).toBe(familiaB.id)
  expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/familias$/), expect.objectContaining({ method: 'GET' }))
})

test.each([
  { caso: 'ID inválido com várias famílias', familias: [familiaA, familiaB], nome: 'Sem seleção', id: null },
  { caso: 'uma única família', familias: [familiaA], nome: familiaA.nome, id: familiaA.id },
  { caso: 'nenhuma família', familias: [], nome: 'Sem seleção', id: null },
])('$caso: reconcilia a seleção persistida com a coleção retornada', async ({ familias, nome, id }) => {
  localStorage.setItem(storageKey, 'vinculo-antigo')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(familias))
  renderApp(<FamilyProvider><SeletorFamilia /></FamilyProvider>)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(nome))
  expect(localStorage.getItem(storageKey)).toBe(id)
})

test('trocar família persiste a escolha e descarta da tela as listas do contexto anterior', async () => {
  localStorage.setItem(storageKey, familiaA.id)
  const listasB = deferred<Response>()
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.endsWith('/familias')) return Response.json([familiaA, familiaB])
    if (path.endsWith(`/familias/${familiaA.id}/listas`)) return Response.json([
      { id: 'lista-a', nome: 'Compras exclusivas A', status: 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null },
    ])
    if (path.endsWith(`/familias/${familiaB.id}/listas`)) return listasB.promise
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  const { user } = renderApp(<FamilyProvider><SeletorFamilia /><ListasPage /></FamilyProvider>)
  expect(await screen.findByRole('heading', { name: 'Compras exclusivas A' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: familiaB.nome }))
  expect(localStorage.getItem(storageKey)).toBe(familiaB.id)
  expect(screen.queryByRole('heading', { name: 'Compras exclusivas A' })).not.toBeInTheDocument()
  expect(screen.getByText('Carregando suas listas...')).toBeInTheDocument()
  await act(async () => listasB.resolve(Response.json([
    { id: 'lista-b', nome: 'Compras exclusivas B', status: 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null },
  ])))
  expect(await screen.findByRole('heading', { name: 'Compras exclusivas B' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Compras exclusivas A' })).not.toBeInTheDocument()
})
