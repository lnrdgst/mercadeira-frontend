import { SessionProvider } from '../../features/auth/session/SessionProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
