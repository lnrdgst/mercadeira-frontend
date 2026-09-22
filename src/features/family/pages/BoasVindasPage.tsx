import { useNavigate } from 'react-router'
import boasVindas from '../../../assets/branding/mercadeira/boas-vindas.png'

const beneficios = [
  {
    titulo: 'Crie suas listas',
    descricao: 'Organize o que precisa de forma rápida e prática.',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    titulo: 'Compartilhe com sua família',
    descricao: 'Todos na mesma lista, sempre atualizada.',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15 15.5a4.5 4.5 0 0 1 5.5 3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    titulo: 'Faça compras com mais tranquilidade',
    descricao: 'Mais organização e menos imprevistos.',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 5h2l1.2 9.2a2 2 0 0 0 2 1.8h6.6a2 2 0 0 0 2-1.6L20 8H8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10.5" cy="19" r="1" />
        <circle cx="17" cy="19" r="1" />
      </svg>
    ),
  },
]

export function BoasVindasPage() {
  const navigate = useNavigate()

  return (
    <main className="min-h-[100svh] bg-background px-page py-page text-foreground sm:flex sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-3xl space-y-page text-center">
        <header className="space-y-gutter">
          <img src={boasVindas} alt="" className="mx-auto w-full max-w-[260px] sm:max-w-sm" />
          <div className="space-y-2">
            <h1 className="text-headline-lg font-bold">Boas vindas ao Mercadeira!</h1>
            <p className="mx-auto max-w-xl text-body-md text-foreground-muted">
              Organize suas compras, compartilhe com sua família e torne o dia a dia mais simples.
            </p>
          </div>
        </header>

        <section className="rounded-card bg-primary/10 p-page text-left">
          <ul className="grid gap-page sm:grid-cols-3">
            {beneficios.map((beneficio) => (
              <li key={beneficio.titulo} className="flex gap-gutter sm:flex-col sm:items-center sm:text-center">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 p-2 text-primary">
                  {beneficio.icone}
                </span>
                <div className="space-y-1">
                  <h2 className="text-label-lg font-semibold">{beneficio.titulo}</h2>
                  <p className="text-body-sm text-foreground-muted">{beneficio.descricao}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="mx-auto w-full max-w-md space-y-gutter">
          <button
            type="button"
            onClick={() => navigate('/familia/entrada')}
            className="min-h-touch w-full rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Começar agora
          </button>
          <p className="text-body-md text-foreground-muted">
            Boas compras e ótimos momentos em família! <span className="text-primary">♥</span>
          </p>
        </div>
      </div>
    </main>
  )
}
