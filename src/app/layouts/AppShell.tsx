import { NavLink, Outlet } from 'react-router'
import { useSession } from '../../features/auth/session/sessionContext'

const navigationItems = [
  { to: '/inicio', label: 'Início' },
  { to: '/listas', label: 'Listas' },
  { to: '/familia', label: 'Família' },
  { to: '/historico', label: 'Histórico' },
]

export function AppShell() {
  const { logout } = useSession()

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl justify-end px-page pt-gutter">
        <button
          type="button"
          onClick={logout}
          className="min-h-touch rounded-control px-gutter text-label-lg font-semibold text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sair da conta
        </button>
      </header>
      <main className="mx-auto w-full max-w-5xl px-page pt-page pb-[calc(var(--spacing-touch)+var(--spacing-gutter)+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 border-t border-foreground/10 bg-surface/95 px-gutter pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
      >
        <ul className="mx-auto grid w-full max-w-5xl grid-cols-4 gap-1">
          {navigationItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-touch items-center justify-center rounded-control border-b-2 px-2 text-label-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isActive
                      ? 'border-primary bg-primary/10 font-semibold text-primary'
                      : 'border-transparent text-foreground-muted hover:bg-primary/5 hover:text-foreground'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
