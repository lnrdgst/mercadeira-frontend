import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { expect, test } from 'vitest'
import { FamilyOnboardingRoute, RootRedirect } from '../src/app/router/routeGuards'
import { BoasVindasPage } from '../src/features/family/pages/BoasVindasPage'
import { familyContextFixture, renderApp } from './helpers'

test('boas-vindas apresenta imagem decorativa, benefícios e conduz à entrada da família', async () => {
  const { user } = renderApp(
    <Routes>
      <Route path="/boas-vindas" element={<BoasVindasPage />} />
      <Route path="/familia/entrada" element={<h1>Configurar família</h1>} />
    </Routes>,
    { route: '/boas-vindas' },
  )

  expect(screen.getByRole('heading', { name: /Boas vindas ao Mercadeira/ })).toBeInTheDocument()
  expect(screen.getByText('Crie suas listas')).toBeInTheDocument()
  expect(screen.getByText(/Compartilhe com sua fam/)).toBeInTheDocument()
  expect(screen.getByText(/Fa.a compras com mais tranquilidade/)).toBeInTheDocument()
  expect(document.querySelector('img[src*="boas-vindas.png"]')).toHaveAttribute('alt', '')
  expect(screen.getByText(/Boas compras e .timos momentos em fam/)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Começar agora' }))
  expect(await screen.findByRole('heading', { name: /Configurar fam/ })).toBeInTheDocument()
})

test('boas-vindas é acessível somente sem família e não cria loop após recarregar', async () => {
  const semFamilia = familyContextFixture({ familias: [], familiaSelecionada: null })
  renderApp(
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<FamilyOnboardingRoute />}>
        <Route path="/boas-vindas" element={<h1>Boas-vindas</h1>} />
      </Route>
    </Routes>,
    { family: semFamilia },
  )
  expect(await screen.findByRole('heading', { name: 'Boas-vindas' })).toBeInTheDocument()
})

test('usuário com família não fica na rota de boas-vindas', async () => {
  renderApp(
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/inicio" element={<h1>Início</h1>} />
      <Route element={<FamilyOnboardingRoute />}>
        <Route path="/boas-vindas" element={<h1>Boas-vindas</h1>} />
      </Route>
    </Routes>,
    { route: '/boas-vindas' },
  )
  expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
})
