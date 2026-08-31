import { useSession } from '../../auth/session/sessionContext'

export function FamiliaPage() {
  const { logout } = useSession()

  return (
    <section className="space-y-page py-page">
      <div>
        <h1 className="text-headline-lg font-bold">Família</h1>
        <p className="mt-1 text-body-md text-foreground-muted">
          Esta área será implementada nas próximas etapas.
        </p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="min-h-touch rounded-control border border-foreground/20 bg-surface px-page text-label-lg font-semibold text-foreground transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Sair
      </button>
    </section>
  )
}
