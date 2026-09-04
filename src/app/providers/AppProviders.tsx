import { SessionProvider } from '../../features/auth/session/SessionProvider'
import { AuthenticatedUserProvider } from '../../features/auth/user/AuthenticatedUserProvider'
import { FamilyProvider } from '../../features/family/session/FamilyProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthenticatedUserProvider><FamilyProvider>{children}</FamilyProvider></AuthenticatedUserProvider>
    </SessionProvider>
  )
}
