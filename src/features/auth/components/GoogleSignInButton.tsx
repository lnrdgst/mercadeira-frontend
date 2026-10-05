import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (configuration: { client_id: string; callback: (response: { credential: string }) => void }) => void
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
    } } }
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function carregarGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existente = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null
    if (existente) {
      existente.addEventListener('load', () => resolve(), { once: true })
      existente.addEventListener('error', () => reject(new Error('Nao foi possivel carregar o login Google.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Nao foi possivel carregar o login Google.'))
    document.head.append(script)
  })
}

export function GoogleSignInButton({ onCredential, onError }: {
  onCredential: (credential: string) => void
  onError: (message: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!clientId || !container.current) return
    let ativo = true
    void carregarGoogleIdentityServices().then(() => {
      if (!ativo || !container.current || !window.google?.accounts.id) return
      window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => onCredential(credential) })
      window.google.accounts.id.renderButton(container.current, { theme: 'outline', size: 'large', text: 'continue_with', width: 384, locale: 'pt-BR' })
    }).catch((error: Error) => { if (ativo) onError(error.message) })
    return () => { ativo = false }
  }, [onCredential, onError])

  if (!clientId) return null
  return <div className="flex justify-center" ref={container} aria-label="Continuar com Google" />
}
