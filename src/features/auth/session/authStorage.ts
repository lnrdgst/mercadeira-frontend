import type { AuthSession } from '../types/auth'

const authStorageKey = 'mercadeira.auth'

export function hasValidFutureExpiration(expiracao: string) {
  const timestamp = Date.parse(expiracao)
  return Number.isFinite(timestamp) && timestamp > Date.now()
}

export function readStoredAuthSession(): AuthSession | null {
  const storedValue = localStorage.getItem(authStorageKey)

  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown

    if (
      typeof parsedValue !== 'object' ||
      parsedValue === null ||
      typeof (parsedValue as Record<string, unknown>).token !== 'string' ||
      typeof (parsedValue as Record<string, unknown>).expiracao !== 'string' ||
      typeof (parsedValue as Record<string, unknown>).refreshToken !== 'string'
    ) {
      clearStoredAuthSession()
      return null
    }

    const authSession = parsedValue as AuthSession

    return authSession
  } catch {
    clearStoredAuthSession()
    return null
  }
}

export function persistAuthSession(authSession: AuthSession) {
  localStorage.setItem(authStorageKey, JSON.stringify(authSession))
}

export function clearStoredAuthSession() {
  localStorage.removeItem(authStorageKey)
}
