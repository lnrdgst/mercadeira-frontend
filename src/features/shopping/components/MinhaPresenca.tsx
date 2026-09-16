import { useEffect, useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { presencaLabels, type DeclaracaoPresenca, type ParticipanteCompraResponse } from '../types/shopping'

export function MinhaPresenca({ participantes, usuarioId, permitida, ocupada, onAlterar, onAtualizar }: {
  participantes: ParticipanteCompraResponse[]
  usuarioId?: string
  permitida: boolean
  ocupada: boolean
  onAlterar: (estado: DeclaracaoPresenca) => Promise<void>
  onAtualizar: () => Promise<void>
}) {
  const { logout } = useSession()
  const ativo = useRef(true)
  const enviando = useRef(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false)
  const proprio = participantes.find((participante) => participante.usuarioId === usuarioId)
  const estadoAtual = proprio?.presencaOperacional?.estado
  const inicial = estadoAtual === 'NAO_INFORMADA'
  const chipRef = useRef<HTMLButtonElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const atualizarRef = useRef<HTMLButtonElement>(null)
  const devolverFoco = useRef(false)
  useEffect(() => { ativo.current = true; return () => { ativo.current = false } }, [])
  useEffect(() => {
    if (ocupada || !devolverFoco.current) return
    devolverFoco.current = false
    const destino = (precisaAtualizar ? atualizarRef.current : chipRef.current) || tituloRef.current
    destino?.focus({ preventScroll: true })
  }, [ocupada, estadoAtual, mensagem, erro, precisaAtualizar])

  async function executar(estado?: DeclaracaoPresenca) {
    if (enviando.current || ocupada || (estado && (!proprio || !permitida || precisaAtualizar))) return
    enviando.current = true
    setErro(null)
    setMensagem(estado ? 'Salvando sua declaração...' : 'Atualizando compra...')
    try {
      if (estado) await onAlterar(estado)
      else await onAtualizar()
      if (!ativo.current) return
      setPrecisaAtualizar(false)
      setMensagem(estado ? 'Presença atualizada.' : 'Compra atualizada.')
    } catch (error) {
      if (!ativo.current) return
      const falha = error as ApiRequestError
      setMensagem(null)
      if (falha.status === 401) { logout(); return }
      setErro(falha.message || 'Não foi possível alterar sua presença.')
      setPrecisaAtualizar(true)
      // Uma escrita incerta nunca é repetida: primeiro consultar o estado completo.
      if (estado) {
        try {
          await onAtualizar()
          if (!ativo.current) return
          setPrecisaAtualizar(false)
          setMensagem('Compra atualizada. Confira sua declaração antes de tentar novamente.')
        } catch (errorAtualizacao) {
          if (!ativo.current) return
          if ((errorAtualizacao as ApiRequestError).status === 401) logout()
          else setErro(`${falha.message} Não foi possível conferir o resultado. Atualize a compra antes de declarar novamente.`)
        }
      }
    } finally { enviando.current = false; devolverFoco.current = ativo.current }
  }

  return <section aria-labelledby="compra-participantes" aria-busy={ocupada} className="min-w-0 space-y-gutter">
    <h2 ref={tituloRef} tabIndex={-1} id="compra-participantes" className="text-headline-md font-semibold">Participantes</h2>
    <ul className="flex min-w-0 flex-wrap gap-2">
      {participantes.map((participante) => {
        const estado = participante.presencaOperacional?.estado
        const meu = participante.id === proprio?.id
        const alteravel = meu && permitida && (estado === 'PRESENTE' || estado === 'NAO_PRESENTE')
        const acao = estado === 'PRESENTE' ? 'Não estou no mercado' : 'Estou no mercado'
        const estilo = `inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1 rounded-control px-gutter py-2 text-label-lg break-words [overflow-wrap:anywhere] ${estado === 'PRESENTE' ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground-muted'}`
        const conteudo = <><span className="min-w-0 font-semibold">{participante.nome}{meu && ' (você)'}</span><span aria-hidden="true">·</span><span>{presencaLabels[estado] ?? 'Presença indisponível'}</span></>
        return <li key={participante.id} className="min-w-0 max-w-full">
          {alteravel ? <button ref={chipRef} type="button" disabled={ocupada || precisaAtualizar} aria-label={`${participante.nome} (você): ${presencaLabels[estado]}. ${estado === 'PRESENTE' ? 'Sair' : 'Entrar'}: ${acao}`} onClick={() => void executar(estado === 'PRESENTE' ? 'NAO_PRESENTE' : 'PRESENTE')} className={`${estilo} min-h-touch border border-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60`}>
            {conteudo}<span className="font-semibold underline">· {estado === 'PRESENTE' ? 'Sair' : 'Entrar'}</span>
          </button> : <span className={estilo}>{conteudo}</span>}
        </li>
      })}
    </ul>
    {participantes.length === 0 && <p className="text-foreground-muted">Esta compra não possui participantes.</p>}
    {inicial && <div className="space-y-gutter rounded-card bg-surface p-page shadow-soft">
    <h3 className="text-headline-md font-semibold">Minha presença no mercado</h3>
    <p className="text-body-md text-foreground-muted">Declare se você está executando esta compra presencialmente. Essa declaração não indica conexão nem localização.</p>
    {permitida && <div className="flex flex-col gap-2 sm:flex-row">
      <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('PRESENTE')} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Estou no mercado</button>
      <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('NAO_PRESENTE')} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Não estou no mercado</button>
    </div>}
    {!permitida && <p className="text-foreground-muted">A declaração de presença não está disponível para você nesta compra.</p>}
    </div>}
    {mensagem && <p role="status">{mensagem}</p>}
    {erro && <p role="alert" className="text-error">{erro}</p>}
    {precisaAtualizar && <button ref={atualizarRef} type="button" disabled={ocupada} onClick={() => void executar()} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Atualizar compra</button>}
  </section>
}
