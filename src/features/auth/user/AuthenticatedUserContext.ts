import { createContext, useContext } from 'react'
import type { UsuarioAutenticadoResponse } from './AuthenticatedUserProvider'

interface UserValue { usuario: UsuarioAutenticadoResponse | null; loading: boolean; error: boolean; recarregarUsuario: () => Promise<void> }
export const AuthenticatedUserContext = createContext<UserValue | null>(null)
export function useAuthenticatedUser() { const value = useContext(AuthenticatedUserContext); if (!value) throw new Error('useAuthenticatedUser deve ser usado dentro de AuthenticatedUserProvider.'); return value }
