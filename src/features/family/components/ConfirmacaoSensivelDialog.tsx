import { useEffect, useRef, useState } from 'react'

type CorSemantica = 'amber' | 'error'

type Props = {
  titulo: string
  descricao: string
  rotuloConfirmar: string
  rotuloProcessando: string
  corSemantica: CorSemantica
  enviando: boolean
  erro: string | null
  onConfirmar: () => void
  onCancelar: () => void
}

function gerarCodigo() { return String(Math.floor(1000 + Math.random() * 9000)) }

export function ConfirmacaoSensivelDialog({
  titulo, descricao, rotuloConfirmar, rotuloProcessando, corSemantica, enviando, erro, onConfirmar, onCancelar,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [codigo] = useState(gerarCodigo)
  const [codigoInformado, setCodigoInformado] = useState('')
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 639px)').matches ?? false)
  const podeConfirmar = codigoInformado === codigo && !enviando
  const classeConfirmar = corSemantica === 'error'
    ? 'bg-error text-surface hover:opacity-90'
    : 'bg-amber-500 text-foreground hover:bg-amber-400'

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 639px)')
    if (!media) return
    const atualizar = () => setMobile(media.matches)
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    if (!mobile) inputRef.current?.focus()
  }, [mobile])

  function adicionarDigito(digito: string) {
    setCodigoInformado((atual) => atual.length < 4 ? atual + digito : atual)
  }

  return <dialog ref={dialogRef} aria-labelledby="confirmacao-sensivel-titulo" aria-describedby="confirmacao-sensivel-descricao"
    onCancel={(event) => { if (enviando) event.preventDefault(); else onCancelar() }}
    onClose={() => { if (!enviando) onCancelar() }}
    className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40">
    <div className="space-y-gutter">
      <div><h2 id="confirmacao-sensivel-titulo" className="text-headline-md font-semibold">{titulo}</h2>
        <p id="confirmacao-sensivel-descricao" className="mt-1 text-body-md text-foreground-muted">{descricao}</p></div>
      <div className="rounded-card border border-foreground/10 bg-foreground/5 p-gutter text-center"><p className="text-body-md">Para confirmar, digite o código:</p><p className="mt-1 font-mono text-headline-md font-bold tracking-[0.2em]">{codigo}</p></div>
      {mobile ? <div className="space-y-gutter" aria-label="Código de confirmação">
        <p className="text-label-lg font-semibold">Código de confirmação</p>
        <output aria-live="polite" aria-label={`${codigoInformado.length} de 4 dígitos informados`} className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((posicao) => <span key={posicao} className="flex min-h-touch items-center justify-center rounded-control border border-foreground/20 bg-surface font-mono text-headline-md font-semibold">{codigoInformado[posicao] || '_'}</span>)}
        </output>
        <div className="grid grid-cols-3 gap-2 border-t border-foreground/10 pt-gutter">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digito) => <button key={digito} type="button" disabled={enviando} onClick={() => adicionarDigito(digito)} className="min-h-touch rounded-control border border-foreground/20 text-headline-md font-semibold hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">{digito}</button>)}
          <button type="button" disabled={enviando || codigoInformado.length === 0} onClick={() => setCodigoInformado((atual) => atual.slice(0, -1))} aria-label="Apagar último dígito" className="min-h-touch rounded-control border border-amber-600 bg-surface text-amber-700 text-label-lg font-semibold hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">Apagar</button>
          <button type="button" disabled={enviando} onClick={() => adicionarDigito('0')} className="min-h-touch rounded-control border border-foreground/20 text-headline-md font-semibold hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">0</button>
          <button type="button" disabled={enviando || codigoInformado.length === 0} onClick={() => setCodigoInformado('')} className="min-h-touch rounded-control border border-error bg-surface text-error text-label-lg font-semibold hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">Limpar</button>
        </div>
      </div> : <label className="block text-label-lg font-semibold" htmlFor="codigo-confirmacao">Código de confirmação
        <input ref={inputRef} id="codigo-confirmacao" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={codigoInformado} disabled={enviando}
          onChange={(event) => setCodigoInformado(event.target.value.replace(/\D/g, ''))}
          className="mt-1 min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter text-center font-mono text-headline-md tracking-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" />
      </label>}
      {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-body-md text-error">{erro}</p>}
      <div className="grid gap-gutter border-t border-foreground/10 pt-gutter sm:grid-cols-2">
        <button type="button" disabled={!podeConfirmar} onClick={onConfirmar} className={`min-h-touch rounded-control px-page text-label-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${classeConfirmar}`}>{enviando ? rotuloProcessando : rotuloConfirmar}</button>
        <button type="button" disabled={enviando} onClick={onCancelar} className="min-h-touch rounded-control border border-foreground/20 px-page text-label-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">Voltar</button>
      </div>
    </div>
  </dialog>
}
