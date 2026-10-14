import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import { AppShell } from '../src/app/layouts/AppShell'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import { FamilyContext } from '../src/features/family/session/familyContext'
import { SessionContext } from '../src/features/auth/session/sessionContext'
import { familyContextFixture, familyFixture, sessionFixture } from './helpers'
import { render } from '@testing-library/react'

const familiaPrincipal = familyFixture({ id: 'familia-principal', nome: 'Família Principal', principal: true })
const familiaSelecionada = familyFixture({ id: 'familia-selecionada', nome: 'Família Escolhida', principal: false })

function renderMenu() {
  return render(
    <SessionContext value={sessionFixture()}>
      <AuthenticatedUserContext value={{ usuario: { id: 'usuario-a', nome: 'Lionel', email: 'lionel@mercadeira.app' }, loading: false, error: false, recarregarUsuario: async () => {} }}>
        <FamilyContext value={familyContextFixture({ familias: [familiaPrincipal, familiaSelecionada], familiaSelecionada })}>
          <MemoryRouter initialEntries={['/inicio']}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/inicio" element={<p>Início</p>} />
                <Route path="/minha-conta" element={<p>Dados da conta</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </FamilyContext>
      </AuthenticatedUserContext>
    </SessionContext>,
  )
}

async function abrirMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))
  return screen.getByRole('dialog', { name: 'Menu da conta' })
}

test('mostra a família selecionada, não a principal, no cabeçalho do menu da conta', async () => {
  const user = userEvent.setup()
  renderMenu()
  const dialog = await abrirMenu(user)

  expect(dialog).toHaveTextContent('Família: Família Escolhida')
  expect(dialog).not.toHaveTextContent('Família Principal')
})

test.each(['Lionel', 'lionel@mercadeira.app', 'Família: Família Escolhida'])('clicar em %s recolhe o menu da conta', async (texto) => {
  const user = userEvent.setup()
  renderMenu()
  await abrirMenu(user)

  await user.click(screen.getByText(texto))
  expect(screen.queryByRole('dialog', { name: 'Menu da conta' })).not.toBeInTheDocument()
})

test('a seta e Enter também recolhem o menu, sem afetar Minha conta', async () => {
  const user = userEvent.setup()
  renderMenu()
  await abrirMenu(user)
  const recolher = screen.getByRole('button', { name: 'Recolher menu da conta' })

  fireEvent.click(recolher.querySelector('svg')!)
  expect(screen.queryByRole('dialog', { name: 'Menu da conta' })).not.toBeInTheDocument()

  await abrirMenu(user)
  screen.getByRole('button', { name: 'Recolher menu da conta' }).focus()
  await user.keyboard('{Enter}')
  expect(screen.queryByRole('dialog', { name: 'Menu da conta' })).not.toBeInTheDocument()

  await abrirMenu(user)
  await user.click(screen.getByRole('link', { name: 'Minha conta' }))
  expect(await screen.findByText('Dados da conta')).toBeVisible()
  expect(screen.queryByRole('dialog', { name: 'Menu da conta' })).not.toBeInTheDocument()
})
