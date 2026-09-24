import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { ListasPage } from '../src/features/shopping-lists/pages/ListasPage'
import { SessionContext } from '../src/features/auth/session/sessionContext'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import { FamilyContext } from '../src/features/family/session/familyContext'
import { familyContextFixture, familyFixture, sessionFixture } from './helpers'

test('marca somente a lista criada pelo usuário autenticado', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([
    { id: 'minha', nome: 'Minha lista', categoria: 'FARMACIA', estabelecimento: null, status: 'EM_PREPARACAO', criadaEm: '2026-09-24T10:00:00Z', atualizadaEm: '2026-09-24T10:00:00Z', criadaPorUsuarioId: 'usuario-a' },
    { id: 'outra', nome: 'Outra lista', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_PREPARACAO', criadaEm: '2026-09-24T10:00:00Z', atualizadaEm: '2026-09-24T10:00:00Z', criadaPorUsuarioId: 'usuario-b' },
  ]))
  const familia = familyFixture()
  render(<SessionContext value={sessionFixture()}><AuthenticatedUserContext value={{ usuario: { id: 'usuario-a', nome: 'Ana', email: 'ana@test' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}><FamilyContext value={familyContextFixture({ familias: [familia], familiaSelecionada: familia })}><MemoryRouter><ListasPage /></MemoryRouter></FamilyContext></AuthenticatedUserContext></SessionContext>)
  const minha = (await screen.findByRole('heading', { name: 'Minha lista' })).closest('a')!
  const outra = screen.getByRole('heading', { name: 'Outra lista' }).closest('a')!
  expect(minha).toHaveTextContent('Lista criada por você')
  expect(outra).not.toHaveTextContent('Lista criada por você')
})
