import { useRef, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { formatarValorMonetario } from '../../../shared/formatarValorMonetario'
import type { ItemCompraResponse, LancamentoItemCompraResponse, SalvarLancamentoItemCompraRequest } from '../types/shopping'
import { converterNumeroBrasileiro } from './dadosCompraItemValor'
import { LeituraPrecoDialog } from './LeituraPrecoDialog'
import { TecladoMonetario } from './TecladoMonetario'
import { valorValido } from './valorMonetario'

type Props = {
  item: ItemCompraResponse
  disabled: boolean
  podeGerenciar: boolean
  onCriar: (dados: SalvarLancamentoItemCompraRequest) => Promise<void>
  onAtualizar: (lancamentoId: string, dados: SalvarLancamentoItemCompraRequest) => Promise<void>
  onRemover: (lancamentoId: string) => Promise<void>
  token?: string
  familiaId?: string
  listaId?: string
}

type Etapa = 'preco' | 'quantidade'

function formatarNumero(valor: number) {
  return valor.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 3 })
}

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function DadosCompraItem({ item, disabled, podeGerenciar, onCriar, onAtualizar, onRemover, token, familiaId, listaId }: Props) {
  const [etapa, setEtapa] = useState<Etapa | null>(null)
  const [preco, setPreco] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [editando, setEditando] = useState<LancamentoItemCompraResponse | null>(null)
  const [leituraAberta, setLeituraAberta] = useState(false)
  const [paraRemover, setParaRemover] = useState<LancamentoItemCompraResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const enviando = useRef(false)
  const lancamentos = item.lancamentos ?? []

  function abrirNovo() { setEditando(null); setPreco(''); setQuantidade('1'); setErro(null); setEtapa('preco') }
  function abrirEdicao(lancamento: LancamentoItemCompraResponse) { setEditando(lancamento); setPreco(formatarPreco(lancamento.precoUnitario)); setQuantidade(formatarNumero(lancamento.quantidade)); setErro(null); setEtapa('preco') }
  function fecharEtapas() { if (!salvando) { setEtapa(null); setLeituraAberta(false) } }
  function confirmarPreco() { if (valorValido(preco)) { setErro(null); setEtapa('quantidade') } }
  function usarPrecoLido(valor: number) { setPreco(formatarPreco(valor)); setLeituraAberta(false); setErro(null); setEtapa('quantidade') }
  function alterarQuantidade(delta: -1 | 1) { const proximo = Math.max(0, (converterNumeroBrasileiro(quantidade, 3) ?? 0) + delta); setQuantidade(proximo === 0 ? '' : formatarNumero(proximo)) }

  async function confirmarQuantidade() {
    if (enviando.current || disabled || !podeGerenciar) return
    const precoUnitario = converterNumeroBrasileiro(preco, 2)
    const quantidadeNumerica = converterNumeroBrasileiro(quantidade, 3)
    if (precoUnitario === null) { setErro('Informe um preço unitário maior que zero.'); setEtapa('preco'); return }
    if (quantidadeNumerica === null) { setErro('Informe uma quantidade maior que zero.'); return }
    enviando.current = true; setSalvando(true); setErro(null)
    try {
      const dados = { precoUnitario, quantidade: quantidadeNumerica }
      if (editando) await onAtualizar(editando.id, dados)
      else await onCriar(dados)
      setEtapa(null); setEditando(null)
    } catch (error) { setErro(error instanceof Error && error.message ? error.message : 'Não foi possível salvar este lançamento.') }
    finally { enviando.current = false; setSalvando(false) }
  }

  async function confirmarRemocao() {
    if (!paraRemover || enviando.current || disabled || !podeGerenciar) return
    enviando.current = true; setSalvando(true); setErro(null)
    try { await onRemover(paraRemover.id); setParaRemover(null) }
    catch (error) { setErro(error instanceof Error && error.message ? error.message : 'Não foi possível remover este lançamento.') }
    finally { enviando.current = false; setSalvando(false) }
  }

  return <section aria-label={`Valores registrados: ${item.descricao}`} className="space-y-2 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-gutter py-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-label-lg font-semibold">Valores registrados</h4>{podeGerenciar && <button type="button" disabled={disabled || salvando} onClick={abrirNovo} className="min-h-touch rounded-full border border-primary px-3 py-1 text-label-md font-semibold leading-none text-primary hover:bg-primary/5 disabled:opacity-60">{lancamentos.length ? 'Registrar outro preço' : 'Informar preço'}</button>}</div>
    {lancamentos.length === 0 ? <p className="text-body-sm text-foreground-muted">Preço não informado</p> : <ul className="space-y-2">{lancamentos.map((lancamento) => <li key={lancamento.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface px-gutter py-2 text-body-sm"><p><strong>{formatarValorMonetario(lancamento.precoUnitario)}</strong> × {lancamento.quantidade.toLocaleString('pt-BR')}<span className="text-foreground-muted"> · {formatarValorMonetario(lancamento.valorTotal ?? lancamento.precoUnitario * lancamento.quantidade)}</span></p>{podeGerenciar && <div className="flex gap-2"><button type="button" disabled={disabled || salvando} onClick={() => abrirEdicao(lancamento)} className="min-h-touch rounded-control px-2 font-semibold text-primary disabled:opacity-60">Editar</button><button type="button" disabled={disabled || salvando} onClick={() => { setErro(null); setParaRemover(lancamento) }} className="min-h-touch rounded-control px-2 font-semibold text-error disabled:opacity-60">Excluir</button></div>}</li>)}</ul>}
    {item.valorTotal !== null && item.valorTotal !== undefined && <p className="text-body-sm text-foreground-muted">Total: <strong className="text-foreground">{formatarValorMonetario(item.valorTotal)}</strong></p>}
    {erro && !etapa && !paraRemover && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}

    <Modal open={etapa === 'preco'} onClose={fecharEtapas} closeDisabled={salvando} ariaLabelledBy="lancamento-preco-titulo" panelClassName="max-w-md"><div className="space-y-page overflow-y-auto p-page"><div><h5 id="lancamento-preco-titulo" className="text-headline-md font-semibold">Preço unitário</h5><p className="text-body-md text-foreground-muted">Informe o preço pago por uma unidade.</p></div><button type="button" disabled={disabled || salvando} onClick={() => setLeituraAberta(true)} className="min-h-touch font-semibold text-primary disabled:opacity-60">Ler o preço da etiqueta</button><TecladoMonetario valor={preco} disabled={disabled || salvando} onAlterar={setPreco} onConfirmar={confirmarPreco} />{erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}<div className="flex flex-col gap-2"><button type="button" disabled={disabled || salvando || !valorValido(preco)} onClick={confirmarPreco} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Continuar</button><button type="button" disabled={salvando} onClick={fecharEtapas} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Cancelar</button></div></div></Modal>
    <Modal open={etapa === 'quantidade'} onClose={fecharEtapas} closeDisabled={salvando} ariaLabelledBy="lancamento-quantidade-titulo" panelClassName="max-w-md"><div className="space-y-page overflow-y-auto p-page"><div><h5 id="lancamento-quantidade-titulo" className="text-headline-md font-semibold">Quantidade comprada</h5><p className="text-body-md text-foreground-muted">Preço unitário: {formatarValorMonetario(converterNumeroBrasileiro(preco, 2) ?? 0)}</p></div><div className="flex items-center gap-2"><button type="button" disabled={disabled || salvando || !converterNumeroBrasileiro(quantidade, 3)} onClick={() => alterarQuantidade(-1)} aria-label="Diminuir quantidade" className="min-h-touch w-12 rounded-control border border-foreground/20 font-semibold disabled:opacity-60">−</button><input type="text" aria-label="Quantidade comprada" disabled={disabled || salvando} inputMode="decimal" value={quantidade} onChange={(event) => setQuantidade(event.target.value.replace(/[^0-9,.]/g, ''))} className="min-h-touch min-w-0 flex-1 rounded-control border border-foreground/20 bg-surface px-gutter text-center" /><button type="button" disabled={disabled || salvando} onClick={() => alterarQuantidade(1)} aria-label="Aumentar quantidade" className="min-h-touch w-12 rounded-control border border-foreground/20 font-semibold disabled:opacity-60">+</button></div>{erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}<div className="flex flex-col gap-2"><button type="button" disabled={disabled || salvando} onClick={() => void confirmarQuantidade()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{salvando ? 'Salvando...' : 'Confirmar lançamento'}</button><button type="button" disabled={salvando} onClick={() => setEtapa('preco')} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Voltar</button></div></div></Modal>
    <Modal open={paraRemover !== null} onClose={() => !salvando && setParaRemover(null)} closeDisabled={salvando} ariaLabelledBy="remover-lancamento-titulo" panelClassName="max-w-md"><div className="space-y-page p-page"><div><h5 id="remover-lancamento-titulo" className="text-headline-md font-semibold">Excluir lançamento?</h5><p className="text-body-md text-foreground-muted">Esta ação remove {paraRemover && `${formatarValorMonetario(paraRemover.precoUnitario)} × ${paraRemover.quantidade.toLocaleString('pt-BR')}`}.</p></div>{erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}<div className="flex flex-col gap-2"><button type="button" disabled={salvando} onClick={() => void confirmarRemocao()} className="min-h-touch rounded-control bg-error px-page font-semibold text-surface disabled:opacity-60">{salvando ? 'Excluindo...' : 'Excluir'}</button><button type="button" disabled={salvando} onClick={() => setParaRemover(null)} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Cancelar</button></div></div></Modal>
    <LeituraPrecoDialog open={leituraAberta} onClose={() => setLeituraAberta(false)} onConfirmar={usarPrecoLido} token={token} familiaId={familiaId} listaId={listaId} itemCompraId={item.id} />
  </section>
}
