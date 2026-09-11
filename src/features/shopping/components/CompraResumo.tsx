import type { CompraResponse, ItemCompraResponse } from '../types/shopping'
import { ItemCompraCard } from './ItemCompraCard'

const grupos: { status: ItemCompraResponse['status']; titulo: string }[] = [
  { status: 'NO_CARRINHO', titulo: 'Comprados' },
  { status: 'PENDENTE', titulo: 'Não comprados' },
  { status: 'REMOVIDO', titulo: 'Removidos' },
  { status: 'REMOCAO_SOLICITADA', titulo: 'Remoção pendente' },
]

export function CompraResumo({ compra }: { compra: CompraResponse }) {
  const finalizada = compra.status === 'FINALIZADA'
  const pendentes = compra.itens.filter((item) => item.status === 'PENDENTE').length
  const remocoesPendentes = compra.itens.some((item) => item.status === 'REMOCAO_SOLICITADA')
  return <div className="space-y-page">
    {finalizada && <div role="status" className="space-y-1 rounded-card border border-primary/20 bg-primary/5 p-page">
      <p className="text-headline-md font-semibold text-primary">Compra finalizada</p>
      {compra.finalizadaPor && <p className="break-words">Finalizada por {compra.finalizadaPor.nome}</p>}
      {compra.finalizadaEm && <p className="text-label-lg text-foreground-muted"><time dateTime={compra.finalizadaEm}>{new Date(compra.finalizadaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></p>}
      <p className="text-body-md text-foreground-muted">Os itens desta compra não podem mais ser alterados.</p>
    </div>}
    <section aria-labelledby="resumo-contagens" className="space-y-gutter">
      <h2 id="resumo-contagens" className="text-headline-md font-semibold">Resumo dos itens · {compra.itens.length}</h2>
      <dl className="grid grid-cols-2 gap-gutter">
        {grupos.map(({ status, titulo }) => <div key={status} className={`rounded-card border p-page ${status === 'REMOCAO_SOLICITADA' ? 'border-warning/20 bg-warning/5' : 'border-foreground/10 bg-surface'}`}>
          <dt className="text-label-lg text-foreground-muted">{titulo}</dt>
          <dd className="text-headline-lg font-bold">{compra.itens.filter((item) => item.status === status).length}</dd>
        </div>)}
      </dl>
    </section>
    {!finalizada && pendentes > 0 && <p className="rounded-card bg-warning/10 p-page text-warning">{pendentes === 1 ? 'Existe 1 item pendente. Ele permanecerá registrado como não comprado ao finalizar.' : `Existem ${pendentes} itens pendentes. Eles permanecerão registrados como não comprados ao finalizar.`}</p>}
    {!finalizada && remocoesPendentes && <p role="alert" className="rounded-card border border-warning/30 bg-warning/10 p-page text-warning">Existem solicitações de remoção pendentes. Volte à compra e resolva-as antes de finalizar.</p>}
    {compra.itens.length === 0 && <p className="text-foreground-muted">Esta compra não possui itens.</p>}
    {grupos.map(({ status, titulo }) => {
      const itens = compra.itens.filter((item) => item.status === status).sort((a, b) => a.ordemExibicao - b.ordemExibicao)
      return itens.length > 0 && <section key={status} aria-labelledby={`grupo-${status}`} className="space-y-gutter">
        <h2 id={`grupo-${status}`} className="text-headline-md font-semibold">{titulo} ({itens.length})</h2>
        <ul className="space-y-gutter">{itens.map((item) => <ItemCompraCard key={item.id} item={item} somenteLeitura />)}</ul>
      </section>
    })}
  </div>
}
