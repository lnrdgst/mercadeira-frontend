import type { ComponentProps, ReactNode } from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { SessionContext } from '../src/features/auth/session/sessionContext'
import { FamilyContext, type FamilyContextValue } from '../src/features/family/session/familyContext'
import type { FamiliaResponse } from '../src/features/family/types/family'

type SessionValue = NonNullable<ComponentProps<typeof SessionContext>['value']>

export function sessionFixture(overrides: Partial<SessionValue> = {}): SessionValue {
  return {
    status: 'authenticated',
    auth: { token: 'token-teste', expiracao: '2099-01-01T00:00:00Z' },
    authenticate: vi.fn(async () => {}),
    logout: vi.fn(),
    ...overrides,
  }
}

export function familyFixture(overrides: Partial<FamiliaResponse> = {}): FamiliaResponse {
  return { id: 'familia-a', nome: 'Família A', codigoIngresso: 'TESTE-A', status: 'ATIVA', papel: 'MEMBRO', ...overrides }
}

export function familyContextFixture(overrides: Partial<FamilyContextValue> = {}): FamilyContextValue {
  const familia = familyFixture()
  return {
    familias: [familia], familiaSelecionada: familia, loading: false, error: false,
    selecionarFamilia: vi.fn(), recarregarFamilias: vi.fn(async () => familia), ...overrides,
  }
}

export function renderApp(ui: ReactNode, {
  session = sessionFixture(), family = familyContextFixture(), route = '/',
}: { session?: SessionValue; family?: FamilyContextValue; route?: string } = {}) {
  return {
    user: userEvent.setup(), session, family,
    ...render(<SessionContext value={session}><FamilyContext value={family}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </FamilyContext></SessionContext>),
  }
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
