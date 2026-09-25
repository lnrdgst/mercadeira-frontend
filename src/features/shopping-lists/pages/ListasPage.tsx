import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { useAuthenticatedUser } from '../../auth/user/AuthenticatedUserContext'
import { buscarHistoricoListas, buscarListas, buscarMembrosFamilia, type FiltrosListas } from '../api/shoppingListsApi'
import { useFamilyContext } from '../../family/session/familyContext'
import type { HistoricoListaCompraItemResponse, ListaCompraResumoResponse, MembroFamiliaResponse } from '../types/shoppingList'
import {
  categoriaCompraLabels,
  statusListaCompraLabels,
} from '../types/shoppingList'

export function ListasPage() {
  const { auth, logout } = useSession()
  const { usuario } = useAuthenticatedUser()
  const { familiaSelecionada } = useFamilyContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtros, setFiltros] = useState<FiltrosListas>(() => ({ criadaDe: searchParams.get('dataInicial') || undefined, criadaAte: searchParams.get('dataFinal') || undefined, criadaPorUsuarioId: searchParams.get('criadaPor') || undefined, participanteMembroFamiliaId: searchParams.get('participante') || undefined }))
  const [membros, setMembros] = useState<MembroFamiliaResponse[]>([])
  const [modalFiltrosAberto, setModalFiltrosAberto] = useState(false)
  const [filtrosTemporarios, setFiltrosTemporarios] = useState<FiltrosListas>({})
  const [listas, setListas] = useState<ListaCompraResumoResponse[]>([])
  const [familiaCarregadaId, setFamiliaCarregadaId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [totalHistorico, setTotalHistorico] = useState(0)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [historico, setHistorico] = useState<HistoricoListaCompraItemResponse[]>([])
  const [historicoTemProxima, setHistoricoTemProxima] = useState(false)
  const [paginaHistorico, setPaginaHistorico] = useState(-1)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [erroHistorico, setErroHistorico] = useState<string | null>(null)
  const carregandoHistoricoRef = useRef(false)

  const carregarListas = useCallback(async () => {
    if (!auth || !familiaSelecionada) {
      return
    }
    if (filtros.criadaDe && filtros.criadaAte && filtros.criadaDe > filtros.criadaAte) {
      return
    }

    setCarregando(true)
    setErro(null)

    try {
      const response = await buscarListas(auth.token, familiaSelecionada.id, filtros)
      setListas(response.data || [])
      setTotalHistorico(Number(response.headers.get('X-Total-Compras-Anteriores') || 0))
      setHistorico([])
      setPaginaHistorico(-1)
      setHistoricoTemProxima(false)
      setHistoricoAberto(false)
      setErroHistorico(null)
      setFamiliaCarregadaId(familiaSelecionada.id)
    } catch (error) {
      const apiError = error as ApiRequestError

      if (apiError.status === 401) {
        logout()
        return
      }

      setListas([])
      setFamiliaCarregadaId(familiaSelecionada.id)
      setErro(apiError.message || 'Não foi possível carregar suas listas.')
    } finally {
      setCarregando(false)
    }
  }, [auth, familiaSelecionada, logout, filtros])

  const carregarHistorico = useCallback(async (pagina: number) => {
    if (!auth || !familiaSelecionada || carregandoHistoricoRef.current) return
    carregandoHistoricoRef.current = true
    setCarregandoHistorico(true)
    setErroHistorico(null)
    try {
      const response = await buscarHistoricoListas(auth.token, familiaSelecionada.id, pagina, 20, filtros)
      const dados = response.data
      if (!dados) throw new Error('NÃ£o foi possÃ­vel carregar compras anteriores.')
      setHistorico((atuais) => pagina === 0 ? dados.content : [...atuais, ...dados.content])
      setPaginaHistorico(dados.page)
      setHistoricoTemProxima(dados.hasNext)
    } catch (error) {
      const apiError = error as ApiRequestError
      if (apiError.status === 401) { logout(); return }
      setErroHistorico(apiError.message || 'NÃ£o foi possÃ­vel carregar compras anteriores.')
    } finally {
      carregandoHistoricoRef.current = false
      setCarregandoHistorico(false)
    }
  }, [auth, familiaSelecionada, logout, filtros])

  const alternarHistorico = () => {
    const abrir = !historicoAberto
    setHistoricoAberto(abrir)
    if (abrir && paginaHistorico < 0) void carregarHistorico(0)
  }

  useEffect(() => {
    void Promise.resolve().then(carregarListas)
  }, [carregarListas])

  useEffect(() => {
    if (!auth || !familiaSelecionada || !modalFiltrosAberto) return
    void buscarMembrosFamilia(auth.token, familiaSelecionada.id).then((response) => setMembros(response.data || [])).catch(() => setMembros([]))
  }, [auth, familiaSelecionada, modalFiltrosAberto])

  function atualizarFiltros(parcial: Partial<FiltrosListas>) {
    const proximos = { ...filtros, ...parcial }
    setFiltros(proximos)
    const parametros = new URLSearchParams()
    if (proximos.criadaDe) parametros.set('dataInicial', proximos.criadaDe)
    if (proximos.criadaAte) parametros.set('dataFinal', proximos.criadaAte)
    if (proximos.criadaPorUsuarioId) parametros.set('criadaPor', proximos.criadaPorUsuarioId)
    if (proximos.participanteMembroFamiliaId) parametros.set('participante', proximos.participanteMembroFamiliaId)
    setSearchParams(parametros, { replace: true })
  }
  const filtrosAtivos = Object.entries(filtros).filter(([chave, valor]) => valor && chave !== 'page' && chave !== 'size')
  const datasTemporariasInvalidas = !!filtrosTemporarios.criadaDe && !!filtrosTemporarios.criadaAte && filtrosTemporarios.criadaDe > filtrosTemporarios.criadaAte
  function abrirFiltros() { setFiltrosTemporarios(filtros); setModalFiltrosAberto(true) }
  function aplicarFiltros() { if (!datasTemporariasInvalidas) { atualizarFiltros(filtrosTemporarios); setModalFiltrosAberto(false) } }
  function limparFiltros() { atualizarFiltros({ criadaDe: undefined, criadaAte: undefined, criadaPorUsuarioId: undefined, participanteMembroFamiliaId: undefined }); setModalFiltrosAberto(false) }
  function nomeMembro(id: string | undefined, tipo: 'usuarioId' | 'membroFamiliaId') { return membros.find((membro) => membro[tipo] === id)?.nome || id }

  if (!familiaSelecionada) {
    return null
  }

  const listasVisiveis = familiaCarregadaId === familiaSelecionada.id ? listas : []
  const mostrandoCarregamento = carregando || familiaCarregadaId !== familiaSelecionada.id

  return (
    <section className="mx-auto max-w-3xl space-y-page py-page">
      <header className="flex flex-wrap items-end justify-between gap-gutter">
        <div>
          <h1 className="text-headline-lg font-bold">Minhas listas</h1>
          <p className="mt-1 text-body-md text-foreground-muted">
            Gerencie e acompanhe as listas de compras da família {familiaSelecionada.nome}.
          </p>
        </div>
        <Link
          to="/listas/nova"
          className="flex min-h-touch w-full items-center justify-center rounded-control bg-primary px-page font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Nova lista de compras
        </Link>
      </header>

      <section className="space-y-gutter"><button type="button" onClick={abrirFiltros} className="min-h-touch rounded-control border border-foreground/20 bg-surface px-page font-semibold">Filtrar listas{filtrosAtivos.length ? ` · ${filtrosAtivos.length}` : ''}</button>{filtrosAtivos.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="text-label-md text-foreground-muted">Filtros ativos:</span>{filtros.criadaDe && <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md">De: {filtros.criadaDe}</span>}{filtros.criadaAte && <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md">Até: {filtros.criadaAte}</span>}{filtros.criadaPorUsuarioId && <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md">Criada por: {nomeMembro(filtros.criadaPorUsuarioId, 'usuarioId')}</span>}{filtros.participanteMembroFamiliaId && <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md">Participante: {nomeMembro(filtros.participanteMembroFamiliaId, 'membroFamiliaId')}</span>}<button type="button" onClick={limparFiltros} className="min-h-touch text-label-md font-semibold text-primary">Limpar filtros</button></div>}</section>
      {modalFiltrosAberto && <div role="dialog" aria-modal="true" aria-label="Filtrar listas" className="fixed inset-0 z-50 flex items-end bg-foreground/40 p-gutter sm:items-center sm:justify-center"><section className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl space-y-page overflow-y-auto rounded-t-card bg-surface p-page shadow-soft sm:rounded-card sm:p-8"><h2 className="text-headline-md font-semibold">Filtrar listas</h2><div className="grid gap-page sm:grid-cols-2"><label className="space-y-2 text-label-lg font-semibold">Data inicial<input lang="pt-BR" type="date" value={filtrosTemporarios.criadaDe || ''} onChange={(event) => setFiltrosTemporarios((atual) => ({ ...atual, criadaDe: event.target.value || undefined }))} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter" /></label><label className="space-y-2 text-label-lg font-semibold">Data final<input lang="pt-BR" type="date" value={filtrosTemporarios.criadaAte || ''} onChange={(event) => setFiltrosTemporarios((atual) => ({ ...atual, criadaAte: event.target.value || undefined }))} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter" /></label><label className="space-y-2 text-label-lg font-semibold">Criada por<select value={filtrosTemporarios.criadaPorUsuarioId || ''} onChange={(event) => setFiltrosTemporarios((atual) => ({ ...atual, criadaPorUsuarioId: event.target.value || undefined }))} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter"><option value="">Todas</option>{membros.map((membro) => <option key={membro.usuarioId} value={membro.usuarioId}>{membro.nome}</option>)}</select></label><label className="space-y-2 text-label-lg font-semibold">Participante<select value={filtrosTemporarios.participanteMembroFamiliaId || ''} onChange={(event) => setFiltrosTemporarios((atual) => ({ ...atual, participanteMembroFamiliaId: event.target.value || undefined }))} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter"><option value="">Todos</option>{membros.map((membro) => <option key={membro.membroFamiliaId} value={membro.membroFamiliaId}>{membro.nome}</option>)}</select></label></div>{datasTemporariasInvalidas && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">A data inicial não pode ser posterior à data final.</p>}<footer className="flex flex-col-reverse gap-gutter border-t border-foreground/10 pt-page sm:flex-row sm:items-center"><button type="button" onClick={() => setModalFiltrosAberto(false)} className="min-h-touch rounded-control px-page font-semibold text-foreground-muted">Cancelar</button><button type="button" onClick={limparFiltros} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Limpar filtros</button><button type="button" disabled={datasTemporariasInvalidas} onClick={aplicarFiltros} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60 sm:ml-auto">Aplicar filtros</button></footer></section></div>}

      {mostrandoCarregamento && (
        <p className="rounded-card bg-surface p-page text-body-md text-foreground-muted shadow-soft">
          Carregando suas listas...
        </p>
      )}

      {!mostrandoCarregamento && erro && (
        <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
          <p>{erro}</p>
          <button
            type="button"
            onClick={() => void carregarListas()}
            className="min-h-touch rounded-control border border-current px-page font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!mostrandoCarregamento && !erro && listasVisiveis.length === 0 && (
        <div className="space-y-gutter rounded-card bg-surface p-page text-center shadow-soft">
          <p className="text-body-md text-foreground-muted">Você ainda não possui listas.</p>
          <Link
            to="/listas/nova"
            className="flex min-h-touch w-full items-center justify-center rounded-control bg-primary px-page font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Criar nova lista de compras
          </Link>
        </div>
      )}

      {!mostrandoCarregamento && !erro && listasVisiveis.length > 0 && (
        <ul className="grid gap-gutter sm:grid-cols-2">
          {listasVisiveis.map((lista) => {
            const emAndamento = lista.status === 'EM_COMPRA'
            const finalizada = lista.status === 'FINALIZADA'
            const labelStatus = emAndamento ? 'Em andamento' : statusListaCompraLabels[lista.status]
            const criadaPeloUsuario = lista.criadaPorUsuarioId === usuario?.id

            return (
              <li key={lista.id}>
              <Link
                to={
                  finalizada
                    ? `/listas/${lista.id}/compra/revisao`
                    : emAndamento
                      ? `/listas/${lista.id}/compra`
                      : `/listas/${lista.id}`
                }
                className={`block min-h-touch space-y-gutter rounded-card border p-page shadow-soft transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${finalizada
                  ? 'border-blue-300 bg-blue-50'
                  : emAndamento
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-foreground/10 bg-surface'
                  }`}
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md font-semibold text-foreground-muted">
                    {categoriaCompraLabels[lista.categoria]}
                  </span>

                  <span
                    className={`rounded-full px-gutter py-1 text-label-md font-semibold ${finalizada
                      ? 'bg-blue-100 text-blue-700'
                      : emAndamento
                        ? 'bg-primary/10 text-primary'
                        : 'bg-foreground/5 text-foreground-muted'
                      }`}
                  >
                    {labelStatus}
                  </span>
                  
                </div>

                <div>
                  <h2 className="text-headline-md font-semibold">
                    {lista.nome}
                  </h2>
                  <span>

                  {criadaPeloUsuario && <p className="mt-1 text-label-md font-medium text-primary">Lista criada por você</p>}
                  </span>

                  {lista.estabelecimento && (
                    <p className="mt-1 text-body-md text-foreground-muted">
                      {lista.estabelecimento}
                    </p>
                  )}
                </div>

                <p className="text-label-lg font-semibold text-primary">
                  {finalizada
                    ? 'Ver resumo'
                    : emAndamento
                    ? 'Ver compra'
                    : 'Abrir lista'}
                </p>
              </Link>
              </li>
            )
          })}
        </ul>
      )}

      {!mostrandoCarregamento && !erro && totalHistorico > 0 && (
        <section className="rounded-card border border-amber-200 bg-amber-50/50 p-page">
          <button type="button" onClick={alternarHistorico} aria-expanded={historicoAberto}
            aria-controls="compras-anteriores" className="flex min-h-touch w-full items-center justify-between gap-gutter text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span>Compras anteriores ({totalHistorico})</span><span aria-hidden="true">{historicoAberto ? '▾' : '▸'}</span>
          </button>
          {historicoAberto && <div id="compras-anteriores" className="mt-gutter space-y-gutter">
            {carregandoHistorico && historico.length === 0 && <p className="text-body-md text-foreground-muted">Carregando compras anteriores...</p>}
            {erroHistorico && <div className="space-y-gutter text-error"><p>{erroHistorico}</p><button type="button" onClick={() => void carregarHistorico(paginaHistorico < 0 ? 0 : paginaHistorico + 1)} className="min-h-touch rounded-control border border-current px-page font-semibold">Tentar novamente</button></div>}
            {historico.length > 0 && <ul className="grid gap-gutter sm:grid-cols-2">{historico.map(({ lista }) => <li key={lista.id}><Link to={`/listas/${lista.id}/compra/revisao`} className="block min-h-touch space-y-gutter rounded-card border border-blue-300 bg-blue-50 p-page shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md font-semibold text-foreground-muted">{categoriaCompraLabels[lista.categoria]}</span><span className="rounded-full bg-blue-100 px-gutter py-1 text-label-md font-semibold text-blue-700">Finalizada</span></div><div><h2 className="text-headline-md font-semibold">{lista.nome}</h2>{lista.estabelecimento && <p className="mt-1 text-body-md text-foreground-muted">{lista.estabelecimento}</p>}</div><p className="text-label-lg font-semibold text-primary">Ver resumo</p></Link></li>)}</ul>}
            {historicoTemProxima && <button type="button" disabled={carregandoHistorico} onClick={() => void carregarHistorico(paginaHistorico + 1)} className="min-h-touch rounded-control border border-amber-400 px-page font-semibold text-amber-900 disabled:opacity-60">{carregandoHistorico ? 'Carregando...' : 'Carregar mais'}</button>}
          </div>}
        </section>
      )}
    </section>
  )
}
