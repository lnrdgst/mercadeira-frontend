import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { buscarListas } from '../api/shoppingListsApi'
import { useFamilyContext } from '../../family/session/familyContext'
import type { ListaCompraResumoResponse } from '../types/shoppingList'
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

  const carregarListas = useCallback(async () => {
    if (!auth || !familiaSelecionada) {
      return
    }

    setCarregando(true)
    setErro(null)

    try {
      const response = await buscarListas(auth.token, familiaSelecionada.id)
      setListas(response.data || [])
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
            Organize as compras da família {familiaSelecionada.nome}.
          </p>
        </div>
        <Link
          to="/listas/nova"
          className="inline-flex min-h-touch items-center justify-center rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Criar nova lista
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
            className="inline-flex min-h-touch items-center justify-center rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Criar nova lista
          </Link>
        </div>
      )}

      {!mostrandoCarregamento && !erro && listasVisiveis.length > 0 && (
        <ul className="grid gap-gutter sm:grid-cols-2">
          {listasVisiveis.map((lista) => (
            <li key={lista.id}>
              <Link
                to={`/listas/${lista.id}`}
                className="block min-h-touch space-y-gutter rounded-card border border-foreground/10 bg-surface p-page shadow-soft transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-gutter py-1 text-label-md font-semibold text-primary">
                    {categoriaCompraLabels[lista.categoria]}
                  </span>
                  <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md font-semibold text-foreground-muted">
                    {statusListaCompraLabels[lista.status]}
                  </span>
                </div>
                <div>
                  <h2 className="text-headline-md font-semibold">{lista.nome}</h2>
                  {lista.estabelecimento && (
                    <p className="mt-1 text-body-md text-foreground-muted">
                      {lista.estabelecimento}
                    </p>
                  )}
                </div>
                <p className="text-label-lg font-semibold text-primary">Abrir lista</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
