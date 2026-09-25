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
  const [confirmacaoSensivel, setConfirmacaoSensivel] = useState<{ tipo: 'transferir' | 'remover'; integrante: MembroFamiliaResponse } | null>(null)
  const [processandoConfirmacaoSensivel, setProcessandoConfirmacaoSensivel] = useState(false)
  const [erroConfirmacaoSensivel, setErroConfirmacaoSensivel] = useState<string | null>(null)

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
    if (!auth || !familiaSelecionada) return
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
      if (confirmacaoSensivel.tipo === 'transferir') {
        await transferirAdministracaoFamilia(auth.token, familia.id, confirmacaoSensivel.integrante.membroFamiliaId)
      } else {
        await removerIntegranteFamilia(auth.token, familia.id, confirmacaoSensivel.integrante.membroFamiliaId)
      }
      await recarregarFamilias(familia.id)
      const acaoConcluida = confirmacaoSensivel.tipo
      setConfirmacaoSensivel(null)
      setRevisaoIntegrantes((revisao) => revisao + 1)
      setFeedback(acaoConcluida === 'transferir' ? 'Administração transferida.' : 'Integrante removido da família.')
    } catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) {
        logout()
        return
      }
      setErroConfirmacaoSensivel(apiError.message || (confirmacaoSensivel.tipo === 'transferir'
        ? 'Não foi possível transferir a administração desta família.'
        : 'Não foi possível remover este integrante da família.'))
    } finally {
      setProcessandoConfirmacaoSensivel(false)
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
          <span className="rounded-full bg-primary/10 px-gutter py-1 text-label-md font-semibold text-primary">
            {papelLabel[familiaSelecionada.papel]}
          </span>
        </div>
      </header>

      {feedback && (
        <p aria-live="polite" role="status" className="rounded-card bg-primary/10 p-gutter text-body-md text-primary">
          {feedback}
        </p>
      )}

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
            className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Copiar código
          </button>
          <button
            type="button"
            onClick={() => void compartilharCodigo()}
            className="min-h-touch rounded-control border border-primary px-page text-label-lg font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Compartilhar
          </button>
        </div>
      </section>

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
              <li key={integrante.membroFamiliaId} className="flex items-center justify-between gap-gutter rounded-card border border-foreground/10 bg-surface px-page py-gutter">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{integrante.nome}{integrante.usuarioAtual ? ' (voc\u00ea)' : ''}</p>
                  <p className="truncate text-body-md text-foreground-muted">{integrante.email}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={integrante.papel === 'ADMINISTRADOR'
                    ? 'rounded-full bg-primary/10 px-gutter py-1 text-label-md font-semibold text-primary'
                    : 'rounded-full bg-foreground/5 px-gutter py-1 text-label-md text-foreground-muted'}>
                    {papelLabel[integrante.papel]}
                  </span>
                  {integrante.acoes?.podeTransferirAdministracao === true && (
                    <button type="button" onClick={() => { setErroConfirmacaoSensivel(null); setConfirmacaoSensivel({ tipo: 'transferir', integrante }) }} className="min-h-touch rounded-control border border-primary px-gutter text-label-md font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                      Transferir administração
                    </button>
                  )}
                  {integrante.acoes?.podeRemoverIntegrante === true && (
                    <button type="button" onClick={() => { setErroConfirmacaoSensivel(null); setConfirmacaoSensivel({ tipo: 'remover', integrante }) }} className="min-h-touch rounded-control border border-error px-gutter text-label-md font-semibold text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                      Remover integrante
                    </button>
                  )}
                  {integrante.acoes?.podeRemoverIntegrante === false && integrante.acoes.motivoRemocaoIndisponivel === 'COMPRA_EM_ANDAMENTO' && (
                    <div className="max-w-xs space-y-2 text-right text-label-md text-foreground-muted">
                      <p>Este integrante participa de uma compra em andamento e não pode ser removido enquanto ela estiver aberta.</p>
                      <button type="button" onClick={() => navigate(`/listas?participante=${integrante.membroFamiliaId}`)} className="min-h-touch rounded-control border border-primary px-gutter font-semibold text-primary hover:bg-primary/5">Ver compras relacionadas</button>
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
          titulo={confirmacaoSensivel.tipo === 'transferir' ? 'Transferir administração?' : 'Remover integrante?'}
          descricao={confirmacaoSensivel.tipo === 'transferir'
            ? `${confirmacaoSensivel.integrante.nome} passará a ser Administrador(a) desta família. Você passará a ser Membro.`
            : `${confirmacaoSensivel.integrante.nome} deixará de participar desta família. Para voltar depois, dependerá das regras de ingresso vigentes.`}
          rotuloConfirmar={confirmacaoSensivel.tipo === 'transferir' ? 'Confirmar transferência' : 'Confirmar remoção'}
          rotuloProcessando={confirmacaoSensivel.tipo === 'transferir' ? 'Transferindo...' : 'Removendo...'}
          corSemantica={confirmacaoSensivel.tipo === 'transferir' ? 'amber' : 'error'}
          enviando={processandoConfirmacaoSensivel}
          erro={erroConfirmacaoSensivel}
          onConfirmar={() => void confirmarAcaoSensivel()}
          onCancelar={() => { if (!processandoConfirmacaoSensivel) setConfirmacaoSensivel(null) }} />
      )}

      {isAdministrador && (
        <section className="space-y-gutter">
          <div>
            <h2 className="text-headline-md font-semibold">Solicitações pendentes</h2>
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
                  <li key={solicitacao.id} className="space-y-gutter rounded-card border border-foreground/10 bg-surface p-page shadow-soft">
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
                        className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
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
          className="min-h-touch w-full rounded-control border border-primary px-page text-label-lg font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Trocar família
        </button>
      </section>
    </section>
  )
}
