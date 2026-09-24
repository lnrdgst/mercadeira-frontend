import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { useFamilyContext } from '../../family/session/familyContext'
import { buscarCompra, finalizarCompra } from '../api/shoppingApi'
import { CompraResumo } from '../components/CompraResumo'
import { ReutilizarListaButton } from '../components/ReutilizarListaButton'
import { ReaproveitarItensForaButton } from '../components/ReaproveitarItensForaButton'
import { EncerramentoAdministrativoCompra } from '../components/EncerramentoAdministrativoCompra'
import { useCompraTransacional } from '../session/CompraTransacionalContext'
import type { CompraResponse } from '../types/shopping'

export function CompraRevisaoPage() {
  const { listaId } = useParams()
  const { auth } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  if (!auth || !familiaSelecionada || !listaId) return null
  return <RevisaoCompra key={`${familiaSelecionada.id}:${listaId}:${auth.token}`} token={auth.token} familiaId={familiaSelecionada.id} listaId={listaId} />
}

function RevisaoCompra({ token, familiaId, listaId }: { token: string; familiaId: string; listaId: string }) {
  const { logout } = useSession()
  const navigate = useNavigate()
  const { atualizarStatusCompra } = useCompraTransacional()
  const [compra, setCompra] = useState<CompraResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [mostrarItensFora, setMostrarItensFora] = useState(false)
  const enviandoRef = useRef(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const ativoRef = useRef(true)

  useEffect(() => {
    ativoRef.current = true
    return () => { ativoRef.current = false }
  }, [])

  useEffect(() => {
    let ativo = true
    void buscarCompra(token, familiaId, listaId).then((response) => {
      if (!ativo) return
      setCompra(response)
      setPrecisaAtualizar(false)
    }).catch((error: ApiRequestError) => {
      if (!ativo) return
      if (error.status === 401) logout()
      else setErro(error.status === 404 ? 'Esta compra não está disponível.' : error.message || 'Não foi possível carregar a compra.')
    }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [token, familiaId, listaId, tentativa, logout])

  useEffect(() => {
    atualizarStatusCompra(listaId, compra?.status ?? null)
  }, [atualizarStatusCompra, compra?.status, listaId])

  function atualizar() {
    if (enviandoRef.current || carregando) return
    setCarregando(true)
    setErro(null)
    setTentativa((valor) => valor + 1)
  }

  async function confirmar() {
    if (enviandoRef.current || carregando || precisaAtualizar || compra?.status !== 'EM_ANDAMENTO' || compra.contextoUsuario.podeFinalizarCompra !== true) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    try {
      const response = await finalizarCompra(token, familiaId, listaId)
      if (!ativoRef.current) return
      setCompra(response)
      dialogRef.current?.close()
      const temItensFora = response.itens.some((item) => item.status === 'PENDENTE' || item.status === 'REMOVIDO')
      if (response.contextoUsuario.podeCriarListaComItensQueFicaramDeFora === true && temItensFora) setMostrarItensFora(true)
      else navigate('/inicio', { replace: true })
      tituloRef.current?.focus({ preventScroll: true })
    } catch (error) {
      if (!ativoRef.current) return
      const falha = error as ApiRequestError
      if (falha.status === 401) { logout(); return }
      setErro(falha.message || 'Não foi possível finalizar a compra.')
      if (falha.status === 409) {
        setPrecisaAtualizar(true)
        dialogRef.current?.close()
        try {
          const atualizada = await buscarCompra(token, familiaId, listaId)
          if (!ativoRef.current) return
          setCompra(atualizada)
          setPrecisaAtualizar(false)
          setErro(`${falha.message} A revisão foi atualizada com o estado atual da compra.`)
        } catch (errorAtualizacao) {
          if (!ativoRef.current) return
          const erroAtualizacao = errorAtualizacao as ApiRequestError
          if (erroAtualizacao.status === 401) logout()
          else setErro(`${falha.message} Não foi possível atualizar a revisão. ${erroAtualizacao.message} Use Atualizar compra antes de tentar novamente.`)
        }
      }
    } finally {
      enviandoRef.current = false
      if (ativoRef.current) setEnviando(false)
    }
  }

  async function reconciliarEncerramentoAdministrativo() {
    const atualizada = await buscarCompra(token, familiaId, listaId)
    if (!ativoRef.current) return
    setCompra(atualizada)
    setPrecisaAtualizar(false)
  }

  return <section className="mx-auto max-w-3xl space-y-page">
    {compra && <nav className="flex flex-wrap gap-gutter" aria-label="Navegação da revisão">
      <Link
        to={compra?.status === 'FINALIZADA' ? '/listas' : `/listas/${listaId}/compra`}
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

        {compra?.status === 'FINALIZADA' ? 'Voltar para listas' : 'Voltar à compra'}
      </Link>
    </nav>}
    <header className="space-y-1">
      <h1 ref={tituloRef} tabIndex={-1} className="text-headline-lg font-bold">{compra?.status === 'FINALIZADA' ? 'Resumo da compra' : 'Revisão da compra'}</h1>
      {compra && <><p className="break-words text-body-lg font-semibold">{compra.nomeLista}</p>{compra.estabelecimento && <p className="break-words text-foreground-muted">{compra.estabelecimento}</p>}<p className="text-label-lg text-primary">{compra.status === 'FINALIZADA' ? 'Finalizada' : 'Em andamento'}</p></>}
    </header>
    {carregando && <p role="status">Carregando compra...</p>}
    {erro && <p role="alert" className="rounded-card bg-error/10 p-page text-error">{erro}</p>}
    {!carregando && (!compra || precisaAtualizar) && <button type="button" disabled={enviando} onClick={atualizar} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Atualizar compra</button>}
    {compra && <>
      <CompraResumo compra={compra} />
      {!carregando && compra.status === 'FINALIZADA' && <div className="space-y-2"><ReaproveitarItensForaButton compra={compra} familiaId={familiaId} abrirAoFinalizar={mostrarItensFora} onAgoraNao={mostrarItensFora ? () => navigate('/inicio', { replace: true }) : undefined} /><ReutilizarListaButton compra={compra} familiaId={familiaId} onAtualizada={setCompra} /></div>}
      {!carregando && compra.status === 'EM_ANDAMENTO' && compra.contextoUsuario.podeFinalizarCompra === true && <button ref={botaoRef} type="button" disabled={enviando || precisaAtualizar} onClick={() => { setErro(null); dialogRef.current?.showModal() }} className="min-h-touch w-full rounded-control bg-primary px-page font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">{enviando ? 'Finalizando compra...' : 'Finalizar compra'}</button>}
      {!carregando && <EncerramentoAdministrativoCompra compra={compra} token={token} familiaId={familiaId} listaId={listaId} bloqueada={enviando || precisaAtualizar} compacto onSucesso={() => navigate('/inicio', { replace: true })} onReconciliar={reconciliarEncerramentoAdministrativo} onNaoAutorizado={logout} />}
      {compra.status === 'EM_ANDAMENTO' && !compra.contextoUsuario.podeFinalizarCompra && compra.contextoUsuario.podeEncerrarCompraAdministrativamente !== true && <p className="text-body-md text-foreground-muted">{compra.contextoUsuario.precisaEstarPresenteParaFinalizar === true ? 'Você pode revisar a compra, mas precisa estar no mercado para finalizá-la.' : 'A finalização não está disponível para você no estado atual desta compra.'}</p>}
    </>}
    <dialog ref={dialogRef} aria-labelledby="finalizar-titulo" aria-describedby="finalizar-descricao" onCancel={(event) => { if (enviandoRef.current) event.preventDefault() }} onClose={() => (botaoRef.current || tituloRef.current)?.focus({ preventScroll: true })} className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40">
      <div className="space-y-page">
        <h2 id="finalizar-titulo" className="text-headline-md font-semibold">Finalizar compra?</h2>
        <p id="finalizar-descricao">A compra será encerrada. Itens pendentes permanecerão registrados como não comprados. Após finalizar, os itens não poderão mais ser alterados.</p>
        {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
        <div className="flex flex-col gap-2">
          <button type="button" disabled={enviando || carregando || precisaAtualizar || compra?.status !== 'EM_ANDAMENTO' || compra.contextoUsuario.podeFinalizarCompra !== true} onClick={() => void confirmar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Finalizando compra...' : 'Confirmar finalização'}</button>
          <button type="button" autoFocus disabled={enviando} onClick={() => dialogRef.current?.close()} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Cancelar</button>
        </div>
      </div>
    </dialog>
  </section>
}
