export function NotFoundPage() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center gap-1 bg-background px-page text-center text-foreground">
      <h1 className="text-headline-lg font-bold">Página não encontrada</h1>
      <p className="text-body-md text-foreground-muted">
        Não foi possível localizar esta área.
      </p>
    </main>
  )
}
