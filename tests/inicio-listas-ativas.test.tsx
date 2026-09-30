import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { InicioPage } from '../src/features/home/pages/InicioPage'
import { SessionContext } from '../src/features/auth/session/sessionContext'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import { FamilyContext } from '../src/features/family/session/familyContext'
import { familyContextFixture, familyFixture, sessionFixture } from './helpers'

type Status = 'EM_PREPARACAO' | 'EM_COMPRA' | 'FINALIZADA'

const lista = (status: Status) => ({
  id: `lista-${status}`,
  nome: status,
  categoria: 'SUPERMERCADO',
  estabelecimento: null,
  status,
  criadaEm: '2026-09-24T10:00:00Z',
  atualizadaEm: '2026-09-24T10:00:00Z',
})

function renderHome(respostas: Status[][]) {
  let indice = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.endsWith('/compra')) return Response.json({
      status: 'EM_ANDAMENTO', listaId: 'lista-EM_COMPRA', nomeLista: 'EM_COMPRA', categoria: 'SUPERMERCADO', iniciadaEm: '2026-09-24T10:00:00Z', estabelecimento: null,
    })
    if (path.includes('/listas')) return Response.json(respostas[Math.min(indice++, respostas.length - 1)].map(lista))
    return Response.json([])
  })
  const familia = familyFixture()
  return render(
    <SessionContext value={sessionFixture()}>
      <AuthenticatedUserContext value={{ usuario: { id: 'usuario', nome: 'Ana', email: 'ana@test' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}>
        <FamilyContext value={familyContextFixture({ familias: [familia], familiaSelecionada: familia })}>
          <MemoryRouter><InicioPage /></MemoryRouter>
        </FamilyContext>
      </AuthenticatedUserContext>
    </SessionContext>,
  )
}

test('Home mostra o CTA sem lista em preparação ou compra em andamento', async () => {
  renderHome([[]])
  expect(await screen.findByRole('link', { name: 'Preparar nova lista de compras' })).toBeVisible()
})

test.each([
  [['EM_PREPARACAO']],
  [['EM_COMPRA']],
  [['EM_PREPARACAO', 'EM_COMPRA']],
])('Home oculta o CTA quando há fluxo ativo: %o', async (status) => {
  renderHome([status])
  await screen.findAllByRole('link', { name: /EM_/ })
  expect(screen.queryByRole('link', { name: 'Preparar nova lista de compras' })).not.toBeInTheDocument()
})

test('Home volta a exibir o CTA após a reconciliação remover o último fluxo ativo', async () => {
  renderHome([['EM_PREPARACAO'], []])
  await screen.findByRole('heading', { name: 'Lista em preparação' })
  expect(screen.queryByRole('link', { name: 'Preparar nova lista de compras' })).not.toBeInTheDocument()

  await act(async () => { window.dispatchEvent(new Event('focus')); await Promise.resolve() })
  await waitFor(() => expect(screen.getByRole('link', { name: 'Preparar nova lista de compras' })).toBeVisible())
})

test('card de preparação da Home recebe a borda de destaque', async () => {
  renderHome([['EM_PREPARACAO']])
  const card = await screen.findByRole('link', { name: /EM_PREPARACAO/ })
  expect(card).toHaveClass('border-2', 'border-foreground', 'bg-surface')
})
