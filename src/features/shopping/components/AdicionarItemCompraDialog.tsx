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
    <button ref={openerRef} type="button" onClick={() => { 
      scrollRef.current = window.scrollY; setErro(null); setAberto(true); dialogRef.current?.showModal() }} 
      className="mt-gutter flex min-h-touch w-full items-center justify-center gap-2 rounded-control border border-primary bg-transparent px-page font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
>
  Adicionar novo item na lista
  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-5 fill-none stroke-current"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
</button>
    <dialog ref={dialogRef} aria-label="Adicionar item à compra" onCancel={(event) => { if (enviandoRef.current) event.preventDefault() }} onClose={() => { setAberto(false); requestAnimationFrame(() => { window.scrollTo({ top: scrollRef.current, behavior: 'auto' }); openerRef.current?.focus({ preventScroll: true }) }) }} className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40">
      {erro && <p role="alert" className="mb-gutter rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
      {aberto && <ItemFieldsForm submitting={enviando} onCancel={fechar} onSubmit={adicionar} />}
    </dialog>
  </>
}
