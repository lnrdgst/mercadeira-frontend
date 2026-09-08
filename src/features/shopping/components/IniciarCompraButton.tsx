import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { iniciarCompra } from '../api/shoppingApi'

export function IniciarCompraButton({ familiaId, listaId, disabled = false }: { familiaId: string; listaId: string; disabled?: boolean }) {
  const { auth, logout } = useSession()
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const enviandoRef = useRef(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function confirmar() {
    if (!auth || enviandoRef.current || disabled) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    try {
      await iniciarCompra(auth.token, familiaId, listaId)
      navigate(`/listas/${listaId}/compra`)
    } catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) logout()
      else setErro(apiError.message || 'Não foi possível iniciar a compra.')
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return <>
    <button ref={buttonRef} type="button" disabled={disabled || enviando} onClick={() => { setErro(null); dialogRef.current?.showModal() }} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Iniciar compra</button>
    <dialog ref={dialogRef} aria-labelledby="iniciar-compra-titulo" aria-describedby="iniciar-compra-descricao" onCancel={(event) => { if (enviandoRef.current) event.preventDefault() }} onClose={() => buttonRef.current?.focus({ preventScroll: true })} className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40">
      <div className="space-y-page">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-8 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l3 12h10l3-9H6M9 19h.01M18 19h.01" /></svg>
        </div>
        <h2 id="iniciar-compra-titulo" className="text-center text-headline-md font-semibold">Iniciar compra</h2>
        <p id="iniciar-compra-descricao" className="text-body-md text-foreground-muted">Ao iniciar, os participantes e itens atuais serão registrados nesta compra e a lista deixará o modo de preparação. Deseja continuar?</p>
        {erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
        <div className="flex flex-col gap-2">
          <button type="button" disabled={enviando || disabled} onClick={() => void confirmar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Iniciando compra...' : 'Confirmar e iniciar'}</button>
          <button type="button" autoFocus disabled={enviando} onClick={() => dialogRef.current?.close()} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Cancelar</button>
        </div>
      </div>
    </dialog>
  </>
}
