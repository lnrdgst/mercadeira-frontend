import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { criarLista } from '../api/shoppingListsApi'
import { useFamilyContext } from '../../family/session/familyContext'
import {
  categoriaCompraLabels,
  type CategoriaCompra,
} from '../types/shoppingList'

const categorias = Object.keys(categoriaCompraLabels) as CategoriaCompra[]

export function NovaListaPage() {
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  const navigate = useNavigate()
  const [categoria, setCategoria] = useState<CategoriaCompra>('SUPERMERCADO')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!auth || !familiaSelecionada) {
      return
    }

    setEnviando(true)
    setErro(null)
    const formData = new FormData(event.currentTarget)
    const estabelecimento = String(formData.get('estabelecimento') || '').trim()

    try {
      const response = await criarLista(auth.token, familiaSelecionada.id, {
        nome: String(formData.get('nome') || '').trim(),
        categoria,
        estabelecimento: estabelecimento || null,
      })

      if (!response.data) {
        throw new Error('Não foi possível criar a lista.')
      }

      navigate(`/listas/${response.data.id}`, { replace: true })
    } catch (error) {
      const apiError = error as ApiRequestError

      if (apiError.status === 401) {
        logout()
        return
      }

      setErro(apiError.message || 'Não foi possível criar a lista.')
    } finally {
      setEnviando(false)
    }
  }

  if (!familiaSelecionada) {
    return null
  }

  return (
    <section className="mx-auto max-w-2xl space-y-page py-page">
      <header className="space-y-1">
        <h1 className="text-headline-lg font-bold">Criar nova lista</h1>
        <p className="text-body-md text-foreground-muted">
          Crie uma lista para a família {familiaSelecionada.nome}.
        </p>
      </header>

      {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}

      <form onSubmit={handleSubmit} className="space-y-page rounded-card bg-surface p-page shadow-soft">
        <div className="space-y-1">
          <label className="block text-label-lg font-semibold" htmlFor="nome">
            Nome da lista
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            disabled={enviando}
            className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter text-body-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-label-lg font-semibold" htmlFor="categoria">
            Categoria
          </label>
          <select
            id="categoria"
            value={categoria}
            onChange={(event) => setCategoria(event.target.value as CategoriaCompra)}
            disabled={enviando}
            required
            className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter text-body-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            {categorias.map((item) => (
              <option key={item} value={item}>{categoriaCompraLabels[item]}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-label-lg font-semibold" htmlFor="estabelecimento">
            Estabelecimento (opcional)
          </label>
          <input
            id="estabelecimento"
            name="estabelecimento"
            type="text"
            disabled={enviando}
            className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter text-body-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          />
        </div>

        <div className="grid gap-gutter sm:grid-cols-2">
          <button
            type="submit"
            disabled={enviando}
            className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Criando...' : 'Criar lista'}
          </button>
          <Link
            to="/listas"
            className="inline-flex min-h-touch items-center justify-center rounded-control border border-foreground/20 px-page text-label-lg font-semibold text-foreground transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  )
}
