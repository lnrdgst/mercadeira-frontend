import { useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { unidadeMedidaLabels } from '../../shopping-lists/types/shoppingList'
import type { CompraResponse } from '../types/shopping'

export function SolicitacoesItensCompra({ compra, usuarioId, bloqueada, onDecidir }: {
  compra: CompraResponse
  usuarioId?: string
  bloqueada: boolean
  onDecidir: (id: string, decisao: 'aprovar' | 'recusar') => Promise<void>
}) {
  const { logout } = useSession()
  const enviando = useRef(false)
  const [decidindo, setDecidindo] = useState<string | null>(null)
  const [erro, setErro] = useState<{ id: string; mensagem: string } | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const podeDecidir = compra.contextoUsuario.podeDecidirSolicitacoesItens === true
  const proprioId = compra.participantes.find((participante) => participante.usuarioId === usuarioId)?.id
  const pedidos = (compra.solicitacoesItensPendentes ?? []).filter((pedido) => pedido.status === 'PENDENTE' && (podeDecidir || pedido.solicitante.id === proprioId))

  async function decidir(id: string, decisao: 'aprovar' | 'recusar') {
    if (enviando.current || bloqueada || !podeDecidir) return
    enviando.current = true
    setDecidindo(id)
    setErro(null)
    setMensagem(null)
    try {
      await onDecidir(id, decisao)
      setMensagem(decisao === 'aprovar' ? 'Solicitação aprovada.' : 'Solicitação recusada.')
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) logout()
      else setErro({ id, mensagem: falha.message || 'Não foi possível decidir a solicitação.' })
    } finally { enviando.current = false; setDecidindo(null) }
  }

  if (!pedidos.length && !mensagem) return null
  return <section aria-label="Solicitações de novos itens" className="space-y-gutter rounded-card border border-primary/20 bg-primary/5 p-page">
    {pedidos.length > 0 && <>
      <h2 className="text-headline-md font-semibold text-primary">{podeDecidir ? 'Novos itens solicitados' : 'Meus itens solicitados'}</h2>
      <ul className="space-y-gutter">
        {pedidos.map((pedido) => <li key={pedido.id} className="space-y-2 rounded-control bg-surface p-gutter" aria-busy={decidindo === pedido.id}>
          <p className="text-label-md font-semibold text-primary">{podeDecidir ? 'Novo item solicitado' : 'Aguardando aprovação'}</p>
          <p className="break-words font-semibold">{pedido.descricao}</p>
          {(pedido.quantidade !== null || pedido.unidadeMedida !== null) && <p className="text-foreground-muted">{pedido.quantidade?.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}{pedido.unidadeMedida ? ` ${unidadeMedidaLabels[pedido.unidadeMedida]}` : ''}</p>}
          {podeDecidir && <>
            <p className="break-words text-foreground-muted">Solicitado por {pedido.solicitante.nome}</p>
            <div className="grid grid-cols-2 gap-gutter">
              <button type="button" disabled={bloqueada || decidindo !== null} onClick={() => void decidir(pedido.id, 'recusar')} className="min-h-touch rounded-control border border-primary px-gutter font-semibold text-primary disabled:opacity-60">Recusar</button>
              <button type="button" disabled={bloqueada || decidindo !== null} onClick={() => void decidir(pedido.id, 'aprovar')} className="min-h-touch rounded-control bg-primary px-gutter font-semibold text-surface disabled:opacity-60">Aprovar</button>
            </div>
          </>}
          {decidindo === pedido.id && <p role="status" className="text-label-md text-foreground-muted">Atualizando solicitação...</p>}
          {erro?.id === pedido.id && <p role="alert" className="text-error">{erro.mensagem}</p>}
        </li>)}
      </ul>
    </>}
    {mensagem && <p role="status">{mensagem}</p>}
  </section>
}
