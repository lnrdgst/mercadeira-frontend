import { useNavigate } from 'react-router'
import { useFamilyContext } from '../session/familyContext'

const papelLabel = {
  ADMINISTRADOR: 'Administrador',
  MEMBRO: 'Membro',
} as const

export function FamiliaSelecionarPage() {
  const navigate = useNavigate()
  const { familias, selecionarFamilia } = useFamilyContext()

  function handleSelect(familiaId: string) {
    selecionarFamilia(familiaId)
    navigate('/inicio', { replace: true })
  }

  return (
    <main className="mx-auto max-w-xl space-y-page py-page text-foreground">
      <header className="space-y-1">
        <h1 className="text-headline-lg font-bold">Escolha uma família</h1>
        <p className="text-body-md text-foreground-muted">
          Selecione a família que deseja usar agora.
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
