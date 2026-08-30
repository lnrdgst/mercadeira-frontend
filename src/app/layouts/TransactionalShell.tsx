import { Outlet } from 'react-router'

export function TransactionalShell() {
  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <header className="border-b border-foreground/10 bg-surface px-page py-gutter">
        <div className="mx-auto max-w-5xl text-label-lg font-semibold text-foreground-muted">
          Compra
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-page py-page">
        <Outlet />
      </main>
    </div>
  )
}
