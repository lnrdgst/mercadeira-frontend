import type { KeyboardEvent } from 'react'
import { valorValido } from './valorMonetario'

type Props = {
  valor: string
  disabled?: boolean
  onAlterar: (valor: string) => void
  onConfirmar: () => void
}

function adicionar(valor: string, tecla: string) {
  if (/^\d$/.test(tecla)) {
    const [, decimais] = valor.split(',')
    if (decimais !== undefined && decimais.length >= 2) return valor
    return valor + tecla
  }
  if (tecla === ',' && !valor.includes(',')) return `${valor || '0'},`
  return valor
}

export function TecladoMonetario({ valor, disabled = false, onAlterar, onConfirmar }: Props) {
  function pressionar(tecla: string) {
    if (!disabled) onAlterar(adicionar(valor, tecla))
  }

  function teclaFisica(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      pressionar(event.key)
    } else if (event.key === ',' || event.key === '.') {
      event.preventDefault()
      pressionar(',')
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      onAlterar(valor.slice(0, -1))
    } else if (event.key === 'Enter' && valorValido(valor)) {
      event.preventDefault()
      onConfirmar()
    }
  }

  return <div tabIndex={0} onKeyDown={teclaFisica} aria-label="Teclado monetário" className="space-y-2 rounded-card bg-foreground/5 p-gutter focus-visible:outline-2 focus-visible:outline-primary">
    <output aria-live="polite" aria-label="Valor informado" className="block min-h-touch rounded-control border border-foreground/20 bg-surface px-gutter py-3 text-right text-headline-md font-semibold">R$ {valor || '0'}</output>
    <div className="grid grid-cols-3 gap-2">
      {'123456789'.split('').map((tecla) => <button key={tecla} type="button" disabled={disabled} onClick={() => pressionar(tecla)} aria-label={`Número ${tecla}`} className="min-h-touch rounded-control bg-surface text-headline-sm font-semibold shadow-soft disabled:opacity-60">{tecla}</button>)}
      <button type="button" disabled={disabled} onClick={() => pressionar(',')} aria-label="Vírgula decimal" className="min-h-touch rounded-control bg-surface text-headline-sm font-semibold shadow-soft disabled:opacity-60">,</button>
      <button type="button" disabled={disabled} onClick={() => pressionar('0')} aria-label="Número 0" className="min-h-touch rounded-control bg-surface text-headline-sm font-semibold shadow-soft disabled:opacity-60">0</button>
      <button type="button" disabled={disabled || !valor} onClick={() => onAlterar(valor.slice(0, -1))} aria-label="Apagar último dígito" className="min-h-touch rounded-control bg-surface text-headline-sm font-semibold shadow-soft disabled:opacity-60">⌫</button>
    </div>
  </div>
}
