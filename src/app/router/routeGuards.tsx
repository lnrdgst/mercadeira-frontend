import { Navigate, Outlet } from 'react-router'
import { SessionLoading } from '../../features/auth/session/SessionLoading'
import { useSession } from '../../features/auth/session/sessionContext'
import { useFamilyContext } from '../../features/family/session/familyContext'

function FamilyLoading() {
  return <SessionLoading />
}

function FamilyLoadError() {
  const { recarregarFamilias } = useFamilyContext()

  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center gap-gutter bg-background px-page text-center text-foreground">
      <div className="space-y-1">
        <h1 className="text-headline-lg font-bold">Não foi possível carregar suas famílias.</h1>
        <p className="text-body-md text-foreground-muted">
          Verifique sua conexão e tente novamente.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void recarregarFamilias()}
        className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Tentar novamente
      </button>
    </main>
  )
}

function AuthenticatedFamilyState({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const { loading, error } = useFamilyContext()

  if (status === 'initializing' || loading) {
    return <SessionLoading />
  }

  if (error) {
    return <FamilyLoadError />
  }

  return children
}

export function RootRedirect() {
  const { status } = useSession()
  const { familias, familiaSelecionada, loading, error } = useFamilyContext()

  if (status === 'initializing' || (status === 'authenticated' && loading)) {
    return <SessionLoading />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (error) {
    return <FamilyLoadError />
  }

  if (familias.length === 0) {
    return <Navigate to="/familia/entrada" replace />
  }

  if (familiaSelecionada) {
    return <Navigate to="/inicio" replace />
  }

  return <Navigate to="/familia/selecionar" replace />
}

export function PublicOnlyRoute() {
  const { status } = useSession()

  if (status === 'initializing') {
    return <SessionLoading />
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function AuthenticatedRoute() {
  const { status } = useSession()

  if (status === 'initializing') return <SessionLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />

  return <Outlet />
}

export function FamilyRequiredRoute() {
  const { status } = useSession()
  const { familias, familiaSelecionada } = useFamilyContext()

  if (status === 'initializing') return <FamilyLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />

  return (
    <AuthenticatedFamilyState>
      {familias.length === 0 && <Navigate to="/familia/entrada" replace />}
      {familias.length > 0 && !familiaSelecionada && (
        <Navigate to="/familia/selecionar" replace />
      )}
      {familiaSelecionada && <Outlet />}
    </AuthenticatedFamilyState>
  )
}

export function FamilySelectionRoute() {
  const { status } = useSession()
  const { familias } = useFamilyContext()

  if (status === 'initializing') return <FamilyLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />

  return (
    <AuthenticatedFamilyState>
      {familias.length === 0 ? <Navigate to="/familia/entrada" replace /> : <Outlet />}
    </AuthenticatedFamilyState>
  )
}
