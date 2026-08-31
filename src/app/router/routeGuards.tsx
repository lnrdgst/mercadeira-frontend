import { Navigate, Outlet } from 'react-router'
import { FamilyResolutionError } from '../../features/auth/session/FamilyResolutionError'
import { SessionLoading } from '../../features/auth/session/SessionLoading'
import { useSession } from '../../features/auth/session/sessionContext'

function SessionState({ children }: { children: React.ReactNode }) {
  const { status } = useSession()

  if (status === 'initializing' || status === 'resolving-family') {
    return <SessionLoading />
  }

  if (status === 'family-resolution-error') {
    return <FamilyResolutionError />
  }

  return children
}

export function RootRedirect() {
  const { status } = useSession()

  if (status === 'initializing' || status === 'resolving-family') {
    return <SessionLoading />
  }

  if (status === 'family-resolution-error') {
    return <FamilyResolutionError />
  }

  if (status === 'authenticated-with-family') {
    return <Navigate to="/inicio" replace />
  }

  if (status === 'authenticated-without-family') {
    return <Navigate to="/familia/entrada" replace />
  }

  return <Navigate to="/login" replace />
}

export function PublicOnlyRoute() {
  const { status } = useSession()

  if (status === 'initializing' || status === 'resolving-family') {
    return <SessionLoading />
  }

  if (status === 'family-resolution-error') {
    return <FamilyResolutionError />
  }

  if (status === 'authenticated-with-family') {
    return <Navigate to="/inicio" replace />
  }

  if (status === 'authenticated-without-family') {
    return <Navigate to="/familia/entrada" replace />
  }

  return <Outlet />
}

export function OnboardingRoute() {
  const { status } = useSession()

  return (
    <SessionState>
      {status === 'unauthenticated' && <Navigate to="/login" replace />}
      {status === 'authenticated-with-family' && <Navigate to="/inicio" replace />}
      {status === 'authenticated-without-family' && <Outlet />}
    </SessionState>
  )
}

export function FamilyRequiredRoute() {
  const { status } = useSession()

  return (
    <SessionState>
      {status === 'unauthenticated' && <Navigate to="/login" replace />}
      {status === 'authenticated-without-family' && (
        <Navigate to="/familia/entrada" replace />
      )}
      {status === 'authenticated-with-family' && <Outlet />}
    </SessionState>
  )
}
