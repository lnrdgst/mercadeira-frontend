import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { expect, test } from 'vitest'
import { AuthenticatedRoute, FamilyRequiredRoute, FamilySelectionRoute, PublicOnlyRoute, RootRedirect } from '../src/app/router/routeGuards'
import { familyContextFixture, familyFixture, renderApp, sessionFixture } from './helpers'

const familiaA = familyFixture()
const familiaB = familyFixture({ id: 'familia-b', nome: 'Família B' })

test.each([
  { caso: 'visitante', session: sessionFixture({ status: 'unauthenticated', auth: null }), family: familyContextFixture(), destino: 'Login destino' },
  { caso: 'sem família', session: sessionFixture(), family: familyContextFixture({ familias: [], familiaSelecionada: null }), destino: 'Entrada destino' },
  { caso: 'família selecionada', session: sessionFixture(), family: familyContextFixture(), destino: 'Início destino' },
  { caso: 'múltiplas sem seleção', session: sessionFixture(), family: familyContextFixture({ familias: [familiaA, familiaB], familiaSelecionada: null }), destino: 'Seleção destino' },
])('RootRedirect: $caso', async ({ session, family, destino }) => {
  renderApp(<Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route path="/login" element={<h1>Login destino</h1>} />
    <Route path="/familia/entrada" element={<h1>Entrada destino</h1>} />
    <Route path="/familia/selecionar" element={<h1>Seleção destino</h1>} />
    <Route path="/inicio" element={<h1>Início destino</h1>} />
  </Routes>, { session, family })
  expect(await screen.findByRole('heading', { name: destino })).toBeInTheDocument()
})

test.each([
  { caso: 'PublicOnlyRoute deixa visitante entrar', Guard: PublicOnlyRoute, autenticado: false, destino: 'Conteúdo filho' },
  { caso: 'PublicOnlyRoute redireciona autenticado', Guard: PublicOnlyRoute, autenticado: true, destino: 'Raiz destino' },
  { caso: 'AuthenticatedRoute bloqueia visitante', Guard: AuthenticatedRoute, autenticado: false, destino: 'Login destino' },
  { caso: 'AuthenticatedRoute permite autenticado', Guard: AuthenticatedRoute, autenticado: true, destino: 'Conteúdo filho' },
])('$caso', async ({ Guard, autenticado, destino }) => {
  renderApp(<Routes>
    <Route element={<Guard />}><Route path="/teste" element={<h1>Conteúdo filho</h1>} /></Route>
    <Route path="/login" element={<h1>Login destino</h1>} />
    <Route path="/" element={<h1>Raiz destino</h1>} />
  </Routes>, { route: '/teste', session: sessionFixture(autenticado ? {} : { status: 'unauthenticated', auth: null }) })
  expect(await screen.findByRole('heading', { name: destino })).toBeInTheDocument()
})

test.each([
  { caso: 'FamilyRequiredRoute sem sessão', Guard: FamilyRequiredRoute, autenticado: false, family: familyContextFixture(), destino: 'Login destino' },
  { caso: 'FamilyRequiredRoute sem família', Guard: FamilyRequiredRoute, autenticado: true, family: familyContextFixture({ familias: [], familiaSelecionada: null }), destino: 'Entrada destino' },
  { caso: 'FamilyRequiredRoute exige seleção', Guard: FamilyRequiredRoute, autenticado: true, family: familyContextFixture({ familias: [familiaA, familiaB], familiaSelecionada: null }), destino: 'Seleção destino' },
  { caso: 'FamilyRequiredRoute com contexto', Guard: FamilyRequiredRoute, autenticado: true, family: familyContextFixture(), destino: 'Conteúdo filho' },
  { caso: 'FamilySelectionRoute sem sessão', Guard: FamilySelectionRoute, autenticado: false, family: familyContextFixture(), destino: 'Login destino' },
  { caso: 'FamilySelectionRoute sem família', Guard: FamilySelectionRoute, autenticado: true, family: familyContextFixture({ familias: [], familiaSelecionada: null }), destino: 'Entrada destino' },
  { caso: 'FamilySelectionRoute com famílias', Guard: FamilySelectionRoute, autenticado: true, family: familyContextFixture({ familias: [familiaA, familiaB], familiaSelecionada: null }), destino: 'Conteúdo filho' },
])('$caso', async ({ Guard, autenticado, family, destino }) => {
  renderApp(<Routes>
    <Route element={<Guard />}><Route path="/teste" element={<h1>Conteúdo filho</h1>} /></Route>
    <Route path="/login" element={<h1>Login destino</h1>} />
    <Route path="/familia/entrada" element={<h1>Entrada destino</h1>} />
    <Route path="/familia/selecionar" element={<h1>Seleção destino</h1>} />
  </Routes>, { route: '/teste', family, session: sessionFixture(autenticado ? {} : { status: 'unauthenticated', auth: null }) })
  expect(await screen.findByRole('heading', { name: destino })).toBeInTheDocument()
})

test.each([RootRedirect, PublicOnlyRoute, AuthenticatedRoute, FamilyRequiredRoute, FamilySelectionRoute])('%s aguarda inicialização sem exibir conteúdo protegido', (Guard) => {
  renderApp(<Routes><Route element={<Guard />}><Route path="/" element={<h1>Conteúdo filho</h1>} /></Route></Routes>, {
    session: sessionFixture({ status: 'initializing', auth: null }),
  })
  expect(screen.queryByRole('heading', { name: 'Conteúdo filho' })).not.toBeInTheDocument()
  expect(screen.getByText(/Carregando/)).toBeInTheDocument()
})

test('falha no carregamento familiar bloqueia conteúdo e oferece nova tentativa', async () => {
  const family = familyContextFixture({ error: true, familiaSelecionada: null })
  const { user } = renderApp(<Routes><Route element={<FamilyRequiredRoute />}><Route path="/" element={<h1>Conteúdo filho</h1>} /></Route></Routes>, { family })
  expect(screen.getByRole('heading', { name: 'Não foi possível carregar suas famílias.' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Conteúdo filho' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(family.recarregarFamilias).toHaveBeenCalledOnce()
})
