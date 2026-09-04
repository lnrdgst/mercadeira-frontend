import { useCallback, useEffect, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { apiRequest } from '../../../shared/api/apiClient'
import { useSession } from '../session/sessionContext'
import { AuthenticatedUserContext } from './AuthenticatedUserContext'

export interface UsuarioAutenticadoResponse { id: string; nome: string; email: string }
export function AuthenticatedUserProvider({ children }: { children: React.ReactNode }) {
  const { auth, logout } = useSession(); const [usuario, setUsuario] = useState<UsuarioAutenticadoResponse | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(false)
  const recarregarUsuario = useCallback(async () => { if (!auth) { setUsuario(null); setError(false); return }; setLoading(true); setError(false); try { const response = await apiRequest<UsuarioAutenticadoResponse>('/usuarios/me', { token: auth.token }); setUsuario(response.data) } catch (err) { if ((err as ApiRequestError).status === 401) logout(); else setError(true) } finally { setLoading(false) } }, [auth, logout])
  useEffect(() => { void Promise.resolve().then(recarregarUsuario) }, [recarregarUsuario])
  return <AuthenticatedUserContext value={{ usuario, loading, error, recarregarUsuario }}>{children}</AuthenticatedUserContext>
}
