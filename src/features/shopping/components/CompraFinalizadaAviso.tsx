import { Link } from 'react-router'

export function CompraFinalizadaAviso() {
  return (
    <aside
      role="status"
      aria-label="Compra finalizada. Esta compra não pode mais ser alterada."
      className="sticky top-2 z-10 rounded-control border border-primary/20 bg-primary/10 px-gutter py-2 shadow-soft backdrop-blur"
    >
      <div className="flex min-h-touch items-center justify-between gap-gutter">
        <Link to="/inicio" aria-label="Voltar para o início" className="inline-flex items-center gap-1 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span aria-hidden="true">←</span><span className="hidden sm:inline">Voltar para o início</span></Link>
        <p className="text-label-lg font-semibold text-primary">Compra finalizada</p>
      </div>
      <p className="text-body-sm text-foreground-muted">Esta compra não pode mais ser alterada.</p>
    </aside>
  )
}
