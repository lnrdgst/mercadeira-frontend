import { useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { unidadeMedidaLabels } from '../../shopping-lists/types/shoppingList'
import type { AcaoRemocaoItemCompra, ItemCompraResponse } from '../types/shopping'

const statusLabels: Record<ItemCompraResponse['status'], string> = {
  PENDENTE: 'Pendente',
  NO_CARRINHO: '✓ No carrinho',
  REMOCAO_SOLICITADA: 'Remoção solicitada',
  REMOVIDO: 'Removido',
}

const acaoLabels = {
  colocar: 'Colocar no carrinho',
  'solicitar-remocao': 'Solicitar remoção',
  'aprovar-remocao': 'Aprovar remoção',
  'rejeitar-remocao': 'Rejeitar remoção',
}

function DataAutoria({ valor }: { valor: string | null }) {
  return valor ? <> · <time dateTime={valor}>{new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></> : null
}

type ItemCompraCardProps = { item: ItemCompraResponse } & ({
  somenteLeitura: true
  participante?: never
  onColocar?: never
  onRemover?: never
  onReconciliar?: never
} | {
  somenteLeitura?: false
  participante: boolean
  onColocar: (itemId: string) => Promise<void>
  onRemover: (itemId: string, acao: AcaoRemocaoItemCompra) => Promise<void>
  onReconciliar: (itemId: string) => Promise<void>
})

export function ItemCompraCard({ item, somenteLeitura, participante, onColocar, onRemover, onReconciliar }: ItemCompraCardProps) {
  const { logout } = useSession()
  const enviandoRef = useRef(false)
  const [enviando, setEnviando] = useState<keyof typeof acaoLabels | 'atualizar' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false)
  const noCarrinho = item.status === 'NO_CARRINHO'
  const remocaoPendente = item.status === 'REMOCAO_SOLICITADA'
  const removido = item.status === 'REMOVIDO'
  const acoes: (keyof typeof acaoLabels)[] = []
  if (!somenteLeitura) {
    if (participante && item.status === 'PENDENTE') acoes.push('colocar')
    if (item.acoes.podeSolicitarRemocao === true) acoes.push('solicitar-remocao')
    if (item.acoes.podeDecidirRemocao === true) acoes.push('aprovar-remocao', 'rejeitar-remocao')
  }

  async function executar(acao: keyof typeof acaoLabels | 'atualizar') {
    if (somenteLeitura || enviandoRef.current || (acao !== 'atualizar' && (precisaAtualizar || !acoes.includes(acao)))) return
    enviandoRef.current = true
    setEnviando(acao)
    setErro(null)
    try {
      if (acao === 'atualizar') { await onReconciliar(item.id); setPrecisaAtualizar(false) }
      else if (acao === 'colocar') await onColocar(item.id)
      else await onRemover(item.id, acao)
    }
    catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) logout()
      else if (apiError.status === 409 && acao !== 'atualizar') {
        setErro(apiError.message || 'O estado deste item mudou. Atualizando os dados da compra.')
        setPrecisaAtualizar(true)
        try {
          await onReconciliar(item.id)
          setPrecisaAtualizar(false)
          setErro(`${apiError.message || 'Houve um conflito de estado.'} O item foi atualizado com os dados do servidor.`)
        } catch (reconciliacaoError) {
          const falha = reconciliacaoError as ApiRequestError
          if (falha.status === 401) logout()
          else setErro(`${apiError.message || 'Houve um conflito de estado.'} Não foi possível atualizar o item. ${falha.message} Tente atualizar novamente.`)
        }
      } else setErro(apiError.message || 'Não foi possível concluir a ação neste item.')
    } finally { enviandoRef.current = false; setEnviando(null) }
  }

  return <li aria-busy={enviando !== null} className={`space-y-gutter rounded-card border p-page shadow-soft ${remocaoPendente ? 'border-warning/30 bg-warning/5' : removido ? 'border-foreground/10 bg-foreground/5' : noCarrinho ? 'border-primary/20 bg-primary/5' : 'border-foreground/10 bg-surface'}`}>
    <div className="flex flex-wrap items-start justify-between gap-gutter">
      <div className="min-w-0 flex-1 space-y-1 break-words">
        <h3 className={`text-body-lg font-semibold ${removido ? 'text-foreground-muted line-through' : ''}`}>{item.descricao}</h3>
        {(item.quantidade !== null || item.unidadeMedida) && <p className="text-body-md text-foreground-muted">{item.quantidade?.toLocaleString('pt-BR')}{item.unidadeMedida && ` ${unidadeMedidaLabels[item.unidadeMedida]}`}</p>}
        {item.marca && <p className="text-body-md text-foreground-muted">{item.marca}</p>}
        {item.observacoes && <p className="whitespace-pre-wrap text-label-lg text-foreground-muted">{item.observacoes}</p>}
      </div>
      <span role="status" className={`rounded-full px-gutter py-1 text-label-md font-semibold ${remocaoPendente ? 'bg-warning/10 text-warning' : noCarrinho ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground-muted'}`}>{statusLabels[item.status]}</span>
    </div>
    {(item.adicionadoPor || item.colocadoNoCarrinhoPor) && <div className="space-y-1 break-words text-label-md text-foreground-muted">
      {item.adicionadoDuranteCompra && item.adicionadoPor && <p>Adicionado por {item.adicionadoPor.nome}<DataAutoria valor={item.adicionadoEm} /></p>}
      {item.colocadoNoCarrinhoPor && <p>Colocado no carrinho por {item.colocadoNoCarrinhoPor.nome}<DataAutoria valor={item.colocadoNoCarrinhoEm} /></p>}
    </div>}
    {item.remocao && <div className="space-y-1 break-words text-label-md text-foreground-muted">
      <p>Remoção solicitada por {item.remocao.solicitadaPor.nome}<DataAutoria valor={item.remocao.solicitadaEm} /></p>
      {item.remocao.decisao && <p>Remoção {item.remocao.decisao === 'APROVADA' ? 'aprovada' : 'rejeitada'}{item.remocao.decididaPor && ` por ${item.remocao.decididaPor.nome}`}<DataAutoria valor={item.remocao.decididaEm} /></p>}
    </div>}
    {erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
    {enviando && <p role="status" className="text-label-lg text-foreground-muted">{enviando === 'atualizar' ? 'Atualizando item...' : `${acaoLabels[enviando]}: processando...`}</p>}
    {precisaAtualizar && <button type="button" disabled={enviando !== null} onClick={() => void executar('atualizar')} className="min-h-touch rounded-control border border-current px-page font-semibold disabled:opacity-60">Atualizar item</button>}
    {acoes.length > 0 && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {acoes.map((acao) => <button key={acao} type="button" disabled={enviando !== null || precisaAtualizar} onClick={() => void executar(acao)} aria-label={`${acaoLabels[acao]}: ${item.descricao}`} className={`min-h-touch rounded-control border px-page font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${acao === 'aprovar-remocao' ? 'border-error text-error' : 'border-primary text-primary'}`}>{acaoLabels[acao]}</button>)}
    </div>}
  </li>
}
