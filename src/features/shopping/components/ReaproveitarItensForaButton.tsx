import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { reaproveitarItensForaCompra } from '../../shopping-lists/api/shoppingListsApi'
import type { CompraResponse } from '../types/shopping'

const elegivel = (status: string) => status === 'PENDENTE' || status === 'REMOVIDO'

export function ReaproveitarItensForaButton({ compra, familiaId, abrirAoFinalizar = false, onAgoraNao }: {
  compra: CompraResponse; familiaId: string; abrirAoFinalizar?: boolean; onAgoraNao?: () => void
}) {
  const { auth, logout } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(abrirAoFinalizar)
  const [selecionados, setSelecionados] = useState(() => new Set(compra.itens.filter((item) => elegivel(item.status)).map((item) => item.id)))
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = useRef(false)
  const permitido = compra.contextoUsuario.podeCriarListaComItensQueFicaramDeFora === true
  const itens = compra.itens.filter((item) => elegivel(item.status))

  useEffect(() => {
    if (!open) return
    const modal = dialog.current
    modal?.showModal()
    return () => modal?.close()
  }, [open])

  function fechar() {
    setOpen(false)
    onAgoraNao?.()
  }

  async function confirmar() {
    if (!auth || !permitido || selecionados.size === 0 || busy.current) return
    busy.current = true; setEnviando(true); setErro(null)
    try {
      const nova = await reaproveitarItensForaCompra(auth.token, familiaId, compra.listaId, [...selecionados])
      navigate(`/listas/${nova.id}`)
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) logout()
      else setErro(`Compra finalizada, mas não foi possível criar a nova lista. ${falha.message || ''}`.trim())
    } finally { busy.current = false; setEnviando(false) }
  }

  if (!permitido) return null
  return <>
    {!abrirAoFinalizar && <button type="button" onClick={() => { setErro(null); setOpen(true) }} className="min-h-touch w-full rounded-control border border-primary px-page font-semibold text-primary">Criar lista com itens que ficaram de fora</button>}
    {open && <dialog ref={dialog} aria-labelledby="itens-fora-titulo" className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40" onCancel={(event) => { event.preventDefault(); if (!enviando) fechar() }}>
      <div className="space-y-gutter" aria-busy={enviando}>
        <h2 id="itens-fora-titulo" className="text-headline-md font-semibold">Criar lista com itens que ficaram de fora?</h2>
        <p>Selecione os itens que você quer levar para uma nova lista em preparação.</p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Itens que ficaram de fora</legend>
          {itens.map((item) => <label key={item.id} className="flex min-h-touch items-center gap-3 rounded-control border border-foreground/10 px-gutter">
            <input type="checkbox" checked={selecionados.has(item.id)} disabled={enviando} onChange={() => setSelecionados((atual) => {
              const proximo = new Set(atual); if (proximo.has(item.id)) proximo.delete(item.id); else proximo.add(item.id); return proximo
            })} />
            <span>{item.descricao} <span className="text-foreground-muted">({item.status === 'REMOVIDO' ? 'Removido' : 'Pendente'})</span></span>
          </label>)}
        </fieldset>
        {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
        <div className="flex flex-col gap-2">
          <button type="button" disabled={enviando || selecionados.size === 0} onClick={() => void confirmar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Criando lista...' : 'Criar nova lista'}</button>
          {erro && <button type="button" disabled={enviando || selecionados.size === 0} onClick={() => void confirmar()} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary">Tentar novamente</button>}
          <button type="button" disabled={enviando} onClick={fechar} className="min-h-touch rounded-control border border-foreground/20 px-page">{erro ? 'Ir para início' : abrirAoFinalizar ? 'Agora não' : 'Cancelar'}</button>
        </div>
      </div>
    </dialog>}
  </>
}
