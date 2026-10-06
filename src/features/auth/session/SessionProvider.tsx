import { useCallback, useEffect, useRef, useState } from 'react'
import { login as loginRequest, loginComGoogle, logout as logoutRequest, refresh as refreshRequest, vincularGoogle as vincularGoogleRequest } from '../api/authApi'
import type { AuthSession, LoginRequest } from '../types/auth'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { registerAuthRecovery } from '../../../shared/api/authRecovery'
import { clearStoredAuthSession, hasValidFutureExpiration, persistAuthSession, readStoredAuthSession } from './authStorage'
import { SessionContext } from './sessionContext'
import { removerFiltrosDoUsuarioAtual } from '../../shopping-lists/session/listasFiltersStorage'

export type SessionStatus = 'initializing' | 'unauthenticated' | 'authenticated'

interface SessionState {
  status: SessionStatus
  auth: AuthSession | null
}

const refreshAdvanceMilliseconds = 60_000

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const initialAuth = readStoredAuthSession()
  const authRef = useRef<AuthSession | null>(initialAuth)
  const refreshInFlight = useRef<Promise<string | null> | null>(null)
  const [session, setSession] = useState<SessionState>({ status: 'initializing', auth: initialAuth })

  const atualizarSessao = useCallback((status: SessionStatus, auth: AuthSession | null) => {
    authRef.current = auth
    setSession({ status, auth })
  }, [])

  const encerrarSessao = useCallback(() => {
    removerFiltrosDoUsuarioAtual()
    clearStoredAuthSession()
    atualizarSessao('unauthenticated', null)
  }, [atualizarSessao])

  const renovarAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) return refreshInFlight.current

    const refreshToken = authRef.current?.refreshToken
    if (!refreshToken) return null

    const promise = (async () => {
      try {
        const response = await refreshRequest(refreshToken)
        if (!response.data) throw new Error('Resposta de renovacao de sessao ausente.')

        persistAuthSession(response.data)
        atualizarSessao('authenticated', response.data)
        return response.data.token
      } catch (error) {
        if ((error as ApiRequestError).status === 401) {
          encerrarSessao()
          return null
        }
        throw error
      }
    })()

    refreshInFlight.current = promise
    try {
      return await promise
    } finally {
      if (refreshInFlight.current === promise) refreshInFlight.current = null
    }
  }, [atualizarSessao, encerrarSessao])

  useEffect(() => registerAuthRecovery(renovarAccessToken), [renovarAccessToken])

  useEffect(() => {
    let ativo = true

    async function restaurar() {
      const auth = authRef.current
      if (!auth) {
        if (ativo) atualizarSessao('unauthenticated', null)
        return
      }

      if (hasValidFutureExpiration(auth.expiracao)) {
        if (ativo) atualizarSessao('authenticated', auth)
        return
      }

      try {
        await renovarAccessToken()
      } catch {
        // Falha de rede ou 5xx mantem a sessao local para uma nova tentativa.
      }
    }

    void restaurar()
    return () => { ativo = false }
  }, [atualizarSessao, renovarAccessToken])

  useEffect(() => {
    if (session.status !== 'authenticated' || !session.auth) return
    const expiracao = Date.parse(session.auth.expiracao)
    const atraso = Math.max(0, expiracao - Date.now() - refreshAdvanceMilliseconds)
    const timer = window.setTimeout(() => { void renovarAccessToken().catch(() => undefined) }, atraso)
    return () => window.clearTimeout(timer)
  }, [renovarAccessToken, session.auth, session.status])

  function logout() {
    const refreshToken = authRef.current?.refreshToken
    encerrarSessao()
    if (refreshToken) void logoutRequest(refreshToken).catch(() => undefined)
  }

  async function authenticate(credentials: LoginRequest) {
    const response = await loginRequest(credentials)
    if (!response.data) throw new Error('Nao foi possivel iniciar sua sessao.')

    persistAuthSession(response.data)
    atualizarSessao('authenticated', response.data)
  }

  function iniciarSessaoGoogle(response: { token: string | null; expiracao: string | null; refreshToken: string | null }) {
    if (!response.token || !response.expiracao || !response.refreshToken) throw new Error('Resposta de autenticacao Google invalida.')
    const auth = { token: response.token, expiracao: response.expiracao, refreshToken: response.refreshToken }
    persistAuthSession(auth)
    atualizarSessao('authenticated', auth)
  }

  async function authenticateGoogle(credential: string) {
    const response = await loginComGoogle(credential)
    if (!response.data) throw new Error('Nao foi possivel validar sua Conta Google.')
    if (response.data.vinculoNecessario) return true
    iniciarSessaoGoogle(response.data)
    return false
  }

  async function vincularGoogle(credential: string, senhaAtual: string) {
    const response = await vincularGoogleRequest(credential, senhaAtual)
    if (!response.data || response.data.vinculoNecessario) throw new Error('Nao foi possivel vincular sua Conta Google.')
    iniciarSessaoGoogle(response.data)
  }

  return <SessionContext value={{ ...session, authenticate, authenticateGoogle, vincularGoogle, logout }}>{children}</SessionContext>
}
