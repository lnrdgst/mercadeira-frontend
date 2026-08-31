import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { cadastrarUsuario } from '../api/authApi'
import { PasswordField } from '../components/PasswordField'

export function CadastroPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      await cadastrarUsuario({
        nome: String(formData.get('nome') || ''),
        email: String(formData.get('email') || ''),
        senha: String(formData.get('senha') || ''),
      })
      navigate('/login', { replace: true, state: { accountCreated: true } })
    } catch (error) {
      setErrorMessage(
        (error as ApiRequestError).message || 'Não foi possível criar sua conta.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-background px-page py-page text-foreground">
      <div className="w-full max-w-md space-y-page">
        <div className="space-y-1 text-center">
          <h1 className="text-headline-lg font-bold">Cadastro</h1>
          <p className="text-body-md text-foreground-muted">
            Crie sua conta para começar.
          </p>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-card bg-error/10 p-gutter text-body-md text-error">
            {errorMessage}
          </p>
        )}

        <form className="space-y-gutter" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-label-lg font-semibold" htmlFor="nome">
              Nome
            </label>
            <input
              className="min-h-touch w-full rounded-card border border-foreground/20 bg-surface px-gutter text-body-md outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              id="nome"
              name="nome"
              type="text"
              autoComplete="name"
              required
            />
          </div>
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
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />
          <button
            className="min-h-touch w-full rounded-control bg-primary px-page text-label-lg font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-body-md text-foreground-muted">
          Já possui conta?{' '}
          <Link className="font-semibold text-primary underline" to="/login">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
