import { useMemo, useState } from 'react'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { Modal } from '../../../shared/components/Modal'
import { formatarValorMonetario } from '../../../shared/formatarValorMonetario'
import { adicionarRegistroFinanceiroCompra, removerRegistroFinanceiroCompra } from '../api/shoppingApi'
import type { CompraResponse } from '../types/shopping'

type Props = {
  compra: CompraResponse
  token: string
  familiaId: string
  listaId: string
  onAtualizar: (compra: CompraResponse) => void
  onNaoAutorizado: () => void
}

function converterValor(valor: string): number | null {
  const informado = valor.trim()
  if (!informado) return null
  const normalizado = informado.includes(',') ? informado.replaceAll('.', '').replace(',', '.') : informado
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null
  const numero = Number(normalizado)
  return Number.isFinite(numero) && numero > 0 ? numero : null
}

export function RegistrosFinanceirosCompra({ compra, token, familiaId, listaId, onAtualizar, onNaoAutorizado }: Props) {
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')
  const [estabelecimentoNome, setEstabelecimentoNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const podeGerenciar = compra.status === 'EM_ANDAMENTO' && compra.contextoUsuario.podeGerenciarRegistrosFinanceiros === true
  const registros = compra.registrosFinanceiros ?? []
  const valorTotal = compra.totalRegistrado ?? registros.reduce((total, registro) => total + registro.valor, 0)
  const total = useMemo(() => formatarValorMonetario(valorTotal), [valorTotal])

  function abrir() {
    setValor('')
    setEstabelecimentoNome('')
    setErro(null)
    setAberto(true)
  }

  async function adicionar() {
    const valorConvertido = converterValor(valor)
    if (valorConvertido === null) {
      setErro('Informe um valor maior que zero, com no máximo duas casas decimais.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      onAtualizar(await adicionarRegistroFinanceiroCompra(token, familiaId, listaId, {
        valor: valorConvertido,
        estabelecimentoNome: estabelecimentoNome.trim() || null,
      }))
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

  return <section aria-labelledby="registros-financeiros-titulo" className="space-y-gutter rounded-card border border-foreground/10 bg-surface p-page shadow-soft">
    <div className="flex flex-wrap items-center justify-between gap-gutter">
      <div>
        <h2 id="registros-financeiros-titulo" className="text-headline-sm font-semibold">Valores da compra</h2>
        <p className="text-body-md text-foreground-muted">Total registrado: <strong className="text-foreground">{total}</strong></p>
      </div>
      {podeGerenciar && <button type="button" onClick={abrir} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary">Adicionar valor</button>}
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
          <p className="text-body-md text-foreground-muted">Registre um valor pago nesta compra. Este registro pode ser removido enquanto a compra estiver em andamento.</p>
        </div>
        {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
        <label className="block space-y-1">
          <span className="font-semibold">Valor</span>
          <input autoFocus type="text" inputMode="decimal" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="Ex.: 82,40" className="min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter" />
        </label>
        <label className="block space-y-1">
          <span className="font-semibold">Estabelecimento <span className="font-normal text-foreground-muted">(opcional)</span></span>
          <input type="text" maxLength={120} value={estabelecimentoNome} onChange={(event) => setEstabelecimentoNome(event.target.value)} className="min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter" />
        </label>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={enviando} onClick={() => void adicionar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Adicionando valor...' : 'Adicionar valor'}</button>
          <button type="button" disabled={enviando} onClick={() => setAberto(false)} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Cancelar</button>
        </div>
      </div>
    </Modal>
  </section>
}
