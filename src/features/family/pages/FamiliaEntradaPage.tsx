export function FamiliaEntradaPage() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-background px-page py-page text-center text-foreground">
      <div className="max-w-md space-y-gutter">
        <h1 className="text-headline-lg font-bold">
          Você ainda não faz parte de uma família.
        </h1>
        <p className="text-body-md text-foreground-muted">
          Na próxima etapa, você poderá criar uma família ou entrar em uma existente.
        </p>
      </div>
    </main>
  )
}
