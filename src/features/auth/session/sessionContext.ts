import { createContext, useContext } from 'react'
import type { AuthSession, LoginRequest } from '../types/auth'
import type { SessionStatus } from './SessionProvider'

interface SessionContextValue {
  status: SessionStatus
  auth: AuthSession | null
  authenticate: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}
export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const value = useContext(SessionContext)

  if (!value) {
    throw new Error('useSession deve ser usado dentro de SessionProvider.')
  }

  return value
}
