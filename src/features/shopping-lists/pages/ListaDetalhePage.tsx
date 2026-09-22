import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { useFamilyContext } from '../../family/session/familyContext'
import { IniciarCompraButton } from '../../shopping/components/IniciarCompraButton'
import { EditarDadosLista } from '../components/EditarDadosLista'
import { ItemForm } from '../components/ItemForm'
import { ConfirmarRemocaoItemDialog } from '../components/ConfirmarRemocaoItemDialog'
import { adicionarParticipanteLista, atualizarItemLista, buscarItensLista, buscarLista, buscarMembrosFamilia, buscarParticipantesLista, criarItemLista, reordenarItensLista, removerItemLista, removerParticipanteLista } from '../api/shoppingListsApi'
import type { ItemListaCompraResponse, ListaCompraDetalheResponse, MembroFamiliaResponse, ParticipanteListaResponse, SalvarItemListaRequest } from '../types/shoppingList'
import { categoriaCompraLabels, statusListaCompraLabels, unidadeMedidaLabels } from '../types/shoppingList'

export function ListaDetalhePage() {
  const { listaId } = useParams()
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  const [detalhe, setDetalhe] = useState<ListaCompraDetalheResponse | null>(null)
  const [participantes, setParticipantes] = useState<ParticipanteListaResponse[]>([])
  const [membros, setMembros] = useState<MembroFamiliaResponse[]>([])
  const [itens, setItens] = useState<ItemListaCompraResponse[]>([])
  const [detalheKey, setDetalheKey] = useState<string | null>(null)
  const [participantesKey, setParticipantesKey] = useState<string | null>(null)
  const [itensKey, setItensKey] = useState<string | null>(null)
  const [membrosFamiliaId, setMembrosFamiliaId] = useState<string | null>(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [carregandoParticipantes, setCarregandoParticipantes] = useState(false)
  const [carregandoItens, setCarregandoItens] = useState(false)
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null)
  const [erroParticipantes, setErroParticipantes] = useState<string | null>(null)
  const [erroItens, setErroItens] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [membroParaAdicionar, setMembroParaAdicionar] = useState('')
  const [operacaoParticipante, setOperacaoParticipante] = useState<string | null>(null)
  const [itemEditando, setItemEditando] = useState<ItemListaCompraResponse | null | 'novo'>(null)
  const [itemParaRemover, setItemParaRemover] = useState<ItemListaCompraResponse | null>(null)
  const [operacaoItem, setOperacaoItem] = useState<string | null>(null)
  const [reordenando, setReordenando] = useState(false)
  const itemDialogRef = useRef<HTMLDialogElement>(null)
  const itensTituloRef = useRef<HTMLHeadingElement>(null)
  const dialogOpenerRef = useRef<HTMLElement | null>(null)
  const dialogScrollYRef = useRef(0)
  const leituraPeriodicaRef = useRef<AbortController | null>(null)
  const geracaoRef = useRef(0)
  const mutacaoRef = useRef(false)
  const chave = familiaSelecionada && listaId ? `${familiaSelecionada.id}:${listaId}` : null

  const carregarDetalhe = useCallback(async () => {
    if (!auth || !familiaSelecionada || !listaId || !chave) return
    setCarregandoDetalhe(true); setErroDetalhe(null)
    try { const response = await buscarLista(auth.token, familiaSelecionada.id, listaId); setDetalhe(response.data); setDetalheKey(chave) }
    catch (error) { const apiError = error as ApiRequestError; if (apiError.status === 401) logout(); else { setDetalhe(null); setDetalheKey(chave); setErroDetalhe(apiError.message || 'Não foi possível carregar a lista.') } }
    finally { setCarregandoDetalhe(false) }
  }, [auth, chave, familiaSelecionada, listaId, logout])
  const carregarParticipantes = useCallback(async () => {
    if (!auth || !familiaSelecionada || !listaId || !chave) return
    setCarregandoParticipantes(true); setErroParticipantes(null)
    try { const response = await buscarParticipantesLista(auth.token, familiaSelecionada.id, listaId); setParticipantes(response.data || []); setParticipantesKey(chave) }
    catch (error) { const apiError = error as ApiRequestError; if (apiError.status === 401) logout(); else { setParticipantes([]); setParticipantesKey(chave); setErroParticipantes(apiError.message || 'Não foi possível carregar os participantes.') } }
    finally { setCarregandoParticipantes(false) }
  }, [auth, chave, familiaSelecionada, listaId, logout])
  const carregarItens = useCallback(async () => {
    if (!auth || !familiaSelecionada || !listaId || !chave) return
    setCarregandoItens(true); setErroItens(null)
    try { const response = await buscarItensLista(auth.token, familiaSelecionada.id, listaId); setItens(response.data || []); setItensKey(chave) }
    catch (error) { const apiError = error as ApiRequestError; if (apiError.status === 401) logout(); else { setItens([]); setItensKey(chave); setErroItens(apiError.message || 'Não foi possível carregar os itens.') } }
    finally { setCarregandoItens(false) }
  }, [auth, chave, familiaSelecionada, listaId, logout])
  const carregarMembros = useCallback(async () => {
    if (!auth || !familiaSelecionada || !detalhe?.contextoUsuario.podeGerenciarParticipantes) return
    try { const response = await buscarMembrosFamilia(auth.token, familiaSelecionada.id); setMembros(response.data || []); setMembrosFamiliaId(familiaSelecionada.id) }
    catch (error) { if ((error as ApiRequestError).status === 401) logout() }
  }, [auth, detalhe?.contextoUsuario.podeGerenciarParticipantes, familiaSelecionada, logout])
  useEffect(() => { void Promise.resolve().then(carregarDetalhe) }, [carregarDetalhe])
  useEffect(() => { void Promise.resolve().then(carregarParticipantes) }, [carregarParticipantes])
  useEffect(() => { void Promise.resolve().then(carregarItens) }, [carregarItens])
  useEffect(() => { void Promise.resolve().then(carregarMembros) }, [carregarMembros])
  useEffect(() => {
    if (!auth || !familiaSelecionada || !listaId || detalhe?.status !== 'EM_PREPARACAO') return
    let encerrado = false
    let timer: ReturnType<typeof setInterval> | undefined
    let ultimaConsulta = 0
    const reconciliar = async () => {
      if (encerrado || document.visibilityState !== 'visible' || !navigator.onLine || mutacaoRef.current || leituraPeriodicaRef.current || Date.now() - ultimaConsulta < 1_000) return
      const controller = new AbortController()
      const versao = geracaoRef.current
      leituraPeriodicaRef.current = controller
      ultimaConsulta = Date.now()
      try {
        const [listaAtualizada, participantesAtualizados, itensAtualizados] = await Promise.all([
          buscarLista(auth.token, familiaSelecionada.id, listaId, controller.signal),
          buscarParticipantesLista(auth.token, familiaSelecionada.id, listaId, controller.signal),
          buscarItensLista(auth.token, familiaSelecionada.id, listaId, controller.signal),
        ])
        if (encerrado || controller.signal.aborted || versao !== geracaoRef.current) return
        setDetalhe(listaAtualizada.data); setDetalheKey(chave)
        setParticipantes(participantesAtualizados.data || []); setParticipantesKey(chave)
        setItens(itensAtualizados.data || []); setItensKey(chave)
      } catch (error) {
        if (!encerrado && !controller.signal.aborted && versao === geracaoRef.current && (error as ApiRequestError).status === 401) { encerrado = true; clearInterval(timer); logout() }
      } finally { if (leituraPeriodicaRef.current === controller) leituraPeriodicaRef.current = null }
    }
    const agendar = () => {
      clearInterval(timer)
      if (!encerrado && document.visibilityState === 'visible' && navigator.onLine) timer = setInterval(() => void reconciliar(), 5_000)
    }
    const disponibilidade = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) { clearInterval(timer); leituraPeriodicaRef.current?.abort(); leituraPeriodicaRef.current = null; ultimaConsulta = 0 }
      else { void reconciliar(); agendar() }
    }
    const foco = () => void reconciliar()
    agendar()
    document.addEventListener('visibilitychange', disponibilidade)
    window.addEventListener('focus', foco)
    window.addEventListener('offline', disponibilidade)
    window.addEventListener('online', disponibilidade)
    return () => { encerrado = true; clearInterval(timer); leituraPeriodicaRef.current?.abort(); leituraPeriodicaRef.current = null; document.removeEventListener('visibilitychange', disponibilidade); window.removeEventListener('focus', foco); window.removeEventListener('offline', disponibilidade); window.removeEventListener('online', disponibilidade) }
  }, [auth, familiaSelecionada, listaId, chave, detalhe?.status, logout])
  useEffect(() => {
    const dialog = itemDialogRef.current
    if (!dialog) return
    if (itemEditando && !dialog.open) {
      dialogOpenerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      dialogScrollYRef.current = window.scrollY
      dialog.showModal()
    }
    if (!itemEditando && dialog.open) dialog.close()
  }, [itemEditando])
  if (!familiaSelecionada || !listaId || !chave) return null
  const lista = detalheKey === chave ? detalhe : null
  const listaParticipantes = participantesKey === chave ? participantes : []
  const listaItens = itensKey === chave ? itens : []
  const itensProntos = itensKey === chave && !carregandoItens && !erroItens
  const emPreparacao = lista?.status === 'EM_PREPARACAO'
  const podeGerenciar = emPreparacao && lista?.contextoUsuario.podeGerenciarParticipantes === true
  const podeAlterar = emPreparacao && lista?.contextoUsuario.podeAlterarItens === true
  const candidatos = membrosFamiliaId === familiaSelecionada.id ? membros.filter((membro) => !listaParticipantes.some((participante) => participante.membroFamiliaId === membro.membroFamiliaId)) : []

  function fecharDialog() {
    setItemEditando(null)
    requestAnimationFrame(() => {
      window.scrollTo({ top: dialogScrollYRef.current, behavior: 'auto' })
      dialogOpenerRef.current?.focus({ preventScroll: true })
    })
  }

  function atualizarEstadoMutacao(emAndamento: boolean) {
    if (emAndamento) {
      geracaoRef.current += 1
      leituraPeriodicaRef.current?.abort()
    }
    mutacaoRef.current = emAndamento
  }

  async function atualizarParticipante(membroFamiliaId: string, remover = false) {
    if (!auth || !lista || !familiaSelecionada || !listaId || !podeGerenciar) return
    geracaoRef.current += 1; leituraPeriodicaRef.current?.abort(); mutacaoRef.current = true
    setOperacaoParticipante(membroFamiliaId); setFeedback(null)
    try { if (remover) await removerParticipanteLista(auth.token, familiaSelecionada.id, listaId, membroFamiliaId); else await adicionarParticipanteLista(auth.token, familiaSelecionada.id, listaId, membroFamiliaId); setFeedback(remover ? 'Participante removido.' : 'Participante adicionado.'); await Promise.all([carregarDetalhe(), carregarParticipantes()]) }
    catch (error) { const apiError = error as ApiRequestError; if (apiError.status === 401) logout(); else setFeedback(apiError.message || 'Não foi possível atualizar os participantes.') }
    finally { mutacaoRef.current = false; setOperacaoParticipante(null) }
  }
  async function salvarItem(data: SalvarItemListaRequest) {
    if (!auth || !lista || !familiaSelecionada || !listaId || !podeAlterar) return
    geracaoRef.current += 1; leituraPeriodicaRef.current?.abort(); mutacaoRef.current = true
    setOperacaoItem(itemEditando === 'novo' ? 'novo' : itemEditando?.id || null); setFeedback(null)
    try {
      if (itemEditando && itemEditando !== 'novo') {
        const response = await atualizarItemLista(auth.token, familiaSelecionada.id, listaId, itemEditando.id, data)
        if (response.data) setItens(listaItens.map((item) => item.id === response.data?.id ? response.data : item))
        setFeedback('Item salvo.')
        fecharDialog()
        return
      }

      const response = await criarItemLista(auth.token, familiaSelecionada.id, listaId, data)
      if (!response.data) throw new Error('Não foi possível criar o item.')
      const novaOrdem = [response.data, ...listaItens]
      setItens(novaOrdem)
      await reordenarItensLista(auth.token, familiaSelecionada.id, listaId, novaOrdem.map((item) => item.id))
      setFeedback('Item adicionado.')
      fecharDialog()
    }
    catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) logout()
      else {
        if (itemEditando === 'novo') await carregarItens()
        setFeedback(apiError.message || 'Não foi possível salvar o item.')
      }
    }
    finally { mutacaoRef.current = false; setOperacaoItem(null) }
  }
  async function removerItem() {
    if (!auth || !itemParaRemover || !familiaSelecionada || !listaId || !podeAlterar) return
    geracaoRef.current += 1; leituraPeriodicaRef.current?.abort(); mutacaoRef.current = true
    setOperacaoItem(itemParaRemover.id); setFeedback(null)
    try { await removerItemLista(auth.token, familiaSelecionada.id, listaId, itemParaRemover.id); setFeedback('Item removido.'); await carregarItens(); setItemParaRemover(null) }
    catch (error) { const apiError = error as ApiRequestError; if (apiError.status === 401) logout(); else throw error }
    finally { mutacaoRef.current = false; setOperacaoItem(null) }
  }
  async function moverItem(indice: number, direcao: -1 | 1) {
    if (!auth || !familiaSelecionada || !listaId || reordenando || !podeAlterar) return
    const botaoFocado = document.activeElement instanceof HTMLButtonElement
      ? document.activeElement
      : null
    const destino = indice + direcao
    if (destino < 0 || destino >= listaItens.length) return
    const ordem = [...listaItens];;[ordem[indice], ordem[destino]] = [ordem[destino], ordem[indice]]
    geracaoRef.current += 1; leituraPeriodicaRef.current?.abort(); mutacaoRef.current = true; setItens(ordem); setReordenando(true)
    try { await reordenarItensLista(auth.token, familiaSelecionada.id, listaId, ordem.map((item) => item.id)) }
    catch (error) { const apiError = error as ApiRequestError; setItens(listaItens); if (apiError.status === 401) logout(); else setFeedback(apiError.message || 'Não foi possível reordenar os itens.') }
    finally { mutacaoRef.current = false; setReordenando(false); botaoFocado?.focus({ preventScroll: true }) }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-page py-page">
      <Link
        to="/listas"
        className="inline-flex min-h-touch items-center gap-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 fill-none stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>

        Voltar para listas
      </Link>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-card bg-primary/10 p-gutter text-primary"
        >
          {feedback}
        </p>
      )}

      {(carregandoDetalhe || detalheKey !== chave) && (
        <p className="text-body-md text-foreground-muted">
          Carregando lista...
        </p>
      )}

      {!carregandoDetalhe && erroDetalhe && (
        <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
          <p>{erroDetalhe}</p>
          <button
            type="button"
            onClick={() => void carregarDetalhe()}
            className="min-h-touch rounded-control border border-current px-page font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {lista && (
        <>
          <header className="space-y-2 rounded-card bg-surface p-page shadow-soft">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-gutter py-1 text-label-md font-semibold text-primary">
                {categoriaCompraLabels[lista.categoria]}
              </span>

              <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md text-foreground-muted">
                {statusListaCompraLabels[lista.status]}
              </span>
            </div>

            <h1 className="text-headline-lg font-bold">{lista.nome}</h1>

            {lista.estabelecimento && (
              <p className="text-body-md text-foreground-muted">
                {lista.estabelecimento}
              </p>
            )}

            <p className="text-label-lg text-foreground-muted">
              Criada por {lista.criador.nome}
            </p>
          </header>

          <EditarDadosLista
            key={chave}
            familiaId={familiaSelecionada.id}
            lista={lista}
            onAtualizada={(atualizada) => {
              setDetalhe(atualizada)
              setDetalheKey(chave)
            }}
            onMutacao={atualizarEstadoMutacao}
          />

          {lista.status === 'EM_COMPRA' && (
            <div className="space-y-gutter rounded-card border border-primary/20 bg-primary/5 p-page">
              <p>
                A lista saiu do modo de preparação. Acompanhe os participantes e
                itens registrados na compra.
              </p>

              <Link
                to={`/listas/${listaId}/compra`}
                className="inline-flex min-h-touch items-center rounded-control bg-primary px-page font-semibold text-surface"
              >
                Ver compra em andamento
              </Link>
            </div>
          )}

          <section className="space-y-gutter">
            <div>
              <h2 className="text-headline-md font-semibold">Participantes</h2>
              <p className="text-body-md text-foreground-muted">
                Pessoas que participam desta lista.
              </p>
            </div>

            {carregandoParticipantes || participantesKey !== chave ? (
              <p className="text-body-md text-foreground-muted">
                Carregando participantes...
              </p>
            ) : erroParticipantes ? (
              <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
                <p>{erroParticipantes}</p>

                <button
                  type="button"
                  onClick={() => void carregarParticipantes()}
                  className="min-h-touch rounded-control border border-current px-page font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {listaParticipantes.map((participante) => {
                  const criador =
                    participante.membroFamiliaId ===
                    lista.criador.membroFamiliaId

                  return (
                    <li
                      key={participante.membroFamiliaId}
                      className="flex min-h-touch flex-wrap items-center justify-between gap-gutter rounded-card bg-surface p-gutter shadow-soft"
                    >
                      <div>
                        <p className="font-semibold">{participante.nome}</p>
                        <p className="text-label-md text-foreground-muted">
                          {criador ? 'Criador' : participante.papelFamilia}
                        </p>
                      </div>

                      {podeGerenciar && !criador && (
                        <button
                          type="button"
                          disabled={
                            operacaoParticipante === participante.membroFamiliaId
                          }
                          onClick={() =>
                            void atualizarParticipante(
                              participante.membroFamiliaId,
                              true,
                            )
                          }
                          className="min-h-touch rounded-control border border-error px-gutter text-label-lg font-semibold text-error disabled:opacity-60"
                        >
                          Remover
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {!lista.contextoUsuario.participanteAtivo && podeGerenciar && (
              <div className="space-y-gutter rounded-card border border-primary/20 bg-primary/5 p-page">
                <p>Você não participa desta lista.</p>

                <button
                  type="button"
                  onClick={() =>
                    void atualizarParticipante(
                      lista.contextoUsuario.membroFamiliaId,
                    )
                  }
                  disabled={operacaoParticipante !== null}
                  className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
                >
                  Participar desta lista
                </button>
              </div>
            )}

            {podeGerenciar && candidatos.length > 0 && (
              <div className="flex flex-wrap gap-gutter rounded-card bg-surface p-page shadow-soft">
                <select
                  value={membroParaAdicionar}
                  onChange={(event) =>
                    setMembroParaAdicionar(event.target.value)
                  }
                  className="min-h-touch flex-1 rounded-control border border-foreground/20 bg-background px-gutter"
                >
                  <option value="">Adicionar participante</option>

                  {candidatos.map((membro) => (
                    <option
                      key={membro.membroFamiliaId}
                      value={membro.membroFamiliaId}
                    >
                      {membro.nome}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={
                    !membroParaAdicionar || operacaoParticipante !== null
                  }
                  onClick={() => {
                    void atualizarParticipante(membroParaAdicionar)
                    setMembroParaAdicionar('')
                  }}
                  className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60"
                >
                  Adicionar
                </button>
              </div>
            )}
          </section>

          <section className="space-y-gutter">
            <div className="w-full [&>button]:w-full">
              <div className="text-center">
                <h2
                  ref={itensTituloRef}
                  tabIndex={-1}
                  className="text-headline-md font-semibold"
                >
                  Itens
                </h2>

                <p className="text-body-md text-foreground-muted">
                  {emPreparacao
                    ? 'Itens em preparação para esta compra.'
                    : 'Itens da lista. A preparação está encerrada.'}
                </p>
              </div>

              {podeAlterar && itemEditando === null && (
                <button
                  type="button"
                  onClick={() => setItemEditando('novo')}
                  className="mt-gutter flex min-h-touch w-full items-center justify-center gap-2 rounded-control border border-primary bg-transparent px-page font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
                >
                  Adicionar item na lista

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
              )}
            </div>

            <dialog
              ref={itemDialogRef}
              onClose={fecharDialog}
              className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40"
            >
              {podeAlterar && itemEditando && (
                <ItemForm
                  item={
                    itemEditando === 'novo' ? undefined : itemEditando
                  }
                  submitting={operacaoItem !== null}
                  onCancel={fecharDialog}
                  onSubmit={salvarItem}
                />
              )}
            </dialog>

            {podeAlterar && itemParaRemover && (
              <ConfirmarRemocaoItemDialog
                key={`${chave}:${itemParaRemover.id}`}
                descricao={itemParaRemover.descricao}
                focoAposRemocao={itensTituloRef}
                onConfirmar={removerItem}
                onCancelar={() => setItemParaRemover(null)}
              />
            )}

            {carregandoItens || itensKey !== chave ? (
              <p className="text-body-md text-foreground-muted">
                Carregando itens...
              </p>
            ) : erroItens ? (
              <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
                <p>{erroItens}</p>

                <button
                  type="button"
                  onClick={() => void carregarItens()}
                  className="min-h-touch rounded-control border border-current px-page font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : listaItens.length === 0 ? (
              <div className="rounded-card bg-surface p-page text-body-md text-foreground-muted shadow-soft">
                {podeAlterar
                  ? 'Nenhum item adicionado ainda.'
                  : 'Esta lista ainda não possui itens.'}
              </div>
            ) : (
              <ul className="space-y-gutter">
                {listaItens.map((item, indice) => (
                  <li
                    key={item.id}
                    className="space-y-gutter rounded-card bg-surface p-page shadow-soft"
                  >
                    <div>
                      <h3 className="text-body-lg font-semibold">
                        {item.descricao}
                      </h3>

                      {(item.quantidade !== null || item.marca) && (
                        <p className="text-body-md text-foreground-muted">
                          {item.quantidade !== null &&
                            `${item.quantidade}${item.unidadeMedida
                              ? ` ${unidadeMedidaLabels[item.unidadeMedida]}`
                              : ''
                            }`}

                          {item.quantidade !== null && item.marca && ' · '}

                          {item.marca}
                        </p>
                      )}

                      {item.observacoes && (
                        <p className="mt-1 text-label-lg text-foreground-muted">
                          {item.observacoes}
                        </p>
                      )}
                    </div>

                    {podeAlterar && (
                      <div className="grid gap-2 sm:grid-cols-4">
                        <button
                          type="button"
                          onClick={() => setItemEditando(item)}
                          className="min-h-touch rounded-control border border border-blue-500 bg-transparent px-page font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"

                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemParaRemover(item)}
                          className="min-h-touch rounded-control border border-error px-gutter text-label-lg font-semibold text-error"
                        >
                          Remover da lista
                        </button>

                        <button
                          type="button"
                          disabled={indice === 0 || operacaoItem !== null}
                          onClick={() => void moverItem(indice, -1)}
                          aria-label={`Mover ${item.descricao} para cima`}
                          title={`Mover ${item.descricao} para cima`}
                          className="flex min-h-touch min-w-touch items-center justify-center rounded-control border border-foreground/20 px-gutter disabled:opacity-60"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-5 fill-none stroke-current"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m18 15-6-6-6 6" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          disabled={
                            indice === listaItens.length - 1 ||
                            operacaoItem !== null
                          }
                          onClick={() => void moverItem(indice, 1)}
                          aria-label={`Mover ${item.descricao} para baixo`}
                          title={`Mover ${item.descricao} para baixo`}
                          className="flex min-h-touch min-w-touch items-center justify-center rounded-control border border-foreground/20 px-gutter disabled:opacity-60"
                        >
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
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {emPreparacao &&
            lista.contextoUsuario.participanteAtivo && (
              <div className="space-y-gutter pt-page">
                {itensProntos && listaItens.length === 0 && (
                  <p className="rounded-card bg-error/10 p-gutter text-body-md font-normal text-error">
                    Adicione pelo menos um item para iniciar a compra.
                  </p>
                )}

                <div className="w-full [&>button]:w-full">
                  <IniciarCompraButton
                    key={chave}
                    familiaId={familiaSelecionada.id}
                    listaId={listaId}
                    onMutacao={atualizarEstadoMutacao}
                    disabled={
                      !itensProntos ||
                      listaItens.length === 0 ||
                      operacaoParticipante !== null ||
                      operacaoItem !== null ||
                      reordenando ||
                      itemEditando !== null ||
                      itemParaRemover !== null
                    }
                  />
                </div>
              </div>
            )}
        </>
      )}
    </section>
  )
}
