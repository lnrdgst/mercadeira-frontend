import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import type { ParticipanteListaResponse } from '../../shopping-lists/types/shoppingList'
import { useSession } from '../../auth/session/sessionContext'
import { iniciarCompra } from '../api/shoppingApi'

type Props = { familiaId: string; listaId: string; participantes: ParticipanteListaResponse[]; iniciadorMembroFamiliaId: string; disabled?: boolean; onMutacao?: (emAndamento: boolean) => void }

export function IniciarCompraButton({ familiaId, listaId, participantes, iniciadorMembroFamiliaId, disabled = false, onMutacao }: Props) {
  const { auth, logout } = useSession()
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const enviandoRef = useRef(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [selecionados, setSelecionados] = useState<string[]>([])

  async function confirmar() {
    if (!auth || enviandoRef.current || disabled) return
    enviandoRef.current = true; onMutacao?.(true); setEnviando(true); setErro(null)
    try { await iniciarCompra(auth.token, familiaId, listaId, selecionados); dialogRef.current?.close(); setSelecionados([]); navigate(`/listas/${listaId}/compra`) }
    catch (error) { const apiError = error as ApiRequestError; if (apiError.status === 401) logout(); else setErro(apiError.message || 'Não foi possível iniciar a compra.') }
    finally { enviandoRef.current = false; onMutacao?.(false); setEnviando(false) }
  }

  return <>
    <button ref={buttonRef} type="button" disabled={disabled || enviando} onClick={() => { setErro(null); setSelecionados([]); dialogRef.current?.showModal() }} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:cursor-not-allowed disabled:bg-foreground/5 disabled:text-foreground-muted">Iniciar compra</button>
    <dialog ref={dialogRef} aria-labelledby="iniciar-compra-titulo" aria-describedby="iniciar-compra-descricao" onCancel={(event) => { if (enviandoRef.current) event.preventDefault() }} onClose={() => buttonRef.current?.focus({ preventScroll: true })} className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40">
      <div className="space-y-page">
        <h2 id="iniciar-compra-titulo" className="text-center text-headline-md font-semibold">Quem está com você?</h2>
        <p id="iniciar-compra-descricao" className="text-body-md text-foreground-muted">Indique quem já está no mercado. Quem não for selecionado continuará com a presença não informada.</p>
        <div className="space-y-2">
          {participantes.map((participante) => participante.membroFamiliaId === iniciadorMembroFamiliaId
            ? <div key={participante.membroFamiliaId} className="rounded-control bg-primary/10 p-gutter text-primary"><p className="font-semibold">Você</p><p className="text-label-md">Responsável operacional · No mercado</p></div>
            : <label key={participante.membroFamiliaId} className={`flex min-h-touch items-center gap-gutter rounded-control border p-gutter ${selecionados.includes(participante.membroFamiliaId) ? 'border-primary bg-primary/10 text-primary' : 'border-foreground/15'}`}><input type="checkbox" checked={selecionados.includes(participante.membroFamiliaId)} disabled={enviando} onChange={() => setSelecionados((atual) => atual.includes(participante.membroFamiliaId) ? atual.filter((id) => id !== participante.membroFamiliaId) : [...atual, participante.membroFamiliaId])} /><span className="font-semibold">{participante.nome}</span>{selecionados.includes(participante.membroFamiliaId) && <span className="ml-auto text-label-md">No mercado</span>}</label>)}
        </div>
        {erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
        <div className="flex flex-col gap-2">
          <button type="button" disabled={enviando || disabled} onClick={() => void confirmar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Iniciando compra...' : 'Iniciar compra'}</button>
          <button type="button" autoFocus disabled={enviando} onClick={() => dialogRef.current?.close()} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Cancelar</button>
        </div>
      </div>
    </dialog>
  </>
}
