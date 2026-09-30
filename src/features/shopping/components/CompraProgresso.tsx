import { useMemo, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { ItemCompraResponse } from '../types/shopping'

type Props = {
  itens: ItemCompraResponse[]
}

export function CompraProgresso({ itens }: Props) {
  const [revisaoAberta, setRevisaoAberta] = useState(false)
  const progresso = useMemo(() => {
    const noCarrinho = itens.filter((item) => item.status === 'NO_CARRINHO').length
    const removidos = itens.filter((item) => item.status === 'REMOVIDO').length
    const total = itens.length
    const resolvidos = noCarrinho + removidos
    const percentual = total > 0 ? Math.round((resolvidos / total) * 100) : 0
    return { noCarrinho, removidos, total, resolvidos, percentual }
  }, [itens])
  const concluida = progresso.total > 0 && progresso.resolvidos === progresso.total

  return (
    <>
      <section
        aria-label={`${progresso.resolvidos} de ${progresso.total} itens resolvidos, ${progresso.percentual} por cento`}
        className="sticky top-2 z-10 flex min-w-0 items-center gap-3 rounded-control border border-foreground/10 bg-background/95 px-gutter py-2 shadow-soft backdrop-blur"
      >
        <div
          role="progressbar"
          aria-label={`${progresso.resolvidos} de ${progresso.total} itens resolvidos, ${progresso.percentual} por cento`}
          aria-valuemin={0}
          aria-valuemax={progresso.total}
          aria-valuenow={progresso.resolvidos}
          aria-valuetext={`${progresso.resolvidos} de ${progresso.total} itens resolvidos, ${progresso.percentual} por cento`}
          className="h-2 min-w-12 flex-1 overflow-hidden rounded-full bg-foreground/10"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progresso.percentual}%` }}
          />
        </div>

        <p className="shrink-0 text-label-lg font-semibold tabular-nums">
          {progresso.resolvidos} de {progresso.total} <span className="text-foreground-muted">{`• ${progresso.percentual}%`}</span>
        </p>

        {concluida && (
          <button
            type="button"
            onClick={() => setRevisaoAberta(true)}
            className="min-h-touch shrink-0 rounded-control px-gutter text-label-lg font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Revisar
          </button>
        )}
      </section>

      <Modal
        open={revisaoAberta}
        onClose={() => setRevisaoAberta(false)}
        ariaLabelledBy="compra-pronta-revisao-titulo"
        panelClassName="max-w-md p-page pb-[calc(var(--spacing-page)+env(safe-area-inset-bottom))] sm:pb-page"
      >
        <div className="space-y-gutter">
          <div className="flex items-start justify-between gap-gutter">
            <h2 id="compra-pronta-revisao-titulo" className="text-headline-md font-semibold">
              Compra pronta para revisão
            </h2>
            <button
              type="button"
              onClick={() => setRevisaoAberta(false)}
              className="min-h-touch shrink-0 rounded-control px-gutter font-semibold text-primary hover:bg-primary/5"
            >
              Fechar
            </button>
          </div>

          <div className="space-y-1 text-body-md text-foreground-muted">
            <p>{progresso.noCarrinho} {progresso.noCarrinho === 1 ? 'item no carrinho' : 'itens no carrinho'}</p>
            {progresso.removidos > 0 && <p>{progresso.removidos} {progresso.removidos === 1 ? 'item removido' : 'itens removidos'}</p>}
            <p>Nenhum item pendente</p>
          </div>

          <p className="font-semibold text-primary">Você já pode ir ao caixa.</p>

          <button
            type="button"
            onClick={() => setRevisaoAberta(false)}
            className="min-h-touch w-full rounded-control border border-foreground/20 px-page font-semibold"
          >
            Continuar comprando
          </button>
        </div>
      </Modal>
    </>
  )
}
