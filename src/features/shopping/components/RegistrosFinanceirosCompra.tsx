import { useMemo, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { Modal } from '../../../shared/components/Modal'
import { formatarValorMonetario } from '../../../shared/formatarValorMonetario'
import { adicionarRegistroFinanceiroCompra, removerRegistroFinanceiroCompra } from '../api/shoppingApi'
import type { CompraResponse } from '../types/shopping'
import { TecladoMonetario } from './TecladoMonetario'
import { converterValorMonetario } from './valorMonetario'

type Props = {
  compra: CompraResponse
  token: string
  familiaId: string
  listaId: string
  onAtualizar: (compra: CompraResponse) => void
  onNaoAutorizado: () => void
}

export function RegistrosFinanceirosCompra({ compra, token, familiaId, listaId, onAtualizar, onNaoAutorizado }: Props) {
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')
  const [estabelecimentoNome, setEstabelecimentoNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const podeGerenciar = compra.contextoUsuario.podeGerenciarRegistrosFinanceiros === true
  const registros = compra.registrosFinanceiros ?? []
  const temValorPago = registros.length > 0
  const valorPago = compra.totalRegistrado ?? registros.reduce((total, registro) => total + registro.valor, 0)
  const totalRegistradoPorItem = compra.totalItensComprados ?? 0
  const diferenca = temValorPago && totalRegistradoPorItem > 0 ? totalRegistradoPorItem - valorPago : null
  const totalPagoFormatado = useMemo(() => formatarValorMonetario(valorPago), [valorPago])
  const totalItensFormatado = useMemo(() => formatarValorMonetario(totalRegistradoPorItem), [totalRegistradoPorItem])
  const quantidadeItensSemPreco = compra.quantidadeItensNoCarrinhoSemPreco ?? 0

  function abrir() {
    setValor('')
    setEstabelecimentoNome(compra.estabelecimentoLista ?? compra.estabelecimento ?? '')
    setErro(null)
    setAberto(true)
  }

  async function adicionar() {
    const valorConvertido = converterValorMonetario(valor)
    if (valorConvertido === null) {
      setErro('Informe um valor maior que zero, com no máximo duas casas decimais.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      const atualizada = await adicionarRegistroFinanceiroCompra(token, familiaId, listaId, {
        valor: valorConvertido,
        estabelecimentoNome: estabelecimentoNome.trim() || null,
      })
      onAtualizar(atualizada)
      setAberto(false)
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) onNaoAutorizado()
      else setErro(falha.message || 'N\u00e3o foi poss\u00edvel adicionar o valor.')
    } finally {
      setEnviando(false)
    }
  }

  async function remover(registroId: string) {
    if (enviando) return
    if (!window.confirm('Remover este valor da compra?')) return
    setEnviando(true)
    setErro(null)
    try {
      onAtualizar(await removerRegistroFinanceiroCompra(token, familiaId, listaId, registroId))
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) onNaoAutorizado()
      else setErro(falha.message || 'N\u00e3o foi poss\u00edvel remover o valor.')
    } finally {
      setEnviando(false)
    }
  }

  function diferencaFormatada() {
    if (diferenca === null) return null
    if (diferenca === 0) return formatarValorMonetario(0)
    return `${diferenca > 0 ? '+' : '-'} ${formatarValorMonetario(Math.abs(diferenca))}`
  }

  const classeDiferenca = diferenca === null
    ? ''
    : diferenca < 0 ? 'text-error'
      : diferenca > 0 ? 'text-primary'
        : 'text-foreground'

  return <section aria-labelledby="registros-financeiros-titulo" className="space-y-gutter rounded-card border border-foreground/10 bg-surface p-page shadow-soft">
    <div className="flex flex-wrap items-center justify-between gap-gutter">
      <div className="min-w-0 w-full space-y-2">
        <h2
          id="registros-financeiros-titulo"
          className="w-full border-b border-foreground/15 pb-2 text-headline-sm font-semibold"
        >
          Valores da compra
        </h2>
        <div className="space-y-0.5 text-body-md text-foreground-muted">
          <p>Total registrado por item: <strong className="text-foreground">{totalItensFormatado}</strong></p>
          {temValorPago && <p>Valor pago da compra: <strong className="text-foreground">{totalPagoFormatado}</strong></p>}
          {diferenca !== null && <p>Diferença: <strong className={classeDiferenca}>{diferencaFormatada()}</strong></p>}
          {quantidadeItensSemPreco > 0 && <p className="text-warning">{quantidadeItensSemPreco} {quantidadeItensSemPreco === 1 ? 'item ainda está sem preço registrado.' : 'itens ainda estão sem preço registrado.'}</p>}
        </div>
      </div>
      {podeGerenciar && <button type="button" onClick={abrir} className="min-h-touch w-full rounded-control border border-primary px-page font-semibold text-primary">{temValorPago ? 'Adicionar outro R$' : 'Informar R$ pago desta compra'}</button>}
    </div>
    {erro && !aberto && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
    {registros.length === 0
      ? <p className="text-body-md text-foreground-muted">Nenhum valor foi registrado nesta compra.</p>
      : <ul className="divide-y divide-foreground/10">
        {registros.map((registro) => <li key={registro.id} className="flex items-center justify-between gap-gutter py-gutter">
          <div>
            <p className="font-semibold">{formatarValorMonetario(registro.valor)}</p>
            {registro.estabelecimentoNome && <p className="text-body-sm text-foreground-muted">{registro.estabelecimentoNome}</p>}
          </div>
          {podeGerenciar && <button type="button" disabled={enviando} onClick={() => void remover(registro.id)} className="min-h-touch rounded-control px-gutter font-semibold text-error disabled:opacity-60">Remover</button>}
        </li>)}
      </ul>}
    <Modal open={aberto} onClose={() => { if (!enviando) setAberto(false) }} ariaLabelledBy="adicionar-valor-titulo" closeDisabled={enviando} panelClassName="max-w-md">
      <div className="space-y-page overflow-y-auto p-page">
        <div>
          <h2 id="adicionar-valor-titulo" className="text-headline-md font-semibold">Adicionar valor</h2>
          <p className="text-body-md text-foreground-muted">Registre um valor pago nesta compra.</p>
        </div>
        {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
        <TecladoMonetario valor={valor} disabled={enviando} onAlterar={setValor} onConfirmar={() => void adicionar()} />
        <label className="block space-y-1">
          <span className="font-semibold">Estabelecimento <span className="font-normal text-foreground-muted">(opcional)</span></span>
          <input type="text" maxLength={120} value={estabelecimentoNome} onChange={(event) => setEstabelecimentoNome(event.target.value)} className="min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter" />
        </label>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={enviando} onClick={() => void adicionar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Registrando...' : 'Adicionar valor'}</button>
          <button type="button" disabled={enviando} onClick={() => setAberto(false)} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Cancelar</button>
        </div>
      </div>
    </Modal>
  </section>
}
