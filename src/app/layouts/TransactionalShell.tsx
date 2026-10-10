import { useCallback, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router'
import mercadeiraLabel from '../../assets/branding/mercadeira/mercadeira-label.png'
import { useScreenWakeLock } from '../../features/shopping/hooks/useScreenWakeLock'
import { CompraTransacionalContext } from '../../features/shopping/session/CompraTransacionalContext'
import type { CompraResponse } from '../../features/shopping/types/shopping'
import { Modal } from '../../shared/components/Modal'

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
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control px-gutter text-label-lg font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 2-2.5 2.2-2.5 4" />
              <path d="M12 17h.01" />
            </svg>

            <span>Ajuda</span>
          </button>
        </header>
        <main className="mx-auto w-full max-w-5xl space-y-gutter px-page py-page">
          {statusCompra === 'EM_ANDAMENTO' && wakeLock.suportado && (
            <div className="flex flex-wrap items-center justify-between gap-gutter rounded-card border border-foreground/10 px-gutter py-2 text-body-md">
              <div>
                <p className="font-semibold">Manter tela ligada em compras</p>
                <p className="text-foreground-muted">
                  {wakeLock.preferenciaHabilitada
                    ? (wakeLock.ativo ? 'Ligada' : 'PreferÃªncia ligada; indisponÃ­vel agora.')
                    : 'Desligada'}
                </p>
              </div>
              <button
                type="button"
                role="switch" aria-label={wakeLock.preferenciaHabilitada ? 'Desligar' : 'Ligar'} aria-checked={wakeLock.preferenciaHabilitada}
                onClick={() => wakeLock.definirPreferencia(!wakeLock.preferenciaHabilitada)}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${wakeLock.preferenciaHabilitada ? 'bg-primary' : 'bg-foreground/20'}`}
              >
                <span className={`size-6 rounded-full bg-surface shadow-sm transition-transform ${wakeLock.preferenciaHabilitada ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
          <Outlet />
        </main>
        <Modal open={ajudaAberta} onClose={() => setAjudaAberta(false)} ariaLabelledBy="ajuda-compra-titulo" panelClassName="max-w-lg space-y-gutter p-page pb-[calc(var(--spacing-page)+env(safe-area-inset-bottom))] sm:pb-page">
              <div className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
                <div className="flex shrink-0 items-start justify-between gap-gutter border-b border-border bg-surface pb-gutter">
                  <h2
                    id="ajuda-compra-titulo"
                    className="text-headline-md font-semibold"
                  >
                    Como funciona esta compra
                  </h2>

                  <button
                    type="button"
                    onClick={() => setAjudaAberta(false)}
                    className="min-h-touch shrink-0 rounded-control px-gutter font-semibold text-primary"
                  >
                    Fechar
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto py-gutter">
                  <dl className="text-body-md">
                    <div className="border-b border-foreground/10 py-gutter">
                      <dt className="font-semibold text-blue-700">
                        Responsável operacional
                      </dt>
                      <dd className="text-foreground-muted">
                        Coordena a compra. Pode aprovar solicitações de presença, transferir a
                        responsabilidade para outra pessoa que esteja no mercado e executar as
                        decisões operacionais da compra.
                      </dd>
                    </div>

                    <div className="border-b border-foreground/10 py-gutter">
                      <dt className="font-semibold text-primary">
                        No mercado
                      </dt>
                      <dd className="text-foreground-muted">
                        Está fisicamente no local da compra. Pode marcar itens como colocados no
                        carrinho, restaurar itens e executar ações presenciais, mas não coordena
                        a compra nem aprova solicitações enquanto não for o responsável operacional.
                      </dd>
                    </div>

                    <div className="border-b border-foreground/10 py-gutter">
                      <dt className="font-semibold text-orange-800">
                        À distância / Remoto
                      </dt>
                      <dd className="text-foreground-muted">
                        Não está fisicamente no local. Pode acompanhar a compra, adicionar novos
                        itens pendentes e solicitar remoções, mas não pode marcar itens como
                        comprados nem executar ações presenciais.
                      </dd>
                    </div>

                    <div className="border-b border-foreground/10 py-gutter">
                      <dt className="font-semibold text-foreground-muted">
                        Presença não informada
                      </dt>
                      <dd className="text-foreground-muted">
                        Ainda não disse se está no mercado ou participando à distância. Pode
                        acompanhar a compra, mas precisa informar sua situação antes de executar
                        ações operacionais.
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
        </Modal>
      </div>
    </CompraTransacionalContext>
  )
}
