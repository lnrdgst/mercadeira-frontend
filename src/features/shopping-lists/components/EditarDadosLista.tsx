import { useEffect, useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { atualizarDadosLista, buscarLista } from '../api/shoppingListsApi'
import { categoriaCompraLabels, type ListaCompraDetalheResponse } from '../types/shoppingList'

export function EditarDadosLista({ familiaId, lista, onAtualizada, onMutacao }: {
  familiaId: string
  lista: ListaCompraDetalheResponse
  onAtualizada: (lista: ListaCompraDetalheResponse) => void
  onMutacao?: (emAndamento: boolean) => void
}) {
  const { auth, logout } = useSession()
  const [editando, setEditando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false)
  const ativo = useRef(true)
  const ocupado = useRef(false)
  const abriu = useRef(false)
  const acionador = useRef<HTMLButtonElement>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const permitido = lista.contextoUsuario.podeEditarDadosBasicos === true
  useEffect(() => { ativo.current = true; return () => { ativo.current = false } }, [])
  useEffect(() => {
    if (editando) { abriu.current = true; nomeRef.current?.focus() }
    else if (abriu.current) acionador.current?.focus()
  }, [editando])

  async function reconciliar() {
    if (!auth) return
    setPrecisaAtualizar(true)
    try {
      const response = await buscarLista(auth.token, familiaId, lista.id)
      if (!response.data) throw new Error('Resposta vazia')
      if (!ativo.current) return
      onAtualizada(response.data)
      setPrecisaAtualizar(false)
    } catch (error) {
      if (!ativo.current) return
      if ((error as ApiRequestError).status === 401) logout()
      else setErro('Não foi possível atualizar a lista. Atualize antes de tentar salvar novamente.')
    }
  }

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!auth || !permitido || precisaAtualizar || ocupado.current) return
    const data = new FormData(event.currentTarget)
    const nome = String(data.get('nome') || '').trim()
    if (!nome) { setErro('Informe o nome da lista.'); nomeRef.current?.focus(); return }
    ocupado.current = true; onMutacao?.(true); setEnviando(true); setErro(null)
    try {
      const response = await atualizarDadosLista(auth.token, familiaId, lista.id, {
        nome, categoria: String(data.get('categoria')) as ListaCompraDetalheResponse['categoria'],
        estabelecimento: String(data.get('estabelecimento') || '').trim() || null,
      })
      if (!response.data) throw new Error('Não foi possível salvar a lista.')
      if (!ativo.current) return
      onAtualizada(response.data)
      setEditando(false)
    } catch (error) {
      if (!ativo.current) return
      const apiError = error as ApiRequestError
      if (apiError.status === 401) logout()
      else {
        setErro(apiError.message || 'Não foi possível salvar a lista.')
        if (apiError.status === 403 || apiError.status === 409) await reconciliar()
        tituloRef.current?.focus()
      }
    } finally {
      ocupado.current = false
      onMutacao?.(false)
      if (ativo.current) setEnviando(false)
    }
  }

  if (!editando) return permitido ? <button ref={acionador} type="button" onClick={() => { setErro(null); setEditando(true) }} className="min-h-touch rounded-control border border-primary px-gutter font-semibold text-primary">Editar dados da lista</button> : null
  const campo = 'min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter text-body-md'
  return <form aria-labelledby="editar-lista-titulo" onSubmit={(event) => void salvar(event)} className="space-y-gutter" aria-busy={enviando}>
    <h2 id="editar-lista-titulo" ref={tituloRef} tabIndex={-1} className="text-headline-md font-semibold">Editar dados da lista</h2>
    {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
    {!permitido && <p>Os dados desta lista estão disponíveis somente para leitura.</p>}
    <fieldset disabled={enviando || !permitido || precisaAtualizar} className="space-y-gutter disabled:opacity-60">
      <div><label htmlFor="editar-lista-nome">Nome da lista</label><input ref={nomeRef} id="editar-lista-nome" name="nome" required maxLength={120} defaultValue={lista.nome} onInvalid={(event) => {
        if (event.currentTarget.validity.valueMissing) {
          event.preventDefault()
          setErro('Informe o nome da lista.')
          event.currentTarget.focus()
        }
      }} className={campo} /></div>
      <div><label htmlFor="editar-lista-categoria">Categoria</label><select id="editar-lista-categoria" name="categoria" required defaultValue={lista.categoria} className={campo}>{Object.entries(categoriaCompraLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div><label htmlFor="editar-lista-estabelecimento">Estabelecimento (opcional)</label><input id="editar-lista-estabelecimento" name="estabelecimento" maxLength={120} defaultValue={lista.estabelecimento || ''} className={campo} /></div>
      <button type="submit" className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface">{enviando ? 'Salvando...' : 'Salvar alterações'}</button>
    </fieldset>
    {precisaAtualizar && <button type="button" disabled={enviando} onClick={async () => { if (ocupado.current) return; ocupado.current = true; setEnviando(true); await reconciliar(); ocupado.current = false; if (ativo.current) setEnviando(false) }} className="min-h-touch rounded-control border px-page">Atualizar lista</button>}
    <button type="button" disabled={enviando} onClick={() => setEditando(false)} className="min-h-touch rounded-control border border-foreground/20 px-page">Cancelar</button>
  </form>
}
