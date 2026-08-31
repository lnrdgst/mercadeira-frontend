import { useEffect, useRef, useState } from 'react'
import { buscarFamiliaAtiva } from '../../family/api/familyApi'
import type { FamiliaResponse } from '../../family/types/family'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { login as loginRequest } from '../api/authApi'
import {
  clearStoredAuthSession,
  persistAuthSession,
  readStoredAuthSession,
} from './authStorage'
import type { AuthSession, LoginRequest } from '../types/auth'
import { SessionContext } from './sessionContext'

export type SessionStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'resolving-family'
  | 'authenticated-with-family'
  | 'authenticated-without-family'
  | 'family-resolution-error'

export type FamilyResolution =
  | 'with-family'
  | 'without-family'
  | 'unauthenticated'
  | 'error'

interface SessionState {
  status: SessionStatus
  auth: AuthSession | null
  family: FamiliaResponse | null
}

const initialSessionState: SessionState = {
  status: 'initializing',
  auth: null,
  family: null,
}

function getInitialSessionState(): SessionState {
  const auth = readStoredAuthSession()

  if (!auth) {
    return { status: 'unauthenticated', auth: null, family: null }
  }

  return { ...initialSessionState, auth }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(getInitialSessionState)
  const bootstrappedRef = useRef(false)
  const initialAuthRef = useRef(session.auth)

  function clearSession() {
    clearStoredAuthSession()
    setSession({ status: 'unauthenticated', auth: null, family: null })
  }

  async function resolveFamily(auth: AuthSession): Promise<FamilyResolution> {
    setSession({ status: 'resolving-family', auth, family: null })

    try {
      const response = await buscarFamiliaAtiva(auth.token)

      if (response.status === 204) {
        setSession({
          status: 'authenticated-without-family',
          auth,
          family: null,
        })
        return 'without-family'
      }

      if (response.data) {
        setSession({
          status: 'authenticated-with-family',
          auth,
          family: response.data,
        })
        return 'with-family'
      }

      setSession({ status: 'family-resolution-error', auth, family: null })
      return 'error'
    } catch (error) {
      if ((error as ApiRequestError).status === 401) {
        clearSession()
        return 'unauthenticated'
      }

      setSession({ status: 'family-resolution-error', auth, family: null })
      return 'error'
    }
  }

  useEffect(() => {
    if (bootstrappedRef.current) {
      return
    }

    bootstrappedRef.current = true
    const initialAuth = initialAuthRef.current

    if (!initialAuth) {
      return
    }

    void resolveFamily(initialAuth)
  }, [])

  async function authenticate(credentials: LoginRequest) {
    const response = await loginRequest(credentials)

    if (!response.data) {
      throw new Error('Não foi possível iniciar sua sessão.')
    }

    const auth = response.data
    persistAuthSession(auth)
    return resolveFamily(auth)
  }

  async function retryFamilyResolution() {
    if (!session.auth) {
      return
    }

    await resolveFamily(session.auth)
  }

  return (
    <SessionContext
      value={{
        ...session,
        authenticate,
        logout: clearSession,
        retryFamilyResolution,
      }}
    >
      {children}
    </SessionContext>
  )
}
