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

  return <section aria-label={`Valores registrados: ${item.descricao}`} className="space-y-gutter rounded-lg border border-foreground/10 bg-foreground/[0.03] px-gutter py-gutter">
    <div className="space-y-2"><h4 className="text-label-lg font-semibold">Valores registrados</h4>{podeGerenciar && <button type="button" disabled={disabled || salvando} onClick={abrirNovo} className="flex min-h-touch w-full items-center justify-center gap-2 rounded-control border border-primary px-page font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2.25" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>{lancamentos.length ? 'Registrar outro preço' : 'Informar preço'}</button>}</div>
    {lancamentos.length === 0 ? <p className="text-body-sm text-foreground-muted">Preço não informado</p> : <ul className="divide-y divide-primary/15">{lancamentos.map((lancamento) => <li key={lancamento.id} className="flex items-center justify-between gap-2 py-2 text-body-sm"><p className="min-w-0"><strong>{formatarValorMonetario(lancamento.precoUnitario)}</strong> × {lancamento.quantidade.toLocaleString('pt-BR')}<span className="text-foreground-muted"> · {formatarValorMonetario(lancamento.valorTotal ?? lancamento.precoUnitario * lancamento.quantidade)}</span></p>{podeGerenciar && <div className="flex shrink-0 gap-1"><button type="button" disabled={disabled || salvando} onClick={() => abrirEdicao(lancamento)} aria-label={`Editar lançamento de ${formatarValorMonetario(lancamento.precoUnitario)}`} title="Editar lançamento" className="flex min-h-touch min-w-touch items-center justify-center rounded-control text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 20 4.5-1 9.7-9.7a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" /><path d="m13.5 7.5 3 3" /></svg></button><button type="button" disabled={disabled || salvando} onClick={() => { setErro(null); setParaRemover(lancamento) }} aria-label={`Excluir lançamento de ${formatarValorMonetario(lancamento.precoUnitario)}`} title="Excluir lançamento" className="flex min-h-touch min-w-touch items-center justify-center rounded-control text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-60"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg></button></div>}</li>)}</ul>}
    {item.valorTotal !== null && item.valorTotal !== undefined && <p className="text-body-sm text-foreground-muted">Total: <strong className="text-foreground">{formatarValorMonetario(item.valorTotal)}</strong></p>}
    {erro && !etapa && !paraRemover && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}

    <Modal open={etapa === 'preco'} onClose={fecharEtapas} closeDisabled={salvando} ariaLabelledBy="lancamento-preco-titulo" panelClassName="max-w-md"><div className="space-y-page overflow-y-auto p-page"><div><h5 id="lancamento-preco-titulo" className="text-headline-md font-semibold">Preço unitário</h5><p className="text-body-md text-foreground-muted">Informe o preço pago por uma unidade.</p></div><button type="button" disabled={disabled || salvando} onClick={() => setLeituraAberta(true)} className="flex min-h-touch w-full items-center justify-center gap-2 rounded-control border border-primary px-page font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7.5h3l1.5-2h7L17 7.5h3A1.5 1.5 0 0 1 21.5 9v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z" /><circle cx="12" cy="13.5" r="3.25" /></svg>Ler o preço da etiqueta</button><TecladoMonetario valor={preco} disabled={disabled || salvando} onAlterar={setPreco} onConfirmar={confirmarPreco} />{erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}<div className="flex flex-col gap-2"><button type="button" disabled={disabled || salvando || !valorValido(preco)} onClick={confirmarPreco} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Continuar</button><button type="button" disabled={salvando} onClick={fecharEtapas} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Cancelar</button></div></div></Modal>
    <Modal open={etapa === 'quantidade'} onClose={fecharEtapas} closeDisabled={salvando} ariaLabelledBy="lancamento-quantidade-titulo" panelClassName="max-w-md"><div className="space-y-page overflow-y-auto p-page"><div><h5 id="lancamento-quantidade-titulo" className="text-headline-md font-semibold">Quantidade comprada</h5><p className="text-body-md text-foreground-muted">Preço unitário: {formatarValorMonetario(converterNumeroBrasileiro(preco, 2) ?? 0)}</p></div><div className="flex items-center gap-2"><button type="button" disabled={disabled || salvando || !converterNumeroBrasileiro(quantidade, 3)} onClick={() => alterarQuantidade(-1)} aria-label="Diminuir quantidade" className="min-h-touch w-12 rounded-control border border-foreground/20 font-semibold disabled:opacity-60">−</button><input type="text" aria-label="Quantidade comprada" disabled={disabled || salvando} inputMode="decimal" value={quantidade} onChange={(event) => setQuantidade(event.target.value.replace(/[^0-9,.]/g, ''))} className="min-h-touch min-w-0 flex-1 rounded-control border border-foreground/20 bg-surface px-gutter text-center" /><button type="button" disabled={disabled || salvando} onClick={() => alterarQuantidade(1)} aria-label="Aumentar quantidade" className="min-h-touch w-12 rounded-control border border-foreground/20 font-semibold disabled:opacity-60">+</button></div>{erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}<div className="flex flex-col gap-2"><button type="button" disabled={disabled || salvando} onClick={() => void confirmarQuantidade()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{salvando ? 'Salvando...' : 'Confirmar lançamento'}</button><button type="button" disabled={salvando} onClick={() => setEtapa('preco')} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Voltar</button></div></div></Modal>
    <Modal open={paraRemover !== null} onClose={() => !salvando && setParaRemover(null)} closeDisabled={salvando} ariaLabelledBy="remover-lancamento-titulo" panelClassName="max-w-md"><div className="space-y-page p-page"><div><h5 id="remover-lancamento-titulo" className="text-headline-md font-semibold">Excluir lançamento?</h5><p className="text-body-md text-foreground-muted">Esta ação remove {paraRemover && `${formatarValorMonetario(paraRemover.precoUnitario)} × ${paraRemover.quantidade.toLocaleString('pt-BR')}`}.</p></div>{erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}<div className="flex flex-col gap-2"><button type="button" disabled={salvando} onClick={() => void confirmarRemocao()} className="min-h-touch rounded-control bg-error px-page font-semibold text-surface disabled:opacity-60">{salvando ? 'Excluindo...' : 'Excluir'}</button><button type="button" disabled={salvando} onClick={() => setParaRemover(null)} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Cancelar</button></div></div></Modal>
    <LeituraPrecoDialog open={leituraAberta} onClose={() => setLeituraAberta(false)} onConfirmar={usarPrecoLido} token={token} familiaId={familiaId} listaId={listaId} itemCompraId={item.id} />
  </section>
}
