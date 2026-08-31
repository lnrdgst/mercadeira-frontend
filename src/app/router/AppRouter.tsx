import { Route, Routes } from 'react-router'
import { AppShell } from '../layouts/AppShell'
import { TransactionalShell } from '../layouts/TransactionalShell'
import { CadastroPage } from '../../features/auth/pages/CadastroPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { FamiliaEntradaPage } from '../../features/family/pages/FamiliaEntradaPage'
import { FamiliaPage } from '../../features/family/pages/FamiliaPage'
import { HistoricoPage } from '../../features/history/pages/HistoricoPage'
import { InicioPage } from '../../features/home/pages/InicioPage'
import { CompraAndamentoPage } from '../../features/shopping/pages/CompraAndamentoPage'
import { CompraRevisaoPage } from '../../features/shopping/pages/CompraRevisaoPage'
import { ListasPage } from '../../features/shopping-lists/pages/ListasPage'
import { NotFoundPage } from './NotFoundPage'
import {
  FamilyRequiredRoute,
  OnboardingRoute,
  PublicOnlyRoute,
  RootRedirect,
} from './routeGuards'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
      </Route>

      <Route element={<OnboardingRoute />}>
        <Route path="/familia/entrada" element={<FamiliaEntradaPage />} />
      </Route>

      <Route element={<FamilyRequiredRoute />}>
        <Route element={<AppShell />}>
          <Route path="/inicio" element={<InicioPage />} />
          <Route path="/listas" element={<ListasPage />} />
          <Route path="/familia" element={<FamiliaPage />} />
          <Route path="/historico" element={<HistoricoPage />} />
        </Route>

        <Route element={<TransactionalShell />}>
          <Route
            path="/compras/:compraId/andamento"
            element={<CompraAndamentoPage />}
          />
          <Route
            path="/compras/:compraId/revisao"
            element={<CompraRevisaoPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
