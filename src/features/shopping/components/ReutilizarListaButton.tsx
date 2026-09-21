import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { reutilizarLista } from '../../shopping-lists/api/shoppingListsApi'
import { buscarCompra } from '../api/shoppingApi'
import type { CompraResponse } from '../types/shopping'

export function ReutilizarListaButton({ compra, familiaId, onAtualizada }: {
  compra: CompraResponse; familiaId: string; onAtualizada: (compra: CompraResponse) => void
}) {
  const { auth, logout } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false)
  const busy = useRef(false)
  const ativo = useRef(true)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)
  const permitido = compra.contextoUsuario.podeReutilizarLista === true
  const quantidade = compra.itens.filter((item) => item.status === 'NO_CARRINHO' || item.status === 'PENDENTE').length
  useEffect(() => { ativo.current = true; return () => { ativo.current = false } }, [])
  useEffect(() => {
    if (!open) return
    const modal = dialog.current
    const botao = opener.current
    modal?.showModal()
    cancelar.current?.focus()
    return () => { modal?.close(); if (botao?.isConnected) botao.focus() }
  }, [open])

  async function atualizar() {
    if (!auth) return
    setPrecisaAtualizar(true)
    try {
      const atualizada = await buscarCompra(auth.token, familiaId, compra.listaId)
      if (!ativo.current) return
      onAtualizada(atualizada)
      setPrecisaAtualizar(false)
    } catch (error) {
      if (!ativo.current) return
      if ((error as ApiRequestError).status === 401) logout()
      else setErro('Não foi possível atualizar a compra. Atualize antes de tentar novamente.')
    }
  }

  async function confirmar() {
    if (!auth || !permitido || busy.current || precisaAtualizar) return
    busy.current = true; setEnviando(true); setErro(null)
    try {
      const nova = await reutilizarLista(auth.token, familiaId, compra.listaId)
      if (!ativo.current) return
      navigate(`/listas/${nova.id}`)
    } catch (error) {
      if (!ativo.current) return
      const falha = error as ApiRequestError
      if (falha.status === 401) logout()
      else {
        setErro(falha.message || 'Não foi possível reutilizar esta compra.')
        if (falha.status === 403 || falha.status === 409) await atualizar()
      }
    } finally { busy.current = false; if (ativo.current) setEnviando(false) }
  }

  return <>
    {permitido && <button ref={opener} type="button" onClick={() => { setErro(null); setOpen(true) }} className="min-h-touch w-full rounded-control bg-primary px-page font-semibold text-surface">Usar esta lista novamente</button>}
    {open && <dialog ref={dialog} aria-labelledby="reutilizar-titulo" aria-describedby="reutilizar-descricao" onCancel={(event) => { event.preventDefault(); if (!busy.current) setOpen(false) }} onClose={() => { if (!busy.current) setOpen(false) }} className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40">
      <div className="space-y-gutter" aria-busy={enviando}>
        <h2 id="reutilizar-titulo" className="text-headline-md font-semibold">Criar nova lista a partir desta?</h2>
        <p id="reutilizar-descricao">Os dados desta lista de origem serão copiados para uma nova lista editável antes da compra.</p>
        <p>{quantidade ? `${quantidade} item(ns) serão reutilizados. Itens removidos não serão copiados.` : 'Não há itens reutilizáveis. A nova lista será criada vazia.'}</p>
        <p>Somente você participará inicialmente. A lista de origem não será modificada.</p>
        {erro && <div role="alert" className="rounded-card bg-error/10 p-gutter text-error"><p>{erro}</p><p>Se houve falha de conexão, confira <Link to="/listas" className="underline">Minhas Listas</Link> antes de repetir a criação.</p></div>}
        {!permitido && <p>A reutilização não está mais disponível para esta compra.</p>}
        {precisaAtualizar && <button type="button" disabled={enviando} onClick={async () => { if (busy.current) return; busy.current = true; setEnviando(true); await atualizar(); busy.current = false; if (ativo.current) setEnviando(false) }} className="min-h-touch rounded-control border px-page">Atualizar compra</button>}
        <div className="flex flex-col gap-2">
          <button type="button" disabled={enviando || !permitido || precisaAtualizar} onClick={() => void confirmar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Criando lista...' : 'Confirmar e criar lista'}</button>
          <button ref={cancelar} type="button" disabled={enviando} onClick={() => setOpen(false)} className="min-h-touch rounded-control border border-foreground/20 px-page disabled:opacity-60">Cancelar</button>
        </div>
      </div>
    </dialog>}
  </>
}
