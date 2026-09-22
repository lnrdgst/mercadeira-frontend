import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { InicioPage } from '../src/features/home/pages/InicioPage'
import { SessionContext } from '../src/features/auth/session/sessionContext'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import { FamilyContext } from '../src/features/family/session/familyContext'
import { deferred, familyContextFixture, familyFixture, sessionFixture } from './helpers'

const usuario = { id: 'usuario-a', nome: 'Ana Silva', email: 'ana@example.test' }

function renderizarInicio(familia = familyFixture()) {
  return render(
    <SessionContext value={sessionFixture()}>
      <AuthenticatedUserContext value={{ usuario, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}>
        <FamilyContext value={familyContextFixture({ familias: [familia], familiaSelecionada: familia })}>
          <MemoryRouter><InicioPage /></MemoryRouter>
        </FamilyContext>
      </AuthenticatedUserContext>
    </SessionContext>,
  )
}

function lista(id: string, status: 'FINALIZADA' | 'EM_PREPARACAO' = 'FINALIZADA') {
  return { id, nome: `Lista ${id}`, categoria: 'SUPERMERCADO', estabelecimento: null, status, criadaEm: '2026-09-01T08:00:00Z', atualizadaEm: '2026-09-01T08:00:00Z' }
}

function compra(id: string, finalizadaEm: string) {
  return { id: `compra-${id}`, listaId: id, nomeLista: `Lista ${id}`, categoria: 'SUPERMERCADO', estabelecimento: null, status: 'FINALIZADA', iniciadaEm: '2026-09-01T09:00:00Z', finalizadaEm, finalizadaPor: null, contextoUsuario: { participanteCompra: true, podeAlterarPresenca: true, podeFinalizarCompra: false, podeReutilizarLista: false }, participantes: [], itens: [] }
}

test('exibe a compra finalizada mais recente pela data real de finalização', async () => {
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.endsWith('/familias/familia-a/listas')) return Response.json([lista('antiga'), lista('recente')])
    if (path.endsWith('/listas/antiga/compra')) return Response.json(compra('antiga', '2026-09-20T10:00:00'))
    if (path.endsWith('/listas/recente/compra')) return Response.json(compra('recente', '2026-09-21T18:42:00'))
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  renderizarInicio()

  expect(await screen.findByText('Última compra finalizada:', { exact: false })).toHaveTextContent('21/09/2026 · Segunda-feira às 18:42')
  expect(screen.getByRole('link', { name: 'Ver compra' })).toHaveAttribute('href', '/listas/recente/compra/revisao')
  expect(http).toHaveBeenCalledTimes(3)
})

test('informa quando a família não tem compras finalizadas', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([lista('preparacao', 'EM_PREPARACAO')]))
  renderizarInicio()
  expect(await screen.findByText('Não há compras finalizadas ainda.')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Ver compra' })).not.toBeInTheDocument()
})

test('falha do histórico não quebra a Home', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.endsWith('/familias/familia-a/listas')) return Response.json([lista('finalizada')])
    return Response.json({ mensagem: 'Indisponível' }, { status: 503 })
  })
  renderizarInicio()
  expect(await screen.findByRole('heading', { name: 'Listas em preparação' })).toBeVisible()
  await act(async () => {})
  expect(screen.queryByText('Última compra finalizada')).not.toBeInTheDocument()
})

test('troca de família descarta a resposta pendente da família anterior', async () => {
  const respostaAntiga = deferred<Response>()
  const familiaB = familyFixture({ id: 'familia-b', nome: 'Família B' })
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.endsWith('/familias/familia-a/listas')) return respostaAntiga.promise
    if (path.endsWith('/familias/familia-b/listas')) return Response.json([])
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  const view = renderizarInicio()
  view.rerender(
    <SessionContext value={sessionFixture()}>
      <AuthenticatedUserContext value={{ usuario, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}>
        <FamilyContext value={familyContextFixture({ familias: [familiaB], familiaSelecionada: familiaB })}>
          <MemoryRouter><InicioPage /></MemoryRouter>
        </FamilyContext>
      </AuthenticatedUserContext>
    </SessionContext>,
  )
  expect(await screen.findByText('Não há compras finalizadas ainda.')).toBeVisible()
  await act(async () => respostaAntiga.resolve(Response.json([lista('antiga')])))
  expect(screen.queryByText('Lista antiga')).not.toBeInTheDocument()
})
