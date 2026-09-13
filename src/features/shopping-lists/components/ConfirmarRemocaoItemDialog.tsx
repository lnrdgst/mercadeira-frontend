import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

interface Props {
  descricao: string
  focoAposRemocao: RefObject<HTMLHeadingElement | null>
  onConfirmar: () => Promise<void>
  onCancelar: () => void
}

export function ConfirmarRemocaoItemDialog({ descricao, focoAposRemocao, onConfirmar, onCancelar }: Props) {
  const tituloId = useId()
  const descricaoId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const cancelarRef = useRef<HTMLButtonElement>(null)
  const confirmarRef = useRef<HTMLButtonElement>(null)
  const enviandoRef = useRef(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current!
    const acionador = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const tituloItens = focoAposRemocao.current
    dialog.showModal()
    cancelarRef.current?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      const destino = acionador?.isConnected ? acionador : tituloItens
      if (destino?.isConnected) destino.focus({ preventScroll: true })
    }
  }, [focoAposRemocao])

  function cancelar() {
    if (!enviandoRef.current) onCancelar()
  }

  function controlarTeclado(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelar()
    }
    if (event.key !== 'Tab') return
    if (enviandoRef.current) {
      event.preventDefault()
      tituloRef.current?.focus()
      return
    }
    // Dois controles: mantém a navegação circular inclusive com Shift+Tab.
    if (event.shiftKey && document.activeElement === cancelarRef.current) {
      event.preventDefault()
      confirmarRef.current?.focus()
    } else if (!event.shiftKey && document.activeElement === confirmarRef.current) {
      event.preventDefault()
      cancelarRef.current?.focus()
    }
  }

  async function confirmar() {
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    tituloRef.current?.focus({ preventScroll: true })
    try {
      await onConfirmar()
    } catch (error) {
      setErro((error as Error).message || 'Não foi possível remover o item.')
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return <dialog ref={dialogRef} aria-labelledby={tituloId} aria-describedby={descricaoId}
    onCancel={(event) => { event.preventDefault(); cancelar() }} onKeyDown={controlarTeclado}
    className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md space-y-gutter overflow-y-auto rounded-card border border-error/20 bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40">
    <h2 id={tituloId} ref={tituloRef} tabIndex={-1} className="text-headline-md font-semibold">Remover este item da lista?</h2>
    <p id={descricaoId} className="break-words text-body-md text-foreground-muted">O item “{descricao}” será removido desta lista.</p>
    {erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
    {enviando && <p role="status" className="text-body-md text-foreground-muted">Removendo item...</p>}
    <div className="flex flex-col gap-gutter sm:flex-row">
      <button ref={cancelarRef} type="button" disabled={enviando} onClick={cancelar} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">Cancelar</button>
      <button ref={confirmarRef} type="button" disabled={enviando} onClick={() => void confirmar()} className="min-h-touch rounded-control bg-error px-page font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-60">Remover</button>
    </div>
  </dialog>
}
