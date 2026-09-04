import { useState } from 'react'
import type {
  ItemListaCompraResponse,
  SalvarItemListaRequest,
  UnidadeMedida,
} from '../types/shoppingList'
import { unidadeMedidaLabels } from '../types/shoppingList'

interface ItemFormProps {
  item?: ItemListaCompraResponse
  submitting: boolean
  onCancel: () => void
  onSubmit: (data: SalvarItemListaRequest) => Promise<void>
}

const unidades = Object.keys(unidadeMedidaLabels) as UnidadeMedida[]

export function ItemForm({ item, submitting, onCancel, onSubmit }: ItemFormProps) {
  const [descricao, setDescricao] = useState(item?.descricao || '')
  const [quantidade, setQuantidade] = useState(item?.quantidade?.toString() || '')
  const [unidadeMedida, setUnidadeMedida] = useState<UnidadeMedida | ''>(item?.unidadeMedida || '')
  const [marca, setMarca] = useState(item?.marca || '')
  const [observacoes, setObservacoes] = useState(item?.observacoes || '')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const quantidadeNumerica = quantidade.trim() === '' ? null : Number(quantidade)

    if (quantidadeNumerica !== null && !Number.isFinite(quantidadeNumerica)) {
      return
    }

    await onSubmit({
      descricao: descricao.trim(),
      quantidade: quantidadeNumerica,
      unidadeMedida: unidadeMedida || null,
      marca: marca.trim() || null,
      observacoes: observacoes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-gutter">
      <h2 className="text-headline-md font-semibold">{item ? 'Editar item' : 'Adicionar item'}</h2>
      <div className="space-y-1">
        <label htmlFor="item-descricao" className="block text-label-lg font-semibold">Descrição</label>
        <input id="item-descricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} required autoFocus disabled={submitting} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" />
      </div>
      <div className="grid gap-gutter sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="item-quantidade" className="block text-label-lg font-semibold">Quantidade</label>
          <input id="item-quantidade" value={quantidade} onChange={(event) => setQuantidade(event.target.value)} type="number" step="any" disabled={submitting} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" />
        </div>
        <div className="space-y-1">
          <label htmlFor="item-unidade" className="block text-label-lg font-semibold">Unidade</label>
          <select id="item-unidade" value={unidadeMedida} onChange={(event) => setUnidadeMedida(event.target.value as UnidadeMedida | '')} disabled={submitting} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">
            <option value="">Sem unidade</option>
            {unidades.map((unidade) => <option key={unidade} value={unidade}>{unidadeMedidaLabels[unidade]}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="item-marca" className="block text-label-lg font-semibold">Marca</label>
        <input id="item-marca" value={marca} onChange={(event) => setMarca(event.target.value)} disabled={submitting} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" />
      </div>
      <div className="space-y-1">
        <label htmlFor="item-observacoes" className="block text-label-lg font-semibold">Observações</label>
        <textarea id="item-observacoes" value={observacoes} onChange={(event) => setObservacoes(event.target.value)} disabled={submitting} rows={3} className="w-full rounded-card border border-foreground/20 bg-background p-gutter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" />
      </div>
      <div className="grid gap-gutter sm:grid-cols-2">
        <button type="submit" disabled={submitting} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{submitting ? 'Salvando...' : item ? 'Salvar alterações' : 'Adicionar item'}</button>
        <button type="button" onClick={onCancel} disabled={submitting} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold text-foreground">Cancelar</button>
      </div>
    </form>
  )
}
