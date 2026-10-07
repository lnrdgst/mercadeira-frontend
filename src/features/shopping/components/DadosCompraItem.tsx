import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { formatarValorMonetario } from '../../../shared/formatarValorMonetario'
import type { AtualizarDadosItemCompraRequest, ItemCompraResponse } from '../types/shopping'
import { converterNumeroBrasileiro } from './dadosCompraItemValor'
import { TecladoMonetario } from './TecladoMonetario'
import { valorValido } from './valorMonetario'

type Props = {
  item: ItemCompraResponse
  disabled: boolean
  podeEditar: boolean
  onSalvar: (dados: AtualizarDadosItemCompraRequest) => Promise<void>
}

function formatarNumeroParaEdicao(valor: number | null | undefined, casasDecimais: number) {
  if (valor === null || valor === undefined) return ''
  return valor.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: casasDecimais })
}

export function DadosCompraItem({ item, disabled, podeEditar, onSalvar }: Props) {
  const [aberto, setAberto] = useState(false)
  const [preco, setPreco] = useState('')
  const [precoEmEdicao, setPrecoEmEdicao] = useState('')
  const [tecladoPrecoAberto, setTecladoPrecoAberto] = useState(false)
  const [quantidade, setQuantidade] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const possuiDados = (item.precoUnitario !== null && item.precoUnitario !== undefined) || (item.quantidadeComprada !== null && item.quantidadeComprada !== undefined)

  function abrir() {
    setPreco(formatarNumeroParaEdicao(item.precoUnitario, 4))
    setPrecoEmEdicao('')
    setTecladoPrecoAberto(false)
    setQuantidade(item.quantidadeComprada === null || item.quantidadeComprada === undefined ? '1' : formatarNumeroParaEdicao(item.quantidadeComprada, 3))
    setErro(null)
    setAberto(true)
  }

  function alterarQuantidade(delta: -1 | 1) {
    const atual = converterNumeroBrasileiro(quantidade, 3) ?? 0
    const proximo = Math.max(0, atual + delta)
    setQuantidade(proximo === 0 ? '' : formatarNumeroParaEdicao(proximo, 3))
  }

  function alterarPreco(valor: string) {
    const proximoPreco = valor.replace(/[^0-9,.]/g, '')
    setPreco(proximoPreco)
    if (converterNumeroBrasileiro(proximoPreco, 4) !== null && !quantidade.trim()) setQuantidade('1')
  }

  function abrirTecladoPreco() {
    setPrecoEmEdicao(preco)
    setTecladoPrecoAberto(true)
  }

  function confirmarPreco() {
    alterarPreco(precoEmEdicao)
    setTecladoPrecoAberto(false)
  }

  function fecharEditor() {
    setTecladoPrecoAberto(false)
    setAberto(false)
  }

  async function salvar() {
    const precoUnitario = converterNumeroBrasileiro(preco, 4)
    const quantidadeComprada = converterNumeroBrasileiro(quantidade, 3)
    if (preco.trim() && precoUnitario === null) {
      setErro('Informe um preço unitário maior que zero.')
      return
    }
    if (quantidade.trim() && quantidadeComprada === null) {
      setErro('Informe uma quantidade maior que zero.')
      return
    }
    if (precoUnitario !== null && quantidadeComprada === null) {
      setErro('Informe a quantidade comprada junto com o preço.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await onSalvar({ precoUnitario, quantidadeComprada })
      setAberto(false)
    } catch (error) {
      setErro(error instanceof Error && error.message ? error.message : 'Não foi possível atualizar os dados deste item.')
    } finally {
      setSalvando(false)
    }
  }

  const resumo = item.precoUnitario !== null && item.precoUnitario !== undefined && item.quantidadeComprada !== null && item.quantidadeComprada !== undefined && item.valorTotal !== null && item.valorTotal !== undefined
    ? <div className="space-y-1 text-body-sm text-foreground-muted">
      <p>Preço unitário: <strong className="text-foreground">{formatarValorMonetario(item.precoUnitario)}</strong></p>
      <p>Quantidade: <strong className="text-foreground">{item.quantidadeComprada.toLocaleString('pt-BR')}</strong></p>
      <p>Total: <strong className="text-foreground">{formatarValorMonetario(item.valorTotal)}</strong></p>
    </div>
    : item.quantidadeComprada !== null && item.quantidadeComprada !== undefined
      ? <p className="text-body-sm text-foreground-muted">Quantidade: <strong className="text-foreground">{item.quantidadeComprada.toLocaleString('pt-BR')}</strong> · Preço não informado</p>
      : <p className="text-body-sm text-foreground-muted">Preço não informado</p>

  return <section aria-label={`Dados da compra: ${item.descricao}`} className="relative w-full space-y-2 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-gutter py-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className={`min-w-0 text-label-lg font-semibold ${aberto ? 'pr-touch' : ''}`}>Dados da compra</h4>
      {!aberto && podeEditar && <button type="button" disabled={disabled || salvando} onClick={abrir} className="min-h-touch shrink-0 rounded-full border border-primary px-3 py-1 text-label-md font-semibold leading-none text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">{possuiDados ? 'Alterar R$' : 'Informar R$'}</button>}
    </div>
    {!aberto && resumo}
    {aberto && podeEditar && <button type="button" disabled={disabled || salvando} onClick={fecharEditor} aria-label="Cancelar edição" title="Cancelar edição" className="absolute right-2 top-2 flex min-h-touch min-w-touch items-center justify-center rounded-control text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-60">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2.25" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </button>}
    {aberto && podeEditar && <div className="space-y-3 pt-1">
      {erro && <p role="alert" className="w-full break-words rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
      <label className="block space-y-1">
        <span className="font-semibold">Preço unitário <span className="font-normal text-foreground-muted">(opcional)</span></span>
        <button type="button" aria-label="Preço unitário" disabled={disabled || salvando} onClick={abrirTecladoPreco} className="flex min-h-touch w-full items-center rounded-control border border-foreground/20 bg-surface px-gutter text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">
          <span className="mr-2 text-foreground-muted">R$</span>
          <span className="min-w-0 flex-1 py-3">{preco || '0,00'}</span>
        </button>
      </label>
      <div className="space-y-1">
        <span className="font-semibold">Quantidade comprada <span className="font-normal text-foreground-muted">(opcional sem preço)</span></span>
        <div className="flex max-w-xs items-center gap-2">
          <button type="button" disabled={disabled || salvando || !converterNumeroBrasileiro(quantidade, 3)} onClick={() => alterarQuantidade(-1)} aria-label="Diminuir quantidade" className="min-h-touch w-12 rounded-control border border-foreground/20 font-semibold disabled:opacity-60">−</button>
          <input type="text" aria-label="Quantidade comprada" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" enterKeyHint="done" autoComplete="off" value={quantidade} onChange={(event) => setQuantidade(event.target.value.replace(/[^0-9,.]/g, ''))} placeholder="0" className="min-h-touch min-w-0 flex-1 rounded-control border border-foreground/20 bg-surface px-gutter text-center" />
          <button type="button" disabled={disabled || salvando} onClick={() => alterarQuantidade(1)} aria-label="Aumentar quantidade" className="min-h-touch w-12 rounded-control border border-foreground/20 font-semibold disabled:opacity-60">+</button>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled || salvando}
        onClick={() => void salvar()}
        className="min-h-touch w-full rounded-control border border-primary bg-transparent px-page font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar R$"}
      </button>
    </div>}
    <Modal open={tecladoPrecoAberto} onClose={() => setTecladoPrecoAberto(false)} ariaLabelledBy="editar-preco-unitario-titulo" panelClassName="max-w-md">
      <div className="space-y-page overflow-y-auto p-page">
        <div>
          <h5 id="editar-preco-unitario-titulo" className="text-headline-md font-semibold">Preço unitário</h5>
          <p className="text-body-md text-foreground-muted">Informe o preço pago por uma unidade.</p>
        </div>
        <TecladoMonetario valor={precoEmEdicao} disabled={disabled || salvando} onAlterar={setPrecoEmEdicao} onConfirmar={confirmarPreco} />
        <div className="flex flex-col gap-2">
          <button type="button" disabled={disabled || salvando || (precoEmEdicao !== '' && !valorValido(precoEmEdicao))} onClick={confirmarPreco} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Confirmar</button>
          <button type="button" disabled={disabled || salvando} onClick={() => setTecladoPrecoAberto(false)} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Cancelar</button>
        </div>
      </div>
    </Modal>
  </section>
}
