import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { useAuthenticatedUser } from '../../auth/user/AuthenticatedUserContext'
import { useFamilyContext } from '../../family/session/familyContext'
import { categoriaCompraLabels } from '../../shopping-lists/types/shoppingList'
import { adicionarItemCompra, alterarMinhaPresenca, buscarCompra, cancelarSolicitacaoPresenca, cancelarSolicitacaoResponsabilidade, colocarItemNoCarrinho, decidirSolicitacaoPresenca, decidirSolicitacaoResponsabilidade, removerItemCompra, restaurarItemNoCarrinho, solicitarMinhaPresenca, solicitarResponsabilidade } from '../api/shoppingApi'
import { AdicionarItemCompraDialog } from '../components/AdicionarItemCompraDialog'
import { ItemCompraCard } from '../components/ItemCompraCard'
import { MinhaPresenca } from '../components/MinhaPresenca'
import { EncerramentoAdministrativoCompra } from '../components/EncerramentoAdministrativoCompra'
import { useCompraTransacional } from '../session/CompraTransacionalContext'
import type { AcaoRemocaoItemCompra, AdicionarItemCompraRequest, CompraResponse, ItemCompraResponse } from '../types/shopping'

export function CompraAndamentoPage() {
  const { listaId } = useParams()
  const { auth } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  if (!auth || !familiaSelecionada || !listaId) return null
  return <AndamentoCompra key={`${familiaSelecionada.id}:${listaId}:${auth.token}`} token={auth.token} familiaId={familiaSelecionada.id} listaId={listaId} />
}

