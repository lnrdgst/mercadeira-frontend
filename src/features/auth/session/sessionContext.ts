import { createContext, useContext } from 'react'
import type { FamiliaResponse } from '../../family/types/family'
import type { AuthSession, LoginRequest } from '../types/auth'
import type { FamilyResolution, SessionStatus } from './SessionProvider'

interface SessionContextValue {
  status: SessionStatus
  auth: AuthSession | null
  family: FamiliaResponse | null
  authenticate: (credentials: LoginRequest) => Promise<FamilyResolution>
  logout: () => void
  retryFamilyResolution: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const session = useContext(SessionContext)

  if (!session) {
    throw new Error('useSession deve ser usado dentro de SessionProvider.')
  }

  return session
}
