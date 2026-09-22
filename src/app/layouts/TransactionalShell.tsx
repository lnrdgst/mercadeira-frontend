import { Outlet } from 'react-router'
import mercadeiraLabel from '../../assets/branding/mercadeira/mercadeira-label.png'

export function TransactionalShell() {
  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-gutter px-page pt-gutter">
        <img
          src={mercadeiraLabel}
          alt="Mercadeira — Listas que aproximam"
          className="w-full max-w-[180px] sm:max-w-[220px] lg:ml-25"
        />
      </header>
      <main className="mx-auto w-full max-w-5xl px-page py-page">
        <Outlet />
      </main>
    </div>
  )
}
