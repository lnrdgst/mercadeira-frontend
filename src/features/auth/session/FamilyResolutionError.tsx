import { useSession } from './sessionContext'

export function FamilyResolutionError() {
  const { retryFamilyResolution, status } = useSession()

  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center gap-gutter bg-background px-page text-center text-foreground">
      <div className="space-y-1">
        <h1 className="text-headline-lg font-bold">Não foi possível carregar seus dados.</h1>
        <p className="text-body-md text-foreground-muted">
          Verifique sua conexão e tente novamente.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void retryFamilyResolution()}
        disabled={status === 'resolving-family'}
        className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        Tentar novamente
      </button>
    </main>
  )
}
