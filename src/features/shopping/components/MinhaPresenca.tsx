import { useEffect, useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { presencaLabels, type CompraResponse } from '../types/shopping'

type Confirmacao = 'solicitar' | 'responsabilidade' | null

export function MinhaPresenca({ compra, usuarioId, ocupada, onSolicitar, onCancelar, onDecidir, onSair, onSolicitarResponsabilidade, onCancelarResponsabilidade, onDecidirResponsabilidade, onAtualizar }: {
  compra: CompraResponse
  usuarioId?: string
  ocupada: boolean
  onSolicitar: () => Promise<void>
  onCancelar: (solicitacaoId: string) => Promise<void>
  onDecidir: (solicitacaoId: string, decisao: 'aprovar' | 'rejeitar') => Promise<void>
  onSair: () => Promise<void>
  onSolicitarResponsabilidade: () => Promise<void>
  onCancelarResponsabilidade: (solicitacaoId: string) => Promise<void>
  onDecidirResponsabilidade: (solicitacaoId: string, decisao: 'aprovar' | 'rejeitar') => Promise<void>
  onAtualizar: () => Promise<void>
}) {
  const { logout } = useSession()
  const ativo = useRef(true)
  const enviando = useRef(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false)
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null)
  const proprio = compra.participantes.find((participante) => participante.usuarioId === usuarioId)
  const solicitacao = compra.minhaSolicitacaoPresenca
  const contexto = compra.contextoUsuario
  const responsabilidade = compra.responsabilidadeOperacional

  useEffect(() => { ativo.current = true; return () => { ativo.current = false } }, [])

  async function executar(mensagemEmAndamento: string, acao: () => Promise<void>, escrita = true) {
    if (enviando.current || ocupada || precisaAtualizar) return
    enviando.current = true
    setErro(null)
    setMensagem(mensagemEmAndamento)
    try {
      await acao()
      if (!ativo.current) return
      setConfirmacao(null)
      setPrecisaAtualizar(false)
      setMensagem('Compra atualizada.')
    } catch (error) {
      if (!ativo.current) return
      const falha = error as ApiRequestError
      setMensagem(null)
      if (falha.status === 401) { logout(); return }
      setErro(falha.message || 'Não foi possível atualizar a presença.')
      setPrecisaAtualizar(true)
      if (escrita) {
        try {
          await onAtualizar()
          if (!ativo.current) return
          setPrecisaAtualizar(false)
          setMensagem('Compra atualizada. Confira o estado antes de tentar novamente.')
        } catch (erroAtualizacao) {
          if (!ativo.current) return
          if ((erroAtualizacao as ApiRequestError).status === 401) logout()
          else setErro(`${falha.message} Não foi possível conferir o resultado. Atualize a compra antes de tentar novamente.`)
        }
      }
    } finally { enviando.current = false }
  }

  const aguardando = solicitacao?.estado === 'PENDENTE'
  const podeSolicitar = contexto.podeSolicitarPresenca === true && !aguardando
  const podeSair = contexto.podeDeclararSaida === true
  const solicitacaoResponsabilidade = compra.minhaSolicitacaoResponsabilidade
  const podeSolicitarResponsabilidade = contexto.podeSolicitarResponsabilidade === true && solicitacaoResponsabilidade?.estado !== 'PENDENTE'
  const semPresentes = responsabilidade?.responsavel == null

  return <section aria-labelledby="compra-participantes" aria-busy={ocupada} className="min-w-0 space-y-gutter">
    <h2 id="compra-participantes" className="text-headline-md font-semibold">Participantes</h2>
    <ul className="flex min-w-0 flex-wrap gap-2">
      {compra.participantes.map((participante) => {
        const estado = participante.presencaOperacional?.estado
        const meu = participante.id === proprio?.id
        const responsavel = responsabilidade?.responsavel?.participanteCompraId === participante.id
        const estilo = `inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1 rounded-control px-gutter py-2 text-label-lg break-words [overflow-wrap:anywhere] ${estado === 'PRESENTE' ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground-muted'}`
        return <li key={participante.id} className={estilo}><span className="min-w-0 font-semibold">{participante.nome}{meu && ' (você)'}</span><span aria-hidden="true">·</span><span>{presencaLabels[estado] ?? 'Presença indisponível'}</span>{responsavel && <><span aria-hidden="true">·</span><span>Responsável operacional</span></>}</li>
      })}
    </ul>
    {compra.participantes.length === 0 && <p className="text-foreground-muted">Esta compra não possui participantes.</p>}

    {proprio && <div className="space-y-gutter rounded-card bg-surface p-page shadow-soft">
      <h3 className="text-headline-md font-semibold">Minha presença no mercado</h3>
      <p className="text-body-md text-foreground-muted">A presença é uma declaração para esta compra. Ela não indica conexão, localização ou disponibilidade online.</p>
      {aguardando && <div className="space-y-2" role="status"><p className="font-semibold">Aguardando confirmação do responsável operacional.</p>{contexto.podeCancelarSolicitacaoPresenca === true && <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Cancelando solicitação...', () => onCancelar(solicitacao!.id))} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Cancelar solicitação</button>}</div>}
      {!aguardando && podeSolicitar && confirmacao !== 'solicitar' && <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => setConfirmacao('solicitar')} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Solicitar presença no mercado</button>}
      {confirmacao === 'solicitar' && <div className="space-y-2 rounded-control bg-primary/5 p-gutter" role="dialog" aria-label="Confirmar solicitação de presença"><p>{semPresentes ? 'Você será declarado presente e se tornará responsável operacional desta compra.' : 'O responsável operacional receberá sua solicitação de presença.'}</p><div className="flex flex-wrap gap-2"><button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Enviando solicitação...', onSolicitar)} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Confirmar solicitação</button><button type="button" disabled={ocupada} onClick={() => setConfirmacao(null)} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary">Voltar</button></div></div>}
      {podeSair && <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Declarando saída...', onSair)} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Não estou no mercado</button>}
      {podeSolicitarResponsabilidade && confirmacao !== 'responsabilidade' && <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => setConfirmacao('responsabilidade')} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Solicitar responsabilidade operacional</button>}
      {confirmacao === 'responsabilidade' && <div className="space-y-2 rounded-control bg-primary/5 p-gutter" role="dialog" aria-label="Confirmar solicitação de responsabilidade operacional"><p>O responsável operacional atual precisará aprovar esta transferência.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Enviando solicitação de responsabilidade...', onSolicitarResponsabilidade)} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Confirmar solicitação</button><button type="button" disabled={ocupada} onClick={() => setConfirmacao(null)} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary">Voltar</button></div></div>}
      {solicitacaoResponsabilidade?.estado === 'PENDENTE' && <div role="status" className="space-y-2"><p className="font-semibold">Aguardando decisão sobre sua solicitação de responsabilidade.</p>{contexto.podeCancelarSolicitacaoResponsabilidade === true && <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Cancelando solicitação de responsabilidade...', () => onCancelarResponsabilidade(solicitacaoResponsabilidade.id))} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Cancelar solicitação de responsabilidade</button>}</div>}
      {solicitacao && !aguardando && <p className="text-body-md text-foreground-muted">Sua última solicitação foi {solicitacao.estado.toLowerCase()}{solicitacao.motivoCancelamento ? ` (${solicitacao.motivoCancelamento})` : ''}.</p>}
    </div>}

    {compra.solicitacoesPresencaPendentes && compra.solicitacoesPresencaPendentes.length > 0 && <section aria-label="Solicitações de presença" className="space-y-gutter rounded-card bg-surface p-page shadow-soft"><h3 className="text-headline-md font-semibold">Solicitações de presença</h3><ul className="space-y-2">{compra.solicitacoesPresencaPendentes.map((pedido) => {
      const solicitante = compra.participantes.find((participante) => participante.id === pedido.solicitanteParticipanteCompraId)
      return <li key={pedido.id} className="flex flex-wrap items-center gap-2 rounded-control bg-primary/5 p-gutter"><span className="font-semibold">{solicitante?.nome ?? 'Participante'}</span><span className="text-foreground-muted">solicitou presença no mercado.</span>{pedido.acoes.podeDecidirPresenca === true && <><button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Confirmando presença...', () => onDecidir(pedido.id, 'aprovar'))} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Confirmar presença</button><button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Recusando solicitação...', () => onDecidir(pedido.id, 'rejeitar'))} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Recusar</button></>}</li>
    })}</ul></section>}
    {compra.solicitacoesResponsabilidadePendentes && compra.solicitacoesResponsabilidadePendentes.length > 0 && <section aria-label="Solicitações de responsabilidade" className="space-y-gutter rounded-card bg-surface p-page shadow-soft"><h3 className="text-headline-md font-semibold">Solicitações de responsabilidade</h3><ul className="space-y-2">{compra.solicitacoesResponsabilidadePendentes.map((pedido) => { const solicitante = compra.participantes.find((participante) => participante.id === pedido.solicitanteParticipanteCompraId); return <li key={pedido.id} className="flex flex-wrap items-center gap-2 rounded-control bg-primary/5 p-gutter"><span className="font-semibold">{solicitante?.nome ?? 'Participante'}</span><span className="text-foreground-muted">solicitou assumir a responsabilidade operacional.</span>{pedido.acoes.podeDecidirResponsabilidade === true && <><button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Aprovando responsabilidade...', () => onDecidirResponsabilidade(pedido.id, 'aprovar'))} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Aprovar responsabilidade</button><button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Rejeitando solicitação...', () => onDecidirResponsabilidade(pedido.id, 'rejeitar'))} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Rejeitar</button></>}</li> })}</ul></section>}
    {mensagem && <p role="status">{mensagem}</p>}
    {erro && <p role="alert" className="text-error">{erro}</p>}
    {precisaAtualizar && <button type="button" disabled={ocupada} onClick={() => void executar('Atualizando compra...', onAtualizar, false)} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60">Atualizar compra</button>}
  </section>
}
