import { useCallback, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router'
import mercadeiraLabel from '../../assets/branding/mercadeira/mercadeira-label.png'
import { useScreenWakeLock } from '../../features/shopping/hooks/useScreenWakeLock'
import { CompraTransacionalContext } from '../../features/shopping/session/CompraTransacionalContext'
import type { CompraResponse } from '../../features/shopping/types/shopping'

export function TransactionalShell() {
  const { listaId } = useParams()
  const [estadoCompra, setEstadoCompra] = useState<{ listaId: string; status: CompraResponse['status'] | null } | null>(null)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const statusCompra = estadoCompra && estadoCompra.listaId === listaId ? estadoCompra.status : null
  const wakeLock = useScreenWakeLock(statusCompra === 'EM_ANDAMENTO')
  const atualizarStatusCompra = useCallback((idLista: string, status: CompraResponse['status'] | null) => {
    setEstadoCompra({ listaId: idLista, status })
  }, [])
  const contextoCompra = useMemo(() => ({ statusCompra, atualizarStatusCompra }), [atualizarStatusCompra, statusCompra])

  return (
    <CompraTransacionalContext value={contextoCompra}>
    <div className="min-h-[100svh] bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-gutter px-page pt-gutter">
        <img
          src={mercadeiraLabel}
          alt="Mercadeira — Listas que aproximam"
          className="w-full max-w-[180px] sm:max-w-[220px] lg:ml-25"
        />
        <button
          type="button"
          onClick={() => setAjudaAberta(true)}
          className="min-h-touch rounded-control px-gutter text-label-lg font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ajuda
        </button>
      </header>
      <main className="mx-auto w-full max-w-5xl space-y-gutter px-page py-page">
        {statusCompra === 'EM_ANDAMENTO' && wakeLock.suportado && (
          <div className="flex flex-wrap items-center justify-between gap-gutter rounded-card border border-foreground/10 px-gutter py-2 text-body-md">
            <div>
              <p className="font-semibold">Manter tela ligada</p>
              <p className="text-foreground-muted">
                {wakeLock.preferenciaHabilitada
                  ? (wakeLock.ativo ? 'Ligada' : 'PreferÃªncia ligada; indisponÃ­vel agora.')
                  : 'Desligada'}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={wakeLock.preferenciaHabilitada}
              onClick={() => wakeLock.definirPreferencia(!wakeLock.preferenciaHabilitada)}
              className="min-h-touch rounded-control border border-primary px-gutter text-label-md font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {wakeLock.preferenciaHabilitada ? 'Desligar' : 'Ligar'}
            </button>
          </div>
        )}
        <Outlet />
      </main>
      {ajudaAberta && (
        <div role="dialog" aria-modal="true" aria-labelledby="ajuda-compra-titulo" className="fixed inset-0 z-50 flex items-end bg-foreground/40 sm:items-center sm:justify-center sm:p-page">
          <section className="w-full max-w-lg space-y-gutter rounded-t-card bg-surface p-page pb-[calc(theme(spacing.page)+env(safe-area-inset-bottom))] shadow-soft sm:rounded-card sm:pb-page">
            <div className="flex items-start justify-between gap-gutter">
              <h2 id="ajuda-compra-titulo" className="text-headline-md font-semibold">Como funciona esta compra</h2>
              <button type="button" onClick={() => setAjudaAberta(false)} className="min-h-touch rounded-control px-gutter font-semibold text-primary">Fechar</button>
            </div>
            <dl className="space-y-gutter text-body-md">
              <div><dt className="font-semibold text-blue-700">Responsável operacional</dt><dd className="text-foreground-muted">É a pessoa de referência operacional desta compra e assume as responsabilidades previstas para essa função.</dd></div>
              <div><dt className="font-semibold text-primary">No mercado</dt><dd className="text-foreground-muted">Indica quem está participando presencialmente da compra.</dd></div>
              <div><dt className="font-semibold text-foreground-muted">Remoto</dt><dd className="text-foreground-muted">Indica quem está acompanhando a compra sem estar fisicamente no mercado.</dd></div>
              <div><dt className="font-semibold">Administrador da família</dt><dd className="text-foreground-muted">Administra a família, mas não recebe automaticamente poderes operacionais na compra.</dd></div>
            </dl>
          </section>
        </div>
      )}
    </div>
    </CompraTransacionalContext>
  )
}
