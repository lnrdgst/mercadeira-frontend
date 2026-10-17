import { useCallback, useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { ItemFieldsForm } from '../../../shared/components/ItemFieldsForm'
import { Modal } from '../../../shared/components/Modal'
import { useSession } from '../../auth/session/sessionContext'
import { useFamilyContext } from '../../family/session/familyContext'
import { buscarSugestoesItens } from '../../shopping-lists/api/shoppingListsApi'
import type { AdicionarItemCompraRequest } from '../types/shopping'
import type { CategoriaCompra } from '../../shopping-lists/types/shoppingList'

export function AdicionarItemCompraDialog({ onAdicionar, listaId, categoria, solicitacaoRemota = false, bloqueada = false }: { onAdicionar: (data: AdicionarItemCompraRequest) => Promise<void>; listaId: string; categoria: CategoriaCompra; solicitacaoRemota?: boolean; bloqueada?: boolean }) {
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
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

  function encerrarModal() {
    setAberto(false)
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollRef.current, behavior: 'auto' })
      openerRef.current?.focus({ preventScroll: true })
    })
  }

  function fechar() {
    if (!enviandoRef.current) encerrarModal()
  }

  async function adicionar(data: AdicionarItemCompraRequest) {
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    try {
      await onAdicionar(data)
      encerrarModal()
    } catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) logout()
      else setErro(apiError.message || (solicitacaoRemota ? 'Não foi possível enviar a solicitação.' : 'Não foi possível adicionar o item.'))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return <>
    <button
      ref={openerRef}
      type="button"
      disabled={bloqueada}
      onClick={() => { scrollRef.current = window.scrollY; setErro(null); setAberto(true) }}
      className="mt-gutter flex min-h-touch w-full items-center justify-center gap-2 rounded-control border-2 border-primary bg-surface px-page font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {solicitacaoRemota ? '+ Solicitar novo item' : 'Adicionar novo item à compra'}
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <Modal open={aberto} onClose={fechar} closeDisabled={enviando} ariaLabel={solicitacaoRemota ? 'Solicitar novo item' : 'Adicionar item à compra'} panelClassName="max-w-xl p-0">
      {erro && <p role="alert" className="mx-page mt-page rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
      <ItemFieldsForm stickyActions solicitacaoRemota={solicitacaoRemota} submitting={enviando || bloqueada} loadSuggestions={carregarSugestoes} onCancel={fechar} onSubmit={adicionar} />
    </Modal>
  </>
}
