import { useRef, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { ConfirmacaoSensivelDialog } from '../../family/components/ConfirmacaoSensivelDialog'
import { encerrarCompraAdministrativamente } from '../api/shoppingApi'
import type { CompraResponse } from '../types/shopping'

type Props = {
  compra: CompraResponse
  token: string
  familiaId: string
  listaId: string
  bloqueada?: boolean
  compacto?: boolean
  executar?: (acao: () => Promise<void>) => Promise<void>
  onSucesso: () => void
  onReconciliar: () => Promise<void>
  onNaoAutorizado: () => void
}

export function EncerramentoAdministrativoCompra({ compra, token, familiaId, listaId, bloqueada = false, compacto = false, executar, onSucesso, onReconciliar, onNaoAutorizado }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const enviandoRef = useRef(false)
  if (compra.status !== 'EM_ANDAMENTO' || compra.contextoUsuario.podeEncerrarCompraAdministrativamente !== true) return null

  async function confirmar() {
    if (enviandoRef.current || bloqueada || compra.contextoUsuario.podeEncerrarCompraAdministrativamente !== true) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    try {
      const acao = async () => { await encerrarCompraAdministrativamente(token, familiaId, listaId) }
      if (executar) await executar(acao)
      else await acao()
      onSucesso()
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) { onNaoAutorizado(); return }
      const mensagem = falha.message || 'Não foi possível encerrar a compra.'
      setErro(mensagem)
      if (falha.status === 409) {
        try {
          await onReconciliar()
          setConfirmando(false)
          setErro(`${mensagem} A compra foi atualizada com o estado atual.`)
        } catch (erroAtualizacao) {
          const falhaAtualizacao = erroAtualizacao as ApiRequestError
          if (falhaAtualizacao.status === 401) onNaoAutorizado()
          else setErro(`${mensagem} Não foi possível atualizar a compra. ${falhaAtualizacao.message || ''}`.trim())
        }
      }
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  const bloqueio = enviando || bloqueada
  return <>
    <section aria-labelledby="encerramento-administrativo" className={compacto ? 'space-y-gutter rounded-card border border-amber-500/40 bg-amber-50/60 p-gutter' : 'space-y-gutter rounded-card border border-amber-500/40 bg-amber-50/60 p-page'}>
      <div className="space-y-1">
        <h2 id="encerramento-administrativo" className="text-headline-md font-semibold text-amber-900">Encerramento administrativo</h2>
        <p className="text-body-md text-foreground-muted">{compacto ? 'Você não pode finalizar esta compra pelo fluxo operacional. Como administrador(a) da família, pode encerrá-la caso ela não esteja mais sendo realizada.' : 'Como administrador(a) da família, você pode encerrar esta compra caso ela não esteja mais sendo realizada.'}</p>
      </div>
      <button type="button" disabled={bloqueio} onClick={() => { setErro(null); setConfirmando(true) }} className="min-h-touch rounded-control border border-amber-600 bg-amber-100 px-page font-semibold text-amber-900 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-60">Encerrar compra</button>
    </section>
    {confirmando && <ConfirmacaoSensivelDialog titulo="Encerrar esta compra?" descricao="O encerramento finalizará a compra com o estado atual dos itens. Use esta opção quando a compra não estiver mais sendo realizada." rotuloConfirmar="Confirmar encerramento" rotuloProcessando="Encerrando compra..." corSemantica="amber" enviando={bloqueio} erro={erro} onConfirmar={() => void confirmar()} onCancelar={() => { if (!bloqueio) { setConfirmando(false); setErro(null) } }} />}
  </>
}
