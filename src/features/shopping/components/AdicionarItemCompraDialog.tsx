import { useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { ItemFieldsForm } from '../../../shared/components/ItemFieldsForm'
import { useSession } from '../../auth/session/sessionContext'
import type { AdicionarItemCompraRequest } from '../types/shopping'

export function AdicionarItemCompraDialog({ onAdicionar }: { onAdicionar: (data: AdicionarItemCompraRequest) => Promise<void> }) {
  const { logout } = useSession()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const enviandoRef = useRef(false)
  const scrollRef = useRef(0)
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function fechar() {
    if (enviandoRef.current) return
    dialogRef.current?.close()
  }

  async function adicionar(data: AdicionarItemCompraRequest) {
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    try {
      await onAdicionar(data)
      dialogRef.current?.close()
    } catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) logout()
      else setErro(apiError.message || 'Não foi possível adicionar o item.')
    } finally { enviandoRef.current = false; setEnviando(false) }
  }

  return <>
    <button ref={openerRef} type="button" onClick={() => { scrollRef.current = window.scrollY; setErro(null); setAberto(true); dialogRef.current?.showModal() }} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface">Adicionar item</button>
    <dialog ref={dialogRef} aria-label="Adicionar item à compra" onCancel={(event) => { if (enviandoRef.current) event.preventDefault() }} onClose={() => { setAberto(false); requestAnimationFrame(() => { window.scrollTo({ top: scrollRef.current, behavior: 'auto' }); openerRef.current?.focus({ preventScroll: true }) }) }} className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40">
      {erro && <p role="alert" className="mb-gutter rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
      {aberto && <ItemFieldsForm submitting={enviando} onCancel={fechar} onSubmit={adicionar} />}
    </dialog>
  </>
}
