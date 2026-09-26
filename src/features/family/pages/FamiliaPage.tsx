import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { copiarTexto } from '../../../shared/utils/clipboard'
import { useSession } from '../../auth/session/sessionContext'
import {
  aprovarSolicitacaoFamilia,
  buscarMembrosFamilia,
  buscarSolicitacoesFamilia,
  rejeitarSolicitacaoFamilia,
  removerIntegranteFamilia,
  sairDaFamilia,
  excluirFamilia,
  transferirAdministracaoFamilia,
} from '../api/familyApi'
import { ConfirmacaoSensivelDialog } from '../components/ConfirmacaoSensivelDialog'
import { useFamilyContext } from '../session/familyContext'
import type { MembroFamiliaResponse, SolicitacaoFamiliaResponse } from '../types/family'

const papelLabel = {
  ADMINISTRADOR: 'Administrador(a)',
  MEMBRO: 'Membro',
} as const

function formatarData(data: string) {
  const value = new Date(data)

  if (Number.isNaN(value.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

export function FamiliaPage() {
  const { auth, logout } = useSession()
  const { familiaSelecionada, recarregarFamilias } = useFamilyContext()
  const navigate = useNavigate()
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoFamiliaResponse[]>([])
  const [solicitacoesFamiliaId, setSolicitacoesFamiliaId] = useState<string | null>(null)
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(false)
  const [erroSolicitacoes, setErroSolicitacoes] = useState<string | null>(null)
  const [solicitacaoEmProcessamentoId, setSolicitacaoEmProcessamentoId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [integrantes, setIntegrantes] = useState<MembroFamiliaResponse[]>([])
  const [integrantesFamiliaId, setIntegrantesFamiliaId] = useState<string | null>(null)
  const [carregandoIntegrantes, setCarregandoIntegrantes] = useState(false)
  const [erroIntegrantes, setErroIntegrantes] = useState<string | null>(null)
  const [revisaoIntegrantes, setRevisaoIntegrantes] = useState(0)
  const geracaoIntegrantes = useRef(0)
  const integrantesFamiliaIdRef = useRef<string | null>(null)
  const [confirmacaoSensivel, setConfirmacaoSensivel] = useState<{ tipo: 'transferir' | 'remover' | 'sair' | 'excluir'; integrante?: MembroFamiliaResponse } | null>(null)
  const [processandoConfirmacaoSensivel, setProcessandoConfirmacaoSensivel] = useState(false)
  const [erroConfirmacaoSensivel, setErroConfirmacaoSensivel] = useState<string | null>(null)
  const [saidaBloqueada, setSaidaBloqueada] = useState<{ motivo: 'ADMINISTRADOR_UNICO' | 'COMPRA_EM_ANDAMENTO'; membroFamiliaId: string } | null>(null)
  const [remocaoBloqueada, setRemocaoBloqueada] = useState<MembroFamiliaResponse | null>(null)

  const carregarSolicitacoes = useCallback(async (mostrarCarregamento = true) => {
    if (!auth || !familiaSelecionada || familiaSelecionada.contextoUsuario?.podeGerenciarIntegrantes !== true) {
      return
    }

    if (mostrarCarregamento) {
      setCarregandoSolicitacoes(true)
    }

    setErroSolicitacoes(null)

    try {
      const response = await buscarSolicitacoesFamilia(auth.token, familiaSelecionada.id)
      setSolicitacoes(response.data || [])
      setSolicitacoesFamiliaId(familiaSelecionada.id)
    } catch (error) {
      const apiError = error as ApiRequestError

      if (apiError.status === 401) {
        logout()
        return
      }

      setSolicitacoes([])
      setSolicitacoesFamiliaId(familiaSelecionada.id)
      setErroSolicitacoes(apiError.message || 'Não foi possível carregar as solicitações.')
    } finally {
      if (mostrarCarregamento) {
        setCarregandoSolicitacoes(false)
      }
    }
  }, [auth, familiaSelecionada, logout])

  useEffect(() => {
    if (familiaSelecionada?.contextoUsuario?.podeGerenciarIntegrantes !== true) {
      return
    }

    void Promise.resolve().then(() => carregarSolicitacoes())
  }, [carregarSolicitacoes, familiaSelecionada?.contextoUsuario?.podeGerenciarIntegrantes])

  useEffect(() => {
    const controller = new AbortController()
    const geracao = ++geracaoIntegrantes.current
    const familiaId = familiaSelecionada?.id

    if (!auth || !familiaId) {
      return () => controller.abort()
    }

    const mostrarCarregamento = integrantesFamiliaIdRef.current !== familiaId

    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return
      if (mostrarCarregamento) {
        setCarregandoIntegrantes(true)
      }
      setErroIntegrantes(null)

      try {
        const response = await buscarMembrosFamilia(auth.token, familiaId, controller.signal)
        if (controller.signal.aborted || geracao !== geracaoIntegrantes.current) return
        setIntegrantes(response.data || [])
        integrantesFamiliaIdRef.current = familiaId
        setIntegrantesFamiliaId(familiaId)
      } catch (error) {
        if (controller.signal.aborted || geracao !== geracaoIntegrantes.current) return
        const apiError = error as ApiRequestError
        if (apiError.status === 401) {
          logout()
          return
        }
        setErroIntegrantes(apiError.message || 'N\u00e3o foi poss\u00edvel carregar os integrantes.')
        integrantesFamiliaIdRef.current = familiaId
        setIntegrantesFamiliaId(familiaId)
      } finally {
        if (mostrarCarregamento && !controller.signal.aborted && geracao === geracaoIntegrantes.current) {
          setCarregandoIntegrantes(false)
        }
      }
    })

    return () => controller.abort()
  }, [auth, familiaSelecionada?.id, logout, revisaoIntegrantes])

  useEffect(() => {
    if (!auth || !familiaSelecionada?.id) return
    let timer: ReturnType<typeof setInterval> | undefined
    const atualizar = () => {
      if (document.hidden || !navigator.onLine) return
      setRevisaoIntegrantes((revisao) => revisao + 1)
      void carregarSolicitacoes(false)
    }
    const iniciar = () => { if (!timer && !document.hidden && navigator.onLine) timer = setInterval(atualizar, 10_000) }
    const parar = () => { if (timer) { clearInterval(timer); timer = undefined } }
    const visibilidade = () => { if (document.hidden) parar(); else { atualizar(); iniciar() } }
    const online = () => { atualizar(); iniciar() }
    iniciar(); window.addEventListener('focus', atualizar); window.addEventListener('online', online); document.addEventListener('visibilitychange', visibilidade)
    return () => { parar(); window.removeEventListener('focus', atualizar); window.removeEventListener('online', online); document.removeEventListener('visibilitychange', visibilidade) }
  }, [auth, familiaSelecionada?.id, carregarSolicitacoes])

  if (!familiaSelecionada) {
    return null
  }

  const familia = familiaSelecionada
  const isAdministrador = familia.contextoUsuario?.podeGerenciarIntegrantes === true
  const solicitacoesVisiveis =
    solicitacoesFamiliaId === familia.id ? solicitacoes : []
  const mostrandoCarregamento =
    isAdministrador &&
    (carregandoSolicitacoes || solicitacoesFamiliaId !== familia.id)
  const integrantesVisiveis = integrantesFamiliaId === familia.id ? integrantes : []
  const erroIntegrantesVisivel = integrantesFamiliaId === familia.id ? erroIntegrantes : null
  const integrantesOrdenados = [...integrantesVisiveis].sort((primeiro, segundo) => {
    if (primeiro.papel !== segundo.papel) return primeiro.papel === 'ADMINISTRADOR' ? -1 : 1
    return primeiro.nome.localeCompare(segundo.nome, 'pt-BR') || primeiro.membroFamiliaId.localeCompare(segundo.membroFamiliaId)
  })

  async function copiarCodigo(mensagemSucesso = 'Código copiado.') {
    if (await copiarTexto(familia.codigoIngresso)) {
      setFeedback(mensagemSucesso)
      return true
    }

    setFeedback('Não foi possível copiar o código.')
    return false
  }

  async function compartilharCodigo() {
    const mensagem = `Entre na família ${familia.nome} no Mercadeira. Código: ${familia.codigoIngresso}`

    if (!navigator.share) {
      await copiarCodigo('Compartilhamento não disponível. Código copiado.')
      return
    }

    try {
      await navigator.share({ title: 'Mercadeira', text: mensagem })
      setFeedback('Código compartilhado.')
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return
      await copiarCodigo('Não foi possível compartilhar. Código copiado.')
    }
  }

  async function atualizarSolicitacao(
    solicitacaoId: string,
    acao: 'aprovar' | 'rejeitar',
  ) {
    if (!auth || !isAdministrador) {
      return
    }

    setSolicitacaoEmProcessamentoId(solicitacaoId)
    setFeedback(null)

    try {
      if (acao === 'aprovar') {
        await aprovarSolicitacaoFamilia(auth.token, familia.id, solicitacaoId)
      } else {
        await rejeitarSolicitacaoFamilia(auth.token, familia.id, solicitacaoId)
      }

      setFeedback(acao === 'aprovar' ? 'Solicitação aprovada.' : 'Solicitação rejeitada.')
      await carregarSolicitacoes(false)
      setRevisaoIntegrantes((revisao) => revisao + 1)
    } catch (error) {
      const apiError = error as ApiRequestError

      if (apiError.status === 401) {
        logout()
        return
      }

      setFeedback(apiError.message || 'Não foi possível concluir a solicitação.')
    } finally {
      setSolicitacaoEmProcessamentoId(null)
    }
  }

  async function confirmarAcaoSensivel() {
    if (!auth || !confirmacaoSensivel) return
    setProcessandoConfirmacaoSensivel(true)
    setErroConfirmacaoSensivel(null)
    try {
      if (confirmacaoSensivel.tipo === 'transferir' && confirmacaoSensivel.integrante) {
        await transferirAdministracaoFamilia(auth.token, familia.id, confirmacaoSensivel.integrante.membroFamiliaId)
      } else if (confirmacaoSensivel.tipo === 'remover' && confirmacaoSensivel.integrante) {
        await removerIntegranteFamilia(auth.token, familia.id, confirmacaoSensivel.integrante.membroFamiliaId)
      } else if (confirmacaoSensivel.tipo === 'sair') {
        await sairDaFamilia(auth.token, familia.id)
      } else if (confirmacaoSensivel.tipo === 'excluir') {
        await excluirFamilia(auth.token, familia.id)
      }
      const acaoConcluida = confirmacaoSensivel.tipo
      await recarregarFamilias()
      setConfirmacaoSensivel(null)
      if (acaoConcluida === 'sair' || acaoConcluida === 'excluir') {
        navigate('/', { replace: true })
        return
      }
      setRevisaoIntegrantes((revisao) => revisao + 1)
      setFeedback(acaoConcluida === 'transferir' ? 'Administração transferida.' : 'Integrante removido da família.')
    } catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) {
        logout()
        return
      }
      if (confirmacaoSensivel.tipo === 'excluir' && apiError.status === 409) {
        await recarregarFamilias()
      }
      setErroConfirmacaoSensivel(apiError.message || (confirmacaoSensivel.tipo === 'transferir'
        ? 'Não foi possível transferir a administração desta família.'
        : confirmacaoSensivel.tipo === 'sair'
          ? 'Não foi possível sair desta família.'
          : 'Não foi possível remover este integrante da família.'))
      if (confirmacaoSensivel.tipo === 'excluir') {
        setErroConfirmacaoSensivel(apiError.message || 'Não foi possível excluir esta família. Atualize e tente novamente.')
      }
    } finally {
      setProcessandoConfirmacaoSensivel(false)
    }
  }

  function solicitarSaida(membro: MembroFamiliaResponse) {
    const contexto = familia.contextoUsuario
    if (contexto?.podeSairDaFamilia === true) {
      setErroConfirmacaoSensivel(null)
      setConfirmacaoSensivel({ tipo: 'sair' })
      return
    }
    if (contexto?.motivoSaidaFamiliaIndisponivel) {
      setSaidaBloqueada({ motivo: contexto.motivoSaidaFamiliaIndisponivel, membroFamiliaId: membro.membroFamiliaId })
    }
  }

  function solicitarRemocao(integrante: MembroFamiliaResponse) {
    if (integrante.acoes?.podeRemoverIntegrante === true) {
      setErroConfirmacaoSensivel(null)
      setConfirmacaoSensivel({ tipo: 'remover', integrante })
      return
    }
    if (integrante.acoes?.motivoRemocaoIndisponivel === 'COMPRA_EM_ANDAMENTO') {
      setRemocaoBloqueada(integrante)
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-page py-page">
      <header className="space-y-2">
        <p className="text-label-lg font-semibold uppercase tracking-wide text-primary">
          Família
        </p>
        <div className="flex flex-wrap items-center gap-gutter">
          <h1 className="text-headline-lg font-bold">{familiaSelecionada.nome}</h1>
          <span className="rounded-full bg-blue-100 px-gutter py-1 text-label-md font-semibold text-blue-700">
            {papelLabel[familiaSelecionada.papel]}
          </span>
        </div>
      </header>

      {feedback && (
        <p aria-live="polite" role="status" className="rounded-card bg-primary/10 p-gutter text-body-md text-primary">
          {feedback}
        </p>
      )}

      {((isAdministrador) && (solicitacoesVisiveis.length > 0)) && (
        <section className="space-y-gutter rounded-card border border-amber-200 bg-amber-50/60 p-page">
          <div>
            <h2 className="text-headline-md font-semibold text-amber-900">Solicitações pendentes</h2>
            <p className="mt-1 text-body-md text-foreground-muted">
              Aprove ou rejeite os pedidos de entrada nesta família.
            </p>
          </div>

          {mostrandoCarregamento && (
            <p className="rounded-card bg-surface p-page text-body-md text-foreground-muted shadow-soft">
              Carregando solicitações...
            </p>
          )}

          {!mostrandoCarregamento && erroSolicitacoes && (
            <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
              <p>{erroSolicitacoes}</p>
              <button
                type="button"
                onClick={() => void carregarSolicitacoes()}
                className="min-h-touch rounded-control border border-current px-page font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!mostrandoCarregamento && !erroSolicitacoes && solicitacoesVisiveis.length === 0 && (
            <p className="rounded-card bg-surface p-page text-body-md text-foreground-muted shadow-soft">
              Nenhuma solicitação pendente.
            </p>
          )}

          {!mostrandoCarregamento && !erroSolicitacoes && solicitacoesVisiveis.length > 0 && (
            <ul className="space-y-gutter">
              {solicitacoesVisiveis.map((solicitacao) => {
                const emProcessamento = solicitacaoEmProcessamentoId === solicitacao.id
                const dataFormatada = formatarData(solicitacao.solicitadaEm)

                return (
                  <li key={solicitacao.id} className="space-y-gutter rounded-card border border-amber-100 bg-surface p-page shadow-soft">
                    <div>
                      <p className="text-label-lg font-semibold">{solicitacao.solicitante.nome}</p>
                      <p className="text-body-md text-foreground-muted">{solicitacao.solicitante.email}</p>
                      {dataFormatada && (
                        <p className="mt-1 text-label-md text-foreground-muted">
                          Solicitado em {dataFormatada}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-gutter sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={emProcessamento}
                        onClick={() => void atualizarSolicitacao(solicitacao.id, 'aprovar')}
                        className="min-h-touch rounded-control bg-blue-600 px-page text-label-lg font-semibold text-surface transition-opacity hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {emProcessamento ? 'Processando...' : 'Aprovar'}
                      </button>
                      <button
                        type="button"
                        disabled={emProcessamento}
                        onClick={() => void atualizarSolicitacao(solicitacao.id, 'rejeitar')}
                        className="min-h-touch rounded-control border border-error px-page text-label-lg font-semibold text-error transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-gutter border-t border-foreground/10 pt-page">
        <button
          type="button"
          onClick={() => navigate('/familia/selecionar')}
          className="flex min-h-touch w-full items-center justify-center gap-2 rounded-control border-2 border-primary bg-surface px-page font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5 fill-none stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 7h10" />
            <path d="m14 4 3 3-3 3" />
            <path d="M17 17H7" />
            <path d="m10 14-3 3 3 3" />
          </svg>

          Trocar de família
        </button>
      </section>

      <section className="space-y-gutter rounded-card border border-foreground/10 bg-surface p-page shadow-soft">
        <div>
          <h2 className="text-headline-md font-semibold">Código de ingresso</h2>
          <p className="mt-1 text-body-md text-foreground-muted">
            Compartilhe este código para convidar pessoas para a família.
          </p>
        </div>
        <p className="rounded-card border border-primary/20 bg-primary/5 px-page py-gutter text-center font-mono text-headline-md font-bold tracking-[0.2em] text-primary">
          {familiaSelecionada.codigoIngresso}
        </p>
        <div className="grid gap-gutter sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void copiarCodigo()}
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>

            Copiar código
          </button>

          <button
            type="button"
            onClick={() => void compartilharCodigo()}
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control border border-primary px-page text-label-lg font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 10.5 6.8-4" />
              <path d="m8.6 13.5 6.8 4" />
            </svg>

            Compartilhar
          </button>
        </div>
      </section>
      {familia.contextoUsuario?.podeExcluirFamilia === true && (
        <section className="border-t border-foreground/10 pt-page">
          <button
            type="button"
            onClick={() => { setErroConfirmacaoSensivel(null); setConfirmacaoSensivel({ tipo: 'excluir' }) }}
            className="min-h-touch rounded-control border border-error px-page font-semibold text-error hover:bg-error/10"
          >
            Excluir família
          </button>
        </section>
      )}

      <section aria-labelledby="integrantes-titulo" className="space-y-gutter border-t border-foreground/10 pt-page">
        <div>
          <h2 id="integrantes-titulo" className="text-headline-md font-semibold">Integrantes</h2>
          <p className="mt-1 text-body-md text-foreground-muted">{'Pessoas que participam desta fam\u00edlia.'}</p>
        </div>

        {carregandoIntegrantes && integrantesFamiliaId !== familia.id && (
          <p className="rounded-card bg-surface p-page text-body-md text-foreground-muted shadow-soft">Carregando integrantes...</p>
        )}

        {!carregandoIntegrantes && erroIntegrantesVisivel && (
          <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
            <p>{erroIntegrantesVisivel}</p>
            <button
              type="button"
              onClick={() => setRevisaoIntegrantes((revisao) => revisao + 1)}
              className="min-h-touch rounded-control border border-current px-page font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!carregandoIntegrantes && !erroIntegrantesVisivel && integrantesOrdenados.length === 0 && (
          <p className="rounded-card bg-surface p-page text-body-md text-foreground-muted shadow-soft">Nenhum integrante encontrado.</p>
        )}

        {!carregandoIntegrantes && !erroIntegrantesVisivel && integrantesOrdenados.length > 0 && (
          <ul className="space-y-2">
            {integrantesOrdenados.map((integrante) => (
              <li key={integrante.membroFamiliaId} className="space-y-gutter rounded-card border border-foreground/10 bg-surface p-page">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-gutter">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"><p title={integrante.nome} className="line-clamp-2 font-semibold sm:truncate">{integrante.nome}</p>{integrante.usuarioAtual && <span className="w-fit shrink-0 rounded-full bg-primary/10 px-gutter py-1 text-label-md font-semibold text-primary">Você</span>}</div>
                    <p title={integrante.email} className="mt-1 line-clamp-2 break-words text-body-md text-foreground-muted sm:truncate">{integrante.email}</p>
                  </div>
                  <span className={integrante.papel === 'ADMINISTRADOR'
                    ? 'w-fit shrink-0 rounded-full bg-blue-100 px-gutter py-1 text-label-md font-semibold text-blue-700'
                    : 'w-fit shrink-0 rounded-full bg-foreground/5 px-gutter py-1 text-label-md text-foreground-muted'}>
                    {papelLabel[integrante.papel]}
                  </span>
                </div>


                <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-foreground/10 pt-gutter">
                  {integrante.usuarioAtual && (
                    <button
                      type="button"
                      onClick={() => solicitarSaida(integrante)}
                      className="inline-flex min-h-touch items-center gap-2 rounded-control border border-error px-gutter text-label-md font-semibold text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="size-4 fill-none stroke-current"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M13 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
                        <path d="M10 12h10" />
                        <path d="m17 7 5 5-5 5" />
                      </svg>

                      <span>Sair da família</span>
                    </button>
                  )}

                  {!integrante.usuarioAtual && (
                    <div className="flex w-full gap-2">
                      {integrante.acoes?.podeTransferirAdministracao === true && (
                        <button
                          type="button"
                          onClick={() => {
                            setErroConfirmacaoSensivel(null)
                            setConfirmacaoSensivel({
                              tipo: 'transferir',
                              integrante,
                            })
                          }}
                          className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-control border border-blue-600 px-2 text-center text-label-md font-semibold leading-tight text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-4 fill-none stroke-current"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 12h10" />
                            <path d="m11 5 7 7-7 7" />
                            <path d="M18 12h2" />
                          </svg>

                          <span>Transferir administração</span>
                        </button>
                      )}

                      {(integrante.acoes?.podeRemoverIntegrante === true ||
                        integrante.acoes?.motivoRemocaoIndisponivel ===
                        'COMPRA_EM_ANDAMENTO') && (
                          <button
                            type="button"
                            onClick={() => solicitarRemocao(integrante)}
                            className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-control border border-error px-2 text-center text-label-md font-semibold leading-tight text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="size-4 fill-none stroke-current"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>

                            <span>Remover integrante</span>
                          </button>
                        )}
                    </div>
                  )}
                </div>

              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmacaoSensivel && (
        <ConfirmacaoSensivelDialog
          titulo={confirmacaoSensivel.tipo === 'transferir' ? 'Transferir administração?' : confirmacaoSensivel.tipo === 'sair' ? 'Sair desta família?' : confirmacaoSensivel.tipo === 'excluir' ? 'Excluir esta família?' : 'Remover integrante?'}
          descricao={confirmacaoSensivel.tipo === 'transferir'
            ? `${confirmacaoSensivel.integrante?.nome} passará a ser Administrador(a) desta família. Você passará a ser Membro.`
            : confirmacaoSensivel.tipo === 'sair'
              ? 'Você deixará de participar desta família. O histórico de listas e compras será preservado.'
              : confirmacaoSensivel.tipo === 'excluir' ? 'Esta família nunca possuiu uma compra. A exclusão removerá definitivamente a família, suas listas em preparação, integrantes e solicitações.'
                : `${confirmacaoSensivel.integrante?.nome} deixará de participar desta família. Para voltar depois, dependerá das regras de ingresso vigentes.`}
          rotuloConfirmar={confirmacaoSensivel.tipo === 'transferir' ? 'Confirmar transferência' : confirmacaoSensivel.tipo === 'sair' ? 'Confirmar saída' : confirmacaoSensivel.tipo === 'excluir' ? 'Excluir família' : 'Confirmar remoção'}
          rotuloProcessando={confirmacaoSensivel.tipo === 'transferir' ? 'Transferindo...' : confirmacaoSensivel.tipo === 'sair' ? 'Saindo...' : confirmacaoSensivel.tipo === 'excluir' ? 'Excluindo família...' : 'Removendo...'}
          corSemantica={confirmacaoSensivel.tipo === 'transferir' ? 'amber' : 'error'}
          enviando={processandoConfirmacaoSensivel}
          erro={erroConfirmacaoSensivel}
          onConfirmar={() => void confirmarAcaoSensivel()}
          onCancelar={() => { if (!processandoConfirmacaoSensivel) setConfirmacaoSensivel(null) }} />
      )}

      {saidaBloqueada && (
        <div role="dialog" aria-modal="true" aria-labelledby="saida-bloqueada-titulo" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-page">
          <section className="w-full max-w-md space-y-gutter rounded-card bg-surface p-page shadow-soft">
            <div>
              <h2 id="saida-bloqueada-titulo" className="text-headline-md font-semibold">
                {saidaBloqueada.motivo === 'COMPRA_EM_ANDAMENTO' ? 'Não é possível sair da família' : 'Transfira a administração primeiro'}
              </h2>
              <p className="mt-1 text-body-md text-foreground-muted">
                {saidaBloqueada.motivo === 'COMPRA_EM_ANDAMENTO'
                  ? 'Você participa de uma compra em andamento e precisa aguardar ou encerrar essa participação antes de sair da família.'
                  : 'Você é o único administrador desta família. Transfira a administração para outro integrante antes de sair.'}
              </p>
            </div>
            <div className="grid gap-gutter border-t border-foreground/10 pt-gutter sm:grid-cols-2">
              {saidaBloqueada.motivo === 'COMPRA_EM_ANDAMENTO' && (
                <button type="button" onClick={() => { navigate(`/listas?participante=${saidaBloqueada.membroFamiliaId}`); setSaidaBloqueada(null) }} className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface hover:opacity-90">
                  Ver compras relacionadas
                </button>
              )}
              <button type="button" onClick={() => setSaidaBloqueada(null)} className="min-h-touch rounded-control border border-foreground/20 px-page text-label-lg font-semibold">
                {saidaBloqueada.motivo === 'COMPRA_EM_ANDAMENTO' ? 'Voltar' : 'Entendi'}
              </button>
            </div>
          </section>
        </div>
      )}

      {remocaoBloqueada && (
        <div role="dialog" aria-modal="true" aria-labelledby="remocao-bloqueada-titulo" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-page">
          <section className="w-full max-w-md space-y-gutter rounded-card bg-surface p-page shadow-soft">
            <div>
              <h2 id="remocao-bloqueada-titulo" className="text-headline-md font-semibold">Não é possível remover este integrante</h2>
              <p className="mt-1 text-body-md text-foreground-muted">Este integrante participa de uma compra em andamento e não pode ser removido enquanto ela estiver aberta.</p>
            </div>
            <div className="grid gap-gutter border-t border-foreground/10 pt-gutter sm:grid-cols-2">
              <button type="button" onClick={() => { navigate(`/listas?participante=${remocaoBloqueada.membroFamiliaId}`); setRemocaoBloqueada(null) }} className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface hover:opacity-90">
                Ver compras relacionadas
              </button>
              <button type="button" onClick={() => setRemocaoBloqueada(null)} className="min-h-touch rounded-control border border-foreground/20 px-page text-label-lg font-semibold">
                Voltar
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
