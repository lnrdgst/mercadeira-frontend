import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { buscarMinhasSolicitacoesPendentes, criarFamilia, solicitarEntrada } from '../api/familyApi'
import { useFamilyContext } from '../session/familyContext'
import type { MinhaSolicitacaoPendenteResponse } from '../types/family'

type FormMode = 'overview' | 'create' | 'join'

export function FamiliaEntradaPage() {
  const { auth, logout } = useSession()
  const { recarregarFamilias } = useFamilyContext()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<MinhaSolicitacaoPendenteResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('overview')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    if (!auth) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await buscarMinhasSolicitacoesPendentes(auth.token)
      setRequests(response.data || [])
    } catch (error) {
      if ((error as ApiRequestError).status === 401) logout()
      else setErrorMessage('Não foi possível carregar suas solicitações.')
    } finally { setIsLoading(false) }
  }, [auth, logout])

  useEffect(() => {
    void Promise.resolve().then(loadRequests)
  }, [loadRequests])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!auth) return
    setIsSubmitting(true); setErrorMessage(null)
    try {
      const data = new FormData(event.currentTarget)
      const response = await criarFamilia(auth.token, { nome: String(data.get('nome') || '') })
      if (!response.data) {
        throw new Error('Não foi possível criar a família.')
      }

      const familiaSelecionada = await recarregarFamilias(response.data.id)

      if (!familiaSelecionada) {
        setErrorMessage('Não foi possível atualizar a família criada.')
        return
      }

      navigate('/inicio', { replace: true })
    } catch (error) {
      if ((error as ApiRequestError).status === 401) logout()
      else setErrorMessage((error as ApiRequestError).message)
    } finally { setIsSubmitting(false) }
  }

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!auth) return
    setIsSubmitting(true); setErrorMessage(null)
    try {
      const data = new FormData(event.currentTarget)
      await solicitarEntrada(auth.token, { codigoIngresso: String(data.get('codigoIngresso') || '') })
      setSuccessMessage('Solicitação enviada. Agora é só aguardar a aprovação.')
      setFormMode('overview'); await loadRequests()
    } catch (error) {
      if ((error as ApiRequestError).status === 401) logout()
      else setErrorMessage((error as ApiRequestError).message)
    } finally { setIsSubmitting(false) }
  }

  async function handleCheckAgain() {
    setIsChecking(true)
    try {
      const familiaSelecionada = await recarregarFamilias()
      if (familiaSelecionada) {
        navigate('/inicio', { replace: true })
      } else {
        await loadRequests()
      }
    } finally {
      setIsChecking(false)
    }
  }

  if (isLoading) return <main className="p-page text-body-md text-foreground-muted">Carregando suas solicitações...</main>

  return (
    <main className="mx-auto max-w-xl space-y-page py-page text-foreground">
      <header className="space-y-1"><h1 className="text-headline-lg font-bold">Vamos configurar sua família</h1><p className="text-body-md text-foreground-muted">Crie uma família ou entre em uma existente.</p></header>
      {errorMessage && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-card bg-primary/10 p-gutter text-primary">{successMessage}</p>}
      {requests.length > 0 && <section className="space-y-gutter rounded-card bg-surface p-page shadow-soft"><div><h2 className="text-headline-md font-semibold">Solicitações aguardando aprovação</h2><p className="text-body-md text-foreground-muted">Você pode acompanhar todas as famílias solicitadas.</p></div><ul className="space-y-2">{requests.map((request) => <li key={request.id} className="rounded-card border border-foreground/10 p-gutter"><p className="font-semibold">{request.familia.nome}</p><p className="text-label-lg text-warning">Aguardando aprovação</p></li>)}</ul><button type="button" onClick={() => void handleCheckAgain()} disabled={isChecking} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">{isChecking ? 'Verificando...' : 'Verificar novamente'}</button></section>}
      {formMode === 'overview' && <section className="grid gap-gutter sm:grid-cols-2"><button type="button" onClick={() => setFormMode('create')} className="min-h-touch rounded-card bg-primary p-page text-label-lg font-semibold text-surface">Criar uma família</button><button type="button" onClick={() => setFormMode('join')} className="min-h-touch rounded-card border border-primary p-page text-label-lg font-semibold text-primary">Entrar em uma família</button></section>}
      {formMode === 'create' && <form onSubmit={handleCreate} className="space-y-gutter rounded-card bg-surface p-page shadow-soft"><label className="block font-semibold" htmlFor="nome">Nome da família</label><input id="nome" name="nome" required maxLength={120} disabled={isSubmitting} className="min-h-touch w-full rounded-card border border-foreground/20 px-gutter" /><div className="flex gap-gutter"><button type="submit" disabled={isSubmitting} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{isSubmitting ? 'Criando...' : 'Criar família'}</button><button type="button" onClick={() => setFormMode('overview')} className="min-h-touch px-page">Voltar</button></div></form>}
      {formMode === 'join' && <form onSubmit={handleJoin} className="space-y-gutter rounded-card bg-surface p-page shadow-soft"><label className="block font-semibold" htmlFor="codigoIngresso">Código de ingresso</label><input id="codigoIngresso" name="codigoIngresso" required maxLength={32} disabled={isSubmitting} className="min-h-touch w-full rounded-card border border-foreground/20 px-gutter" /><div className="flex gap-gutter"><button type="submit" disabled={isSubmitting} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{isSubmitting ? 'Enviando...' : 'Solicitar entrada'}</button><button type="button" onClick={() => setFormMode('overview')} className="min-h-touch px-page">Voltar</button></div></form>}
      {errorMessage && requests.length === 0 && <button type="button" onClick={() => void loadRequests()} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary">Tentar novamente</button>}
    </main>
  )
}
