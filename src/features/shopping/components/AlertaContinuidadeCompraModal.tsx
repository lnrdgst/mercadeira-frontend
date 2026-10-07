import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { Modal } from '../../../shared/components/Modal'
import { buscarCompra, continuarCompra, encerrarCompraProlongada } from '../api/shoppingApi'
import type { AlertaContinuidadeCompraResponse, CompraResponse } from '../types/shopping'

type Props = {
  alerta?: AlertaContinuidadeCompraResponse | null
  token: string
  familiaId: string
  listaId: string
  onAtualizar: (compra: CompraResponse) => void
}

export function AlertaContinuidadeCompraModal({ alerta, token, familiaId, listaId, onAtualizar }: Props) {
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const aberto = alerta?.necessario === true

  async function continuar() {
    setEnviando(true)
    setErro(null)
    try {
      onAtualizar(await continuarCompra(token, familiaId, listaId))
    } catch (error) {
      const falha = error as ApiRequestError
      setErro(falha.message || 'Não foi possível confirmar a continuidade da compra.')
    } finally {
      setEnviando(false)
    }
  }

  async function encerrar() {
    setEnviando(true)
    setErro(null)
    try {
      onAtualizar(await encerrarCompraProlongada(token, familiaId, listaId))
      navigate('/inicio', { replace: true })
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 409) {
        try {
          const atualizada = await buscarCompra(token, familiaId, listaId)
          onAtualizar(atualizada)
          if (atualizada.status !== 'EM_ANDAMENTO') {
            navigate('/inicio', { replace: true })
            return
          }
        } catch {
          // A falha original é mais útil ao usuário que uma segunda tentativa sem contexto.
        }
      }
      setErro(falha.message || 'Não foi possível encerrar esta compra.')
    } finally {
      setEnviando(false)
    }
  }

  const iniciadaEm = alerta?.iniciadaEm ? new Date(alerta.iniciadaEm) : null
  return <Modal open={aberto} onClose={() => undefined} closeDisabled={enviando} dismissible={false} ariaLabelledBy="alerta-continuidade-titulo" panelClassName="max-w-md p-page">
    <div className="space-y-page">
      <div className="space-y-gutter">
        <h2 id="alerta-continuidade-titulo" className="text-headline-md font-semibold">Esta compra ainda está em andamento</h2>
        <p>Esta compra foi iniciada há mais de um dia. Deseja continuar ou encerrá-la?</p>
        {iniciadaEm && !Number.isNaN(iniciadaEm.getTime()) && <p className="text-body-md text-foreground-muted">Iniciada em <time dateTime={alerta?.iniciadaEm}>{iniciadaEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>.</p>}
      </div>
      {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
      <div className="flex flex-col gap-2">
        <button type="button" disabled={enviando} onClick={() => void continuar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Confirmando...' : 'Continuar compra'}</button>
        <button type="button" disabled={enviando} onClick={() => void encerrar()} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Encerrar esta compra</button>
      </div>
    </div>
  </Modal>
}
