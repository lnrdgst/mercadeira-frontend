import { useState } from 'react'
import { login as loginRequest } from '../api/authApi'
import type { AuthSession, LoginRequest } from '../types/auth'
import { clearStoredAuthSession, persistAuthSession, readStoredAuthSession } from './authStorage'
import { SessionContext } from './sessionContext'

export type SessionStatus = 'initializing' | 'unauthenticated' | 'authenticated'

interface SessionState {
  status: SessionStatus
  auth: AuthSession | null
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(() => {
    const auth = readStoredAuthSession()
    return auth
      ? { status: 'authenticated', auth }
      : { status: 'unauthenticated', auth: null }
  })

  function logout() {
    clearStoredAuthSession()
    setSession({ status: 'unauthenticated', auth: null })
  }

  async function authenticate(credentials: LoginRequest) {
    const response = await loginRequest(credentials)

    if (!response.data) {
      throw new Error('Não foi possível iniciar sua sessão.')
    }

    persistAuthSession(response.data)
    setSession({ status: 'authenticated', auth: response.data })
  }

  return (
    <SessionContext value={{ ...session, authenticate, logout }}>
      {children}
    </SessionContext>
  )
}
