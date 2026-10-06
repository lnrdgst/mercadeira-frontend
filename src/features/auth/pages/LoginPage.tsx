import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { PasswordField } from '../components/PasswordField'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useSession } from '../session/sessionContext'
import logoMercadeira from '../../../assets/branding/mercadeira/logo-mercadeira.png'

export function LoginPage() {
  const { authenticate, authenticateGoogle, vincularGoogle } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [googleCredential, setGoogleCredential] = useState<string | null>(null)
  const [senhaVinculo, setSenhaVinculo] = useState('')
  const accountCreated = Boolean(
    (location.state as { accountCreated?: boolean } | null)?.accountCreated,
  )
  const manual = location.pathname.endsWith('/manual')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      await authenticate({
        email: String(formData.get('email') || ''),
        senha: String(formData.get('senha') || ''),
      })

      navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage(
        (error as ApiRequestError).message || 'Não foi possível entrar.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const receberCredentialGoogle = useCallback(async (credential: string) => {
    setErrorMessage(null)
    try {
      const requerVinculo = await authenticateGoogle(credential)
      if (requerVinculo) setGoogleCredential(credential)
      else navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage((error as ApiRequestError).message || 'NÃ£o foi possÃ­vel entrar com Google.')
    }
  }, [authenticateGoogle, navigate])

  const erroGoogle = useCallback((message: string) => setErrorMessage(message), [])

  async function confirmarVinculo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!googleCredential) return
    setIsSubmitting(true); setErrorMessage(null)
    try {
      await vincularGoogle(googleCredential, senhaVinculo)
      navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage((error as ApiRequestError).message || 'NÃ£o foi possÃ­vel vincular sua Conta Google.')
    } finally { setIsSubmitting(false) }
  }

  return (
    <main className="min-h-[100svh] bg-background px-page py-6 text-foreground sm:flex sm:items-center sm:justify-center sm:py-page">
      <div className="mx-auto w-full max-w-md space-y-5 sm:space-y-page">
        <div className="space-y-2 text-center">
          <img
            src={logoMercadeira}
            alt="Mercadeira — Listas que aproximam"
            className="mx-auto w-full max-w-[260px] sm:max-w-xs"
          />

          <h1 className="text-headline-lg font-bold">Login</h1>

          <p className="text-body-md text-foreground-muted">
            Entre para gerenciar e acompanhar suas listas de compras.
          </p>
        </div>

        {accountCreated && (
          <p role="status" className="rounded-card bg-primary/10 p-gutter text-body-md text-primary">
            Conta criada com sucesso. Entre para continuar.
          </p>
        )}

        {errorMessage && (
          <p role="alert" className="rounded-card bg-error/10 p-gutter text-body-md text-error">
            {errorMessage}
          </p>
        )}

        {!manual && <div className="space-y-3">
          <GoogleSignInButton onCredential={receberCredentialGoogle} onError={erroGoogle} />
          <p className="text-center text-body-sm text-foreground-muted">ou entre com e-mail e senha</p>
          <Link className="block text-center font-semibold text-primary underline" to="/login/manual">Clicando aqui</Link>
        </div>}

        {!manual && googleCredential && (
          <form onSubmit={confirmarVinculo} className="space-y-gutter rounded-card border border-primary/30 bg-primary/5 p-page">
            <div><h2 className="text-headline-md font-semibold">Encontramos uma conta existente</h2><p className="mt-1 text-body-md text-foreground-muted">Confirme sua senha atual uma Ãºnica vez para vincular sua Conta Google.</p></div>
            <PasswordField id="senha-vinculo-google" label="Senha atual" name="senhaAtual" autoComplete="current-password" value={senhaVinculo} onChange={(event) => setSenhaVinculo(event.target.value)} required disabled={isSubmitting} />
            <div className="flex gap-gutter"><button className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60" disabled={isSubmitting}>{isSubmitting ? 'Vinculando...' : 'Vincular e entrar'}</button><button className="min-h-touch rounded-control px-page font-semibold text-foreground" type="button" onClick={() => { setGoogleCredential(null); setSenhaVinculo('') }}>Cancelar</button></div>
          </form>
        )}

        {manual && <><Link className="block text-body-sm font-semibold text-primary" to="/login">← Voltar</Link><form className="space-y-gutter" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-label-lg font-semibold" htmlFor="email">
              E-mail
            </label>
            <input
              className="min-h-touch w-full rounded-card border border-foreground/20 bg-surface px-gutter text-body-md outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <PasswordField
            id="senha"
            label="Senha"
            name="senha"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
          />
          <Link className="block text-right text-body-sm font-semibold text-primary" to="/esqueci-senha">Esqueci minha senha</Link>
          <button
            className="min-h-touch w-full rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form></>}

        <p className="text-center text-body-md text-foreground-muted">
          Ainda não possui conta?{' '}
          <Link className="font-semibold text-primary underline" to="/cadastro">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
