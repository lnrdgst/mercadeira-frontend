import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { Modal } from '../../../shared/components/Modal'
import { continuarCompra } from '../api/shoppingApi'
import type { AlertaContinuidadeCompraResponse, CompraResponse } from '../types/shopping'

type Props = {
  alerta?: AlertaContinuidadeCompraResponse | null
  token: string
  familiaId: string
  listaId: string
  onAtualizar?: (compra: CompraResponse) => void
}

export function AlertaContinuidadeCompraModal({ alerta, token, familiaId, listaId, onAtualizar }: Props) {
  const navigate = useNavigate()
  const [dispensado, setDispensado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const aberto = alerta?.necessario === true && !dispensado

  async function continuar() {
    setEnviando(true)
    setErro(null)
    try {
      onAtualizar?.(await continuarCompra(token, familiaId, listaId))
      setDispensado(true)
    } catch (error) {
      const falha = error as ApiRequestError
      setErro(falha.message || 'NÃ£o foi possÃ­vel confirmar a continuidade da compra.')
    } finally {
      setEnviando(false)
    }
  }

  const iniciadaEm = alerta?.iniciadaEm ? new Date(alerta.iniciadaEm) : null
  return <Modal open={aberto} onClose={() => { if (!enviando) setDispensado(true) }} closeDisabled={enviando} ariaLabelledBy="alerta-continuidade-titulo" panelClassName="max-w-md p-page">
    <div className="space-y-page">
      <div className="space-y-gutter">
        <h2 id="alerta-continuidade-titulo" className="text-headline-md font-semibold">Esta compra ainda estÃ¡ em andamento</h2>
        <p>Esta compra foi iniciada hÃ¡ mais de um dia. Deseja continuar ou seguir para o encerramento?</p>
        {iniciadaEm && !Number.isNaN(iniciadaEm.getTime()) && <p className="text-body-md text-foreground-muted">Iniciada em <time dateTime={alerta?.iniciadaEm}>{iniciadaEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>.</p>}
      </div>
      {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
      <div className="flex flex-col gap-2">
        <button type="button" disabled={enviando} onClick={() => void continuar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Confirmando...' : 'Continuar compra'}</button>
        <button type="button" disabled={enviando} onClick={() => navigate(`/listas/${listaId}/compra/revisao`)} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Encerrar compra</button>
      </div>
    </div>
  </Modal>
}
