import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { buscarLista } from '../api/shoppingListsApi'
import { useFamilyContext } from '../../family/session/familyContext'
import type { ListaCompraDetalheResponse } from '../types/shoppingList'
import { statusListaCompraLabels } from '../types/shoppingList'

export function ListaDetalhePage() {
  const { listaId } = useParams()
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  const [lista, setLista] = useState<ListaCompraDetalheResponse | null>(null)
  const [chaveCarregada, setChaveCarregada] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [naoEncontrada, setNaoEncontrada] = useState(false)

  const carregarLista = useCallback(async () => {
    if (!auth || !familiaSelecionada || !listaId) {
      return
    }

    setCarregando(true)
    setErro(null)
    setNaoEncontrada(false)

    try {
      const response = await buscarLista(auth.token, familiaSelecionada.id, listaId)
      setLista(response.data)
      setChaveCarregada(`${familiaSelecionada.id}:${listaId}`)
    } catch (error) {
      const apiError = error as ApiRequestError

      if (apiError.status === 401) {
        logout()
        return
      }

      setLista(null)
      setChaveCarregada(`${familiaSelecionada.id}:${listaId}`)
      setNaoEncontrada(apiError.status === 404)
      setErro(apiError.message || 'Não foi possível carregar a lista.')
    } finally {
      setCarregando(false)
    }
  }, [auth, familiaSelecionada, listaId, logout])

  useEffect(() => {
    void Promise.resolve().then(carregarLista)
  }, [carregarLista])

  if (!familiaSelecionada || !listaId) {
    return null
  }

  const chaveAtual = `${familiaSelecionada.id}:${listaId}`
  const mostrandoCarregamento = carregando || chaveCarregada !== chaveAtual
  const listaVisivel = chaveCarregada === chaveAtual ? lista : null

  return (
    <section className="mx-auto max-w-2xl space-y-page py-page">
      <Link
        to="/listas"
        className="inline-flex min-h-touch items-center text-label-lg font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Voltar para listas
      </Link>

      {mostrandoCarregamento && <p className="text-body-md text-foreground-muted">Carregando lista...</p>}

      {!mostrandoCarregamento && naoEncontrada && (
        <div className="space-y-gutter rounded-card bg-surface p-page shadow-soft">
          <h1 className="text-headline-lg font-bold">Lista não encontrada</h1>
          <p className="text-body-md text-foreground-muted">
            Esta lista não existe na família selecionada.
          </p>
        </div>
      )}

      {!mostrandoCarregamento && !naoEncontrada && erro && (
        <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
          <p>{erro}</p>
          <button
            type="button"
            onClick={() => void carregarLista()}
            className="min-h-touch rounded-control border border-current px-page font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!mostrandoCarregamento && listaVisivel && (
        <div className="space-y-gutter rounded-card bg-surface p-page shadow-soft">
          <p className="text-label-lg font-semibold text-primary">
            {statusListaCompraLabels[listaVisivel.status]}
          </p>
          <h1 className="text-headline-lg font-bold">{listaVisivel.nome}</h1>
          <p className="text-body-md text-foreground-muted">
            A preparação desta lista será implementada no próximo marco.
          </p>
        </div>
      )}
    </section>
  )
}
