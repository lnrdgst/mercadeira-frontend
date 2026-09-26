import { screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { InicioPage } from '../src/features/home/pages/InicioPage'
import { SessionContext } from '../src/features/auth/session/sessionContext'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import { FamilyContext } from '../src/features/family/session/familyContext'
import { familyContextFixture, familyFixture, sessionFixture } from './helpers'

const pendente = (id = 's1', nome = 'Lionel') => ({ id, status: 'PENDENTE', solicitadaEm: '2026-09-24T12:00:00Z', solicitante: { id: `u-${id}`, nome, email: `${nome.toLowerCase()}@test.local` } })
const minhaPendente = { id: 'minha-1', status: 'PENDENTE', solicitadaEm: '2026-09-24T12:00:00Z', familia: { id: 'familia-pendente', nome: 'Família Natal' } }
function preparar(solicitacoes: unknown[], admin = true, minhasSolicitacoes: unknown[] = []) {
  const familia = familyFixture({ contextoUsuario: { podeGerenciarIntegrantes: admin }, papel: admin ? 'ADMINISTRADOR' : 'MEMBRO' })
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.endsWith('/aprovar') || path.endsWith('/rejeitar')) return new Response(null, { status: 204 })
    if (path.endsWith('/listas')) return Response.json([])
    if (path.endsWith('/solicitacoes/minhas-pendentes')) return Response.json(minhasSolicitacoes)
    if (path.endsWith('/solicitacoes')) return Response.json(solicitacoes)
    return Response.json({}, { status: 404 })
  })
  return { fetchMock, user: userEvent.setup(), ...render(<SessionContext value={sessionFixture()}><AuthenticatedUserContext value={{ usuario: { id: 'usuario', nome: 'Ana', email: 'ana@test' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}><FamilyContext value={familyContextFixture({ familias: [familia], familiaSelecionada: familia })}><MemoryRouter><InicioPage /></MemoryRouter></FamilyContext></AuthenticatedUserContext></SessionContext>) }
}

test('Home mostra aviso somente ao administrador e informa múltiplas solicitações', async () => {
  preparar([pendente('a'), pendente('b', 'Bia')])
  expect(await screen.findByRole('heading', { name: '2 solicitações de ingresso pendentes' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Ver solicitações' })).toBeVisible()
})

test('Home mostra aviso compacto para solicitação pendente do próprio usuário', async () => {
  preparar([], false, [minhaPendente])
  expect(await screen.findByLabelText('Sua solicitação de ingresso pendente')).toHaveTextContent('Você possui uma solicitação de ingresso aguardando aprovação.')
  expect(screen.getByRole('button', { name: 'Ver solicitação' })).toBeVisible()
})

test('membro não recebe ação administrativa', async () => {
  preparar([pendente()], false)
  await screen.findByRole('link', { name: 'Minha família' })
  expect(screen.queryByRole('button', { name: /Analisar solicitação/ })).not.toBeInTheDocument()
})
