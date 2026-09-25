import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { criarFamilia, solicitarEntrada } from '../api/familyApi'
import { useFamilyContext } from '../session/familyContext'
import trocaFamilia from '../../../assets/branding/mercadeira/troca-familia.png'

const papelLabel = {
  ADMINISTRADOR: 'Administrador(a)',
  MEMBRO: 'Membro',
} as const

export function FamiliaSelecionarPage() {
  const navigate = useNavigate()
  const { auth, logout } = useSession()
  const { familias, selecionarFamilia, recarregarFamilias } = useFamilyContext()
  const [acaoAberta, setAcaoAberta] = useState<'criar' | 'ingressar' | null>(null)
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  function handleSelect(familiaId: string) {
    selecionarFamilia(familiaId)
    navigate('/inicio', { replace: true })
  }

  const nomeNormalizado = nome.trim()
  const nomeValido = nomeNormalizado.length >= 2 && !/\bfamilia\b/i.test(nomeNormalizado.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))

  function abrir(acao: 'criar' | 'ingressar') {
    setErro(null)
    setAcaoAberta(acao)
  }

  async function criar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!auth || !nomeValido) return
    setEnviando(true)
    setErro(null)
    try {
      const response = await criarFamilia(auth.token, { nome: nomeNormalizado })
      if (!response.data) throw new Error('Não foi possível criar a família.')
      await recarregarFamilias()
      setFeedback(`Família "${response.data.nome}" criada com sucesso.`)
      setNome('')
      setAcaoAberta(null)
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) logout()
      else if (falha.status === 400) setErro('Ops! Parece que você não digitou um nome válido. Por favor, tente novamente.')
      else setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  async function ingressar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const codigoIngresso = codigo.trim()
    if (!auth || !codigoIngresso) return
    setEnviando(true)
    setErro(null)
    try {
      await solicitarEntrada(auth.token, { codigoIngresso })
      setFeedback('Solicitação enviada. Aguarde a aprovação de um administrador.')
      setCodigo('')
      setAcaoAberta(null)
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) logout()
      else if (falha.status === 400 || falha.status === 404) setErro('Ops! Parece que o código digitado não é válido. Por favor tente novamente.')
      else setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-page py-page text-foreground">
      <div className="flex items-center justify-between space-y-1">
        <Link
          to="/inicio"
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
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-6h6v6" />
          </svg>

          Página inicial
        </Link>

        <button
          type="button"
          onClick={logout}
          className="min-h-touch rounded-control px-page text-label-lg font-semibold text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sair da conta
        </button>
      </div>
      <div className="space-y-2 text-center">
        <img
          src={trocaFamilia}
          alt="Mercadeira — Listas que aproximam"
          className="mx-auto w-full max-w-[260px] sm:max-w-xs"
        />
      </div>
      <header className="space-y-1">
        <h1 className="text-headline-lg font-bold">Escolha uma família</h1>
        <p className="text-body-md text-foreground-muted">
          Escolha abaixo a família que deseja acompanhar.
        </p>
      </header>

      <ul className="space-y-gutter">
        {familias.map((familia) => (
          <li key={familia.id}>
            <button
              type="button"
              onClick={() => handleSelect(familia.id)}
              className="w-full rounded-card border border-foreground/20 bg-surface p-page text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <p className="text-label-lg font-semibold">{familia.nome}</p>
              <p className="mt-1 text-body-md text-foreground-muted">
                {papelLabel[familia.papel]}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {feedback && <p role="status" className="rounded-card bg-primary/10 p-gutter text-body-md text-primary">{feedback}</p>}

      <section className="grid gap-gutter border-t border-foreground/10 pt-page sm:grid-cols-2">
        <button type="button" onClick={() => abrir('criar')} className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Criar nova família
        </button>
        <button type="button" onClick={() => abrir('ingressar')} className="min-h-touch rounded-control border border-primary px-page text-label-lg font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Ingressar com código
        </button>
      </section>

      {acaoAberta && (
        <div role="dialog" aria-modal="true" aria-labelledby="acao-familia-titulo" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-page">
          <form onSubmit={acaoAberta === 'criar' ? criar : ingressar} className="w-full max-w-md space-y-gutter rounded-card bg-surface p-page shadow-soft">
            <div>
              <h2 id="acao-familia-titulo" className="text-headline-md font-semibold">{acaoAberta === 'criar' ? 'Criar nova família' : 'Ingressar com código'}</h2>
              <p className="mt-1 text-body-md text-foreground-muted">{acaoAberta === 'criar' ? 'Digite apenas o nome, sem a palavra “família”.' : 'Informe o código de ingresso compartilhado pela família.'}</p>
            </div>
            {acaoAberta === 'criar' ? (
              <label className="block text-label-lg font-semibold" htmlFor="nome-familia">Nome da família
                <input id="nome-familia" value={nome} onChange={(event) => setNome(event.target.value)} maxLength={120} autoFocus disabled={enviando} className="mt-1 min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter" />
              </label>
            ) : (
              <label className="block text-label-lg font-semibold" htmlFor="codigo-ingresso">Código de ingresso
                <input id="codigo-ingresso" value={codigo} onChange={(event) => setCodigo(event.target.value)} autoFocus disabled={enviando} className="mt-1 min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter" />
              </label>
            )}
            {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
            <div className="grid gap-gutter border-t border-foreground/10 pt-gutter sm:grid-cols-2">
              <button type="submit" disabled={enviando || (acaoAberta === 'criar' ? !nomeValido : !codigo.trim())} className="min-h-touch rounded-control bg-primary px-page text-label-lg font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-60">
                {enviando ? 'Enviando...' : acaoAberta === 'criar' ? 'Criar família' : 'Solicitar entrada'}
              </button>
              <button type="button" disabled={enviando} onClick={() => { setErro(null); setAcaoAberta(null) }} className="min-h-touch rounded-control border border-foreground/20 px-page text-label-lg font-semibold">Cancelar</button>
            </div>
          </form>
        </div>
      )}

    </main>
  )
}
