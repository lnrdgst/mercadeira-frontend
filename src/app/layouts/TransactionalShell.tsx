import { useCallback, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router'
import mercadeiraLabel from '../../assets/branding/mercadeira/mercadeira-label.png'
import { useScreenWakeLock } from '../../features/shopping/hooks/useScreenWakeLock'
import { CompraTransacionalContext } from '../../features/shopping/session/CompraTransacionalContext'
import type { CompraResponse } from '../../features/shopping/types/shopping'

export function TransactionalShell() {
  const { listaId } = useParams()
  const [estadoCompra, setEstadoCompra] = useState<{ listaId: string; status: CompraResponse['status'] | null } | null>(null)
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
    </div>
    </CompraTransacionalContext>
  )
}