function AndamentoCompra({ token, familiaId, listaId }: { token: string; familiaId: string; listaId: string }) {
  const { logout } = useSession()
  const navigate = useNavigate()
  const { usuario, loading: usuarioCarregando, error: usuarioErro } = useAuthenticatedUser()
  const { atualizarStatusCompra } = useCompraTransacional()
  const ativo = useRef(true)
  const operacao = useRef(false)
  const geracao = useRef(0)
  const leituraPeriodica = useRef<AbortController | null>(null)
  const ultimaOperacao = useRef(0)
  const [ocupada, setOcupada] = useState(false)
  useEffect(() => { ativo.current = true; return () => { ativo.current = false } }, [])

  // Serializar comandos e reconciliações evita aplicar GET anterior a uma mutação posterior.
  async function executar(acao: () => Promise<void>) {
    if (!ativo.current || operacao.current) throw new Error('Aguarde a atualização da compra.')
    operacao.current = true
    geracao.current += 1
    leituraPeriodica.current?.abort()
    leituraPeriodica.current = null
    setOcupada(true)
    try { await acao() }
    finally { operacao.current = false; ultimaOperacao.current = Date.now(); if (ativo.current) setOcupada(false) }
  }
  const [tentativa, setTentativa] = useState(0)
  const [resultado, setResultado] = useState<{ chave: string; token: string; compra?: CompraResponse; erro?: string } | null>(null)
  const chave = `${familiaId}:${listaId}:${tentativa}`

  useEffect(() => {
    if (!token || !familiaId || !listaId) return
    let ativo = true
    const controller = new AbortController()
    void buscarCompra(token, familiaId, listaId, controller.signal).then((compra) => {
      if (ativo) setResultado({ chave, token, compra })
    }).catch((error: ApiRequestError) => {
      if (!ativo) return
      if (error.status === 401) { logout(); return }
      setResultado({
        chave, token, erro: error.status === 404
          ? 'Esta compra ainda não está disponível.'
          : error.message || 'Não foi possível carregar a compra.'
      })
    })
    return () => { ativo = false; controller.abort() }
  }, [token, familiaId, listaId, chave, logout])

  const carregando = resultado?.chave !== chave || resultado?.token !== token
  const compra = !carregando ? resultado?.compra : undefined
  const erro = !carregando ? resultado?.erro : undefined
  useEffect(() => {
    atualizarStatusCompra(listaId, compra?.status ?? null)
  }, [atualizarStatusCompra, compra?.status, listaId])

  useEffect(() => {
    if (compra?.status !== 'EM_ANDAMENTO') return
    let encerrado = false
    let timer: ReturnType<typeof setInterval> | undefined
    let ultimaConsulta = 0
    const intervalo = 5_000

    function agendar() {
      clearInterval(timer)
      if (!encerrado && document.visibilityState === 'visible' && navigator.onLine) timer = setInterval(() => void consultar(), intervalo)
    }

    async function consultar() {
      if (encerrado || document.visibilityState !== 'visible' || !navigator.onLine) return
      // Uma operação local tem prioridade. Foco/visibility próximos compartilham a consulta.
      if (operacao.current || leituraPeriodica.current || Date.now() - Math.max(ultimaConsulta, ultimaOperacao.current) < 1_000) {
        return
      }
      const controller = new AbortController()
      leituraPeriodica.current = controller
      const versao = geracao.current
      ultimaConsulta = Date.now()
      try {
        const atualizada = await buscarCompra(token, familiaId, listaId, controller.signal)
        if (encerrado || controller.signal.aborted || versao !== geracao.current) return
        setResultado((atual) => atual?.chave === chave && atual.token === token && atual.compra?.id === atualizada.id ? { ...atual, compra: atualizada } : atual)
        if (atualizada.status !== 'EM_ANDAMENTO') { encerrado = true; clearInterval(timer) }
      } catch (error) {
        if (encerrado || controller.signal.aborted || versao !== geracao.current) return
        if ((error as ApiRequestError).status === 401) { encerrado = true; clearInterval(timer); logout() }
        // Rede/servidor indisponível: preservar dados e tentar no próximo ciclo.
      } finally {
        if (leituraPeriodica.current === controller) leituraPeriodica.current = null
      }
    }

    // onLine é apenas um sinal do navegador; o GET continua confirmando a conectividade real.
    function disponibilidade() {
      if (document.visibilityState !== 'visible' || !navigator.onLine) {
        clearInterval(timer)
        leituraPeriodica.current?.abort()
        leituraPeriodica.current = null
        ultimaConsulta = 0
      } else { void consultar(); agendar() }
    }
    function foco() { void consultar() }
    agendar()
    document.addEventListener('visibilitychange', disponibilidade)
    window.addEventListener('focus', foco)
    window.addEventListener('offline', disponibilidade)
    window.addEventListener('online', disponibilidade)
    return () => {
      encerrado = true
      clearInterval(timer)
      leituraPeriodica.current?.abort()
      leituraPeriodica.current = null
      document.removeEventListener('visibilitychange', disponibilidade)
      window.removeEventListener('focus', foco)
      window.removeEventListener('offline', disponibilidade)
      window.removeEventListener('online', disponibilidade)
    }
  }, [compra?.status, chave, token, familiaId, listaId, logout])

  function atualizarItem(item: ItemCompraResponse, adicionar = false) {
    if (!ativo.current) return
    setResultado((atual) => {
      if (atual?.chave !== chave || atual.token !== token || !atual.compra || atual.compra.status === 'FINALIZADA' || atual.compra.id !== compra?.id) return atual
      const itens = atual.compra.itens
      const existe = itens.some((existente) => existente.id === item.id)
      return {
        ...atual, compra: {
          ...atual.compra, itens: adicionar && !existe
            ? [...itens, item]
            : itens.map((existente) => existente.id === item.id ? item : existente)
        }
      }
    })
  }

  async function colocarNoCarrinho(itemId: string) {
    if (compra?.itens.find((item) => item.id === itemId)?.acoes.podeColocarNoCarrinho !== true) throw new Error('Colocar no carrinho não está disponível para este item.')
    await executar(async () => atualizarItem(await colocarItemNoCarrinho(token, familiaId, listaId, itemId)))
  }

  async function adicionarItem(data: AdicionarItemCompraRequest) {
    if (!token || !familiaId || !listaId || !compra?.contextoUsuario.participanteCompra) throw new Error('Não foi possível confirmar sua participação na compra.')
    await executar(async () => atualizarItem(await adicionarItemCompra(token, familiaId, listaId, data), true))
  }

  function atualizarCompra(atualizada: CompraResponse) {
    if (!ativo.current) return
    setResultado((atual) => atual?.chave === chave && atual.token === token && atual.compra?.id === atualizada.id ? { ...atual, compra: atualizada } : atual)
  }

  async function reconciliarCompra() {
    await executar(async () => atualizarCompra(await buscarCompra(token, familiaId, listaId)))
  }

  async function solicitarPresenca() {
    if (compra?.contextoUsuario.podeSolicitarPresenca !== true) throw new Error('A solicitação de presença não está disponível.')
    await executar(async () => atualizarCompra(await solicitarMinhaPresenca(token, familiaId, listaId)))
  }

  async function cancelarPresenca(solicitacaoId: string) {
    if (compra?.contextoUsuario.podeCancelarSolicitacaoPresenca !== true) throw new Error('O cancelamento não está disponível.')
    await executar(async () => atualizarCompra(await cancelarSolicitacaoPresenca(token, familiaId, listaId, solicitacaoId)))
  }

  async function decidirPresenca(solicitacaoId: string, decisao: 'aprovar' | 'rejeitar') {
    if (compra?.solicitacoesPresencaPendentes?.find((pedido) => pedido.id === solicitacaoId)?.acoes.podeDecidirPresenca !== true) throw new Error('A decisão não está disponível.')
    await executar(async () => atualizarCompra(await decidirSolicitacaoPresenca(token, familiaId, listaId, solicitacaoId, decisao)))
  }

  async function declararSaida() {
    if (compra?.contextoUsuario.podeDeclararSaida !== true) throw new Error('A declaração de saída não está disponível.')
    await executar(async () => atualizarCompra(await alterarMinhaPresenca(token, familiaId, listaId, 'NAO_PRESENTE')))
  }

  async function solicitarResponsabilidadeOperacional() {
    if (compra?.contextoUsuario.podeSolicitarResponsabilidade !== true) throw new Error('A solicitação de responsabilidade não está disponível.')
    await executar(async () => atualizarCompra(await solicitarResponsabilidade(token, familiaId, listaId)))
  }
  async function cancelarResponsabilidade(solicitacaoId: string) {
    if (compra?.contextoUsuario.podeCancelarSolicitacaoResponsabilidade !== true) throw new Error('O cancelamento não está disponível.')
    await executar(async () => atualizarCompra(await cancelarSolicitacaoResponsabilidade(token, familiaId, listaId, solicitacaoId)))
  }
  async function decidirResponsabilidade(solicitacaoId: string, decisao: 'aprovar' | 'rejeitar') {
    if (compra?.solicitacoesResponsabilidadePendentes?.find((pedido) => pedido.id === solicitacaoId)?.acoes.podeDecidirResponsabilidade !== true) throw new Error('A decisão não está disponível.')
    await executar(async () => atualizarCompra(await decidirSolicitacaoResponsabilidade(token, familiaId, listaId, solicitacaoId, decisao)))
  }

  async function removerItem(itemId: string, acao: AcaoRemocaoItemCompra) {
    if (!token || !familiaId || !listaId) throw new Error('Contexto da compra indisponível.')
    await executar(async () => atualizarItem(await removerItemCompra(token, familiaId, listaId, itemId, acao)))
  }

  async function restaurarNoCarrinho(itemId: string) {
    if (!token || !familiaId || !listaId) throw new Error('Contexto da compra indisponível.')
    await executar(async () => atualizarItem(await restaurarItemNoCarrinho(token, familiaId, listaId, itemId)))
  }

  if (compra?.status === 'FINALIZADA') return <Navigate to={`/listas/${listaId}/compra/revisao`} replace />

  return (
    <section className="mx-auto max-w-3xl space-y-page">
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

      {carregando && (
        <p
          role="status"
          className="rounded-card bg-surface p-page text-foreground-muted shadow-soft"
        >
          Carregando compra...
        </p>
      )}

      {erro && (
        <div
          role="alert"
          className="space-y-gutter rounded-card bg-error/10 p-page text-error"
        >
          <h1 className="text-headline-md font-semibold">
            Compra em andamento
          </h1>

          <p>{erro}</p>

          <button
            type="button"
            onClick={() => setTentativa((valor) => valor + 1)}
            className="min-h-touch rounded-control border border-current px-page font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {compra && (
        <>
          <header className="space-y-gutter rounded-card bg-surface p-page shadow-soft">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-gutter py-1 text-label-md font-semibold text-primary">
                Em andamento
              </span>

              <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md text-foreground-muted">
                {categoriaCompraLabels[compra.categoria]}
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="break-words text-headline-lg font-bold">
                {compra.nomeLista}
              </h1>

              {compra.estabelecimento && (
                <p className="break-words text-body-lg font-semibold text-primary">
                  {compra.estabelecimento}
                </p>
              )}

              <p className="text-body-md text-foreground-muted">
                Iniciada em{' '}
                <time dateTime={compra.iniciadaEm}>
                  {new Date(compra.iniciadaEm).toLocaleDateString('pt-BR', { dateStyle: 'short' })}
                  {' às '}
                  {new Date(compra.iniciadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </time>
              </p>
            </div>

            <p className="rounded-card bg-primary/5 p-gutter text-body-md text-foreground-muted">
              {compra.contextoUsuario.participanteCompra
                ? 'Você participa desta compra.'
                : 'Você pode acompanhar esta compra, mas não participa dela.'}
            </p>

            <MinhaPresenca
              compra={compra}
              usuarioId={!usuarioCarregando && !usuarioErro ? usuario?.id : undefined}
              ocupada={ocupada}
              onSolicitar={solicitarPresenca}
              onCancelar={cancelarPresenca}
              onDecidir={decidirPresenca}
              onSair={declararSaida}
              onSolicitarResponsabilidade={solicitarResponsabilidadeOperacional}
              onCancelarResponsabilidade={cancelarResponsabilidade}
              onDecidirResponsabilidade={decidirResponsabilidade}
              onAtualizar={reconciliarCompra}
            />
          </header>

          <EncerramentoAdministrativoCompra compra={compra} token={token} familiaId={familiaId} listaId={listaId} bloqueada={ocupada} executar={executar} onSucesso={() => navigate('/inicio', { replace: true })} onReconciliar={reconciliarCompra} onNaoAutorizado={logout} />

          <fieldset
            disabled={ocupada}
            className="min-w-0 space-y-gutter"
            aria-labelledby="compra-itens"
          >
            {compra.contextoUsuario.participanteCompra && (
              <AdicionarItemCompraDialog
                key={chave}
                listaId={listaId}
                categoria={compra.categoria}
                onAdicionar={adicionarItem}
              />
            )}

            <div className="flex items-center justify-between gap-gutter">
              <h2
                id="compra-itens"
                className="text-headline-md font-semibold"
              >
                Itens da compra
              </h2>

              <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md">
                {compra.itens.length}{' '}
                {compra.itens.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {compra.itens.length === 0 && (
              <p className="text-foreground-muted">
                Esta compra não possui itens.
              </p>
            )}

            <ul className="space-y-gutter">
              {[...compra.itens]
                .sort((a, b) => a.ordemExibicao - b.ordemExibicao)
                .map((item) => (
                  <ItemCompraCard
                    key={`${chave}:${item.id}`}
                    item={item}
                    participante={compra.contextoUsuario.participanteCompra}
                    onColocar={colocarNoCarrinho}
                    onRestaurar={restaurarNoCarrinho}
                    onRemover={removerItem}
                    onReconciliar={reconciliarCompra}
                  />
                ))}
            </ul>
          </fieldset>

          <div className="pt-page">
            <Link
              to={`/listas/${listaId}/compra/revisao`}
              className="flex min-h-touch w-full items-center justify-center rounded-control bg-primary px-page font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Revisar compra
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
