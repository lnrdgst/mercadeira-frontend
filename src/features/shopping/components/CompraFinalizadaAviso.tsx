export function CompraFinalizadaAviso() {
  return (
    <aside
      role="status"
      aria-label="Compra finalizada. Esta compra não pode mais ser alterada."
      className="sticky top-2 z-10 rounded-control border border-primary/20 bg-primary/10 px-gutter py-2 shadow-soft backdrop-blur"
    >
      <p className="text-label-lg font-semibold text-primary">Compra finalizada</p>
      <p className="text-body-sm text-foreground-muted">Esta compra não pode mais ser alterada.</p>
    </aside>
  )
}
