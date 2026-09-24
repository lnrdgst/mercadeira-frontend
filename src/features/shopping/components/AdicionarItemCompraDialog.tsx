import { useCallback, useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { ItemFieldsForm } from '../../../shared/components/ItemFieldsForm'
import { useSession } from '../../auth/session/sessionContext'
import { useFamilyContext } from '../../family/session/familyContext'
import { buscarSugestoesItens } from '../../shopping-lists/api/shoppingListsApi'
import type { AdicionarItemCompraRequest } from '../types/shopping'
import type { CategoriaCompra } from '../../shopping-lists/types/shoppingList'

export function AdicionarItemCompraDialog({ onAdicionar, listaId, categoria }: { onAdicionar: (data: AdicionarItemCompraRequest) => Promise<void>; listaId: string; categoria: CategoriaCompra }) {
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const enviandoRef = useRef(false)
  const scrollRef = useRef(0)
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregarSugestoes = useCallback(async (termo: string) => {
    if (!auth || !familiaSelecionada) return []
    try {
      return (await buscarSugestoesItens(auth.token, familiaSelecionada.id, listaId, categoria, termo)).data || []
    } catch (error) {
      if ((error as ApiRequestError).status === 401) logout()
      throw error
    }
  }, [auth, familiaSelecionada, listaId, categoria, logout])

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
                  className="mt-gutter flex min-h-touch w-full items-center justify-center gap-2 rounded-control border-2 border-primary bg-surface px-page font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">

  Adicionar novo item à compra
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
    <dialog ref={dialogRef} aria-label="Adicionar item à compra" onCancel={(event) => { if (enviandoRef.current) event.preventDefault() }} onClose={() => { setAberto(false); requestAnimationFrame(() => { window.scrollTo({ top: scrollRef.current, behavior: 'auto' }); openerRef.current?.focus({ preventScroll: true }) }) }} className="m-auto flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl flex-col overflow-hidden rounded-card bg-surface p-0 text-foreground shadow-soft backdrop:bg-foreground/40">
      {erro && <p role="alert" className="mx-page mt-page rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
      {aberto && <ItemFieldsForm stickyActions submitting={enviando} loadSuggestions={carregarSugestoes} onCancel={fechar} onSubmit={adicionar} />}
    </dialog>
  </>
}
