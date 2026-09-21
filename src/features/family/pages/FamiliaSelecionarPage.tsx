import { Link, useNavigate } from 'react-router'
import { useSession } from '../../auth/session/sessionContext'
import { useFamilyContext } from '../session/familyContext'

const papelLabel = {
  ADMINISTRADOR: 'Administrador',
  MEMBRO: 'Membro',
} as const

export function FamiliaSelecionarPage() {
  const navigate = useNavigate()
  const { logout } = useSession()
  const { familias, selecionarFamilia } = useFamilyContext()

  function handleSelect(familiaId: string) {
    selecionarFamilia(familiaId)
    navigate('/inicio', { replace: true })
  }

  return (
  <main className="mx-auto max-w-xl space-y-page py-page text-foreground">
    <div className="flex items-center justify-between space-y-1">
      <Link
        to={`/inicio`}
        className="inline-flex min-h-touch items-center gap-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 fill-none stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>

        Página inicial
      </Link>

      <button
        type="button"
        onClick={logout}
        className="min-h-touch rounded-control px-page text-label-lg font-semibold text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Sair da conta
      </button>
    </div>

    <header className="space-y-1">
      <h1 className="text-headline-lg font-bold">Escolha uma família</h1>
      <p className="text-body-md text-foreground-muted">
        Escolha abaixo a família que deseja acompanhar.
      </p>
    </header>

      <ul className="space-y-gutter">
        {familias.map((familia) => (
          <li key={familia.id}>
            <button
              type="button"
              onClick={() => handleSelect(familia.id)}
              className="w-full rounded-card border border-foreground/20 bg-surface p-page text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <p className="text-label-lg font-semibold">{familia.nome}</p>
              <p className="mt-1 text-body-md text-foreground-muted">
                {papelLabel[familia.papel]}
              </p>
            </button>
          </li>
        ))}
      </ul>

    </main>
  )
}
