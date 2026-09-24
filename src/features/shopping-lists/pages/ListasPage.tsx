import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { buscarHistoricoListas, buscarListas } from '../api/shoppingListsApi'
import { useFamilyContext } from '../../family/session/familyContext'
import type { HistoricoListaCompraItemResponse, ListaCompraResumoResponse } from '../types/shoppingList'
import {
  categoriaCompraLabels,
  statusListaCompraLabels,
} from '../types/shoppingList'

export function ListasPage() {
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
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

    setCarregando(true)
    setErro(null)

    try {
      const response = await buscarListas(auth.token, familiaSelecionada.id)
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
  }, [auth, familiaSelecionada, logout])

  const carregarHistorico = useCallback(async (pagina: number) => {
    if (!auth || !familiaSelecionada || carregandoHistoricoRef.current) return
    carregandoHistoricoRef.current = true
    setCarregandoHistorico(true)
    setErroHistorico(null)
    try {
      const response = await buscarHistoricoListas(auth.token, familiaSelecionada.id, pagina)
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
  }, [auth, familiaSelecionada, logout])

  const alternarHistorico = () => {
    const abrir = !historicoAberto
    setHistoricoAberto(abrir)
    if (abrir && paginaHistorico < 0) void carregarHistorico(0)
  }

  useEffect(() => {
    void Promise.resolve().then(carregarListas)
  }, [carregarListas])

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
