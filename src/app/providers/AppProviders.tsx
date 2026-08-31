import { SessionProvider } from '../../features/auth/session/SessionProvider'
import { FamilyProvider } from '../../features/family/session/FamilyProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FamilyProvider>{children}</FamilyProvider>
    </SessionProvider>
  )
}
