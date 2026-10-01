import { NavLink, Outlet } from 'react-router'
import { useState } from 'react'
import { useSession } from '../../features/auth/session/sessionContext'
import mercadeiraLabel from '../../assets/branding/mercadeira/mercadeira-label.png'
import { Modal } from '../../shared/components/Modal'
import { useAuthenticatedUser } from '../../features/auth/user/AuthenticatedUserContext'

const navigationItems = [
  { to: '/inicio', label: 'Início' },
  { to: '/listas', label: 'Listas' },
  { to: '/familia', label: 'Família' },
]

export function AppShell() {
  const { logout } = useSession()
  const { usuario } = useAuthenticatedUser()
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-gutter px-page pt-gutter">
        <img
          src={mercadeiraLabel}
          alt="Mercadeira — Listas que aproximam"
          className="w-full max-w-[180px] sm:max-w-[220px] lg:ml-25"
        />

        <button
          type="button"
          aria-label="Abrir menu da conta"
          onClick={() => setMenuAberto(true)}
          className="min-h-touch shrink-0 rounded-control px-gutter text-label-lg font-semibold text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </header>
      <Modal open={menuAberto} onClose={() => setMenuAberto(false)} ariaLabel="Menu da conta" panelClassName="fixed right-0 top-0 m-0 flex h-[100dvh] w-[85vw] max-w-sm flex-col rounded-none p-page pb-[calc(var(--spacing-page)+env(safe-area-inset-bottom))]">
        <div className="border-b border-foreground/10 pb-gutter"><div className="flex items-start justify-between gap-gutter"><div><p className="font-semibold text-primary">{usuario?.nome ?? 'Minha conta'}</p>{usuario?.email && <p className="text-body-sm text-primary">{usuario.email}</p>}</div><button type="button" aria-label="Recolher menu da conta" onClick={() => setMenuAberto(false)} className="min-h-touch min-w-touch text-foreground-muted"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button></div></div>
        <nav className="mt-page space-y-1"><NavLink to="/minha-conta" onClick={() => setMenuAberto(false)} className="flex min-h-touch items-center gap-3 rounded-control px-gutter py-2 font-semibold text-foreground"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>Minha conta</NavLink><a href="mailto:suporte@mercadeira.app" className="flex min-h-touch items-center gap-3 rounded-control px-gutter py-2 font-semibold text-foreground"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.3 1.1-1.7 1.5-1.7 3.2" /><path d="M12 17h.01" /></svg>Fale conosco</a></nav>
        <button type="button" onClick={logout} className="mt-auto flex min-h-touch items-center gap-3 border-t border-foreground/10 pt-page text-left font-semibold text-error"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2"><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 4h5v16h-5" /></svg>Sair da conta</button>
      </Modal>
      <main className="mx-auto w-full max-w-5xl px-page pt-page pb-[calc(var(--spacing-touch)+var(--spacing-gutter)+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 border-t border-foreground/10 bg-surface/95 px-gutter pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
      >
        <ul className="mx-auto grid w-full max-w-5xl grid-cols-3 gap-1">
          {navigationItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-touch items-center justify-center rounded-control border-b-2 px-2 text-label-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isActive
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
