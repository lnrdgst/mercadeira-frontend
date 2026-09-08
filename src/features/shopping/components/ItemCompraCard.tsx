import { useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { unidadeMedidaLabels } from '../../shopping-lists/types/shoppingList'
import type { ItemCompraResponse } from '../types/shopping'

function DataAutoria({ valor }: { valor: string | null }) {
  return valor ? <> · <time dateTime={valor}>{new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></> : null
}

export function ItemCompraCard({ item, participante, onColocar }: {
  item: ItemCompraResponse
  participante: boolean
  onColocar: (itemId: string) => Promise<void>
}) {
  const { logout } = useSession()
  const enviandoRef = useRef(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const noCarrinho = item.status === 'NO_CARRINHO'

  async function colocar() {
    if (!participante || noCarrinho || enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    try { await onColocar(item.id) }
    catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) logout()
      else setErro(apiError.message || 'Não foi possível colocar este item no carrinho.')
    } finally { enviandoRef.current = false; setEnviando(false) }
  }

  return <li className={`space-y-gutter rounded-card border p-page shadow-soft ${noCarrinho ? 'border-primary/20 bg-primary/5' : 'border-foreground/10 bg-surface'}`}>
    <div className="flex flex-wrap items-start justify-between gap-gutter">
      <div className="min-w-0 flex-1 space-y-1 break-words">
        <h3 className="text-body-lg font-semibold">{item.descricao}</h3>
        {(item.quantidade !== null || item.unidadeMedida) && <p className="text-body-md text-foreground-muted">{item.quantidade?.toLocaleString('pt-BR')}{item.unidadeMedida && ` ${unidadeMedidaLabels[item.unidadeMedida]}`}</p>}
        {item.marca && <p className="text-body-md text-foreground-muted">{item.marca}</p>}
        {item.observacoes && <p className="whitespace-pre-wrap text-label-lg text-foreground-muted">{item.observacoes}</p>}
      </div>
      <span role="status" className={`rounded-full px-gutter py-1 text-label-md font-semibold ${noCarrinho ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground-muted'}`}>{noCarrinho ? '✓ No carrinho' : 'Pendente'}</span>
    </div>
    {(item.adicionadoPor || item.colocadoNoCarrinhoPor) && <div className="space-y-1 break-words text-label-md text-foreground-muted">
      {item.adicionadoDuranteCompra && item.adicionadoPor && <p>Adicionado por {item.adicionadoPor.nome}<DataAutoria valor={item.adicionadoEm} /></p>}
      {noCarrinho && item.colocadoNoCarrinhoPor && <p>Colocado no carrinho por {item.colocadoNoCarrinhoPor.nome}<DataAutoria valor={item.colocadoNoCarrinhoEm} /></p>}
    </div>}
    {erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
    {participante && !noCarrinho && <button type="button" disabled={enviando} onClick={() => void colocar()} aria-label={`Colocar ${item.descricao} no carrinho`} className="min-h-touch w-full rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60 sm:w-auto">{enviando ? 'Colocando no carrinho...' : 'Colocar no carrinho'}</button>}
  </li>
}
