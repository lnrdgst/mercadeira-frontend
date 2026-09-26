import { useState } from 'react'
import { ItemDescriptionCombobox, type LoadItemSuggestions } from './ItemDescriptionCombobox'
import type { UnidadeMedida } from '../../features/shopping-lists/types/shoppingList'
import { unidadeMedidaLabels } from '../../features/shopping-lists/types/shoppingList'

export interface ItemFieldsValues {
  descricao: string
  quantidade: number | null
  unidadeMedida: UnidadeMedida | null
  marca: string | null
  observacoes: string | null
}

interface ItemFieldsFormProps {
  loadSuggestions?: LoadItemSuggestions
  item?: ItemFieldsValues
  submitting: boolean
  stickyActions?: boolean
  onCancel: () => void
  onSubmit: (data: ItemFieldsValues) => Promise<void>
}

const unidades = Object.keys(unidadeMedidaLabels) as UnidadeMedida[]

export function ItemFieldsForm({ item, submitting, stickyActions = false, onCancel, onSubmit, loadSuggestions }: ItemFieldsFormProps) {
  const [descricao, setDescricao] = useState(item?.descricao || '')
  const [unidadeMedida, setUnidadeMedida] = useState<UnidadeMedida | ''>(item?.unidadeMedida || '')
  const [marca, setMarca] = useState(item?.marca || '')
  const [observacoes, setObservacoes] = useState(item?.observacoes || '')

  const [quantidade, setQuantidade] = useState(item?.quantidade?.toString() ?? '')


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
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

  function alterarQuantidade(delta: number) {
    const atual = Number(quantidade) || 0

    const novaQuantidade = Math.min(
      99999,
      Math.max(0, atual + delta),
    )

    setQuantidade(
      String(Math.round(novaQuantidade * 10) / 10),
    )
  }

  return (
    <form onSubmit={handleSubmit} className={stickyActions ? 'flex min-h-0 flex-1 flex-col' : 'space-y-gutter'}>
      <div className={stickyActions ? 'min-h-0 flex-1 space-y-gutter overflow-y-auto p-page' : 'space-y-gutter'}>
        <h2 className="text-headline-md font-semibold">{item ? 'Modficar item' : 'Adicionar item'}</h2>
        <div className="space-y-1">
          <label htmlFor="item-descricao" className="block text-label-lg font-semibold">Descrição</label>
          {loadSuggestions ? <ItemDescriptionCombobox value={descricao} disabled={submitting} load={loadSuggestions} onChange={setDescricao} onSelect={(item) => { setDescricao(item.descricao); setUnidadeMedida(item.unidadeMedida || '') }} /> : <input id="item-descricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} required autoFocus disabled={submitting} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" />}
        </div>
        <div className="grid gap-gutter sm:grid-cols-2">



          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-end gap-3">
            {/* Quantidade */}
            <div className="min-w-0 space-y-1">
              <label
                htmlFor="item-quantidade"
                className="block text-label-lg font-semibold"
              >
                Quantidade
              </label>

              <div className="flex min-h-touch overflow-hidden rounded-card border border-foreground/20 bg-background focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                <button
                  type="button"
                  onClick={() => alterarQuantidade(-0.5)}
                  disabled={submitting || Number(quantidade) <= 0}
                  aria-label="Diminuir quantidade"
                  className="flex min-w-touch items-center justify-center border-r border-foreground/20 text-xl font-semibold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40"
                >
                  −
                </button>

                <input
                  id="item-quantidade"
                  value={quantidade}
                  onChange={(event) => {
                    const valor = event.target.value

                    if (valor === "") {
                      setQuantidade("")
                      return
                    }

                    const numero = Number(valor)

                    if (numero >= 0 && numero <= 99999) {
                      setQuantidade(valor)
                    }
                  }}
                  type="number"
                  min="0"
                  max="99999"
                  step="0.5"
                  disabled={submitting}
                  placeholder="0"
                  className="min-w-0 flex-1 bg-transparent px-1 text-center font-semibold outline-none disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => alterarQuantidade(0.5)}
                  disabled={submitting || Number(quantidade) >= 99999}
                  aria-label="Aumentar quantidade"
                  className="flex min-w-touch items-center justify-center border-l border-foreground/20 text-xl font-semibold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            {/* Unidade */}
            <div className="min-w-0 space-y-1">
              <label
                htmlFor="item-unidade"
                className="block text-label-lg font-semibold"
              >
                Unidade
              </label>

              <select
                id="item-unidade"
                value={unidadeMedida}
                onChange={(event) =>
                  setUnidadeMedida(event.target.value as UnidadeMedida | "")
                }
                disabled={submitting}
                className="min-h-touch w-full min-w-0 rounded-card border border-foreground/20 bg-background px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
              >
                <option value="">S/ unid.</option>

                {unidades.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    {unidadeMedidaLabels[unidade]}
                  </option>
                ))}
              </select>
            </div>
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
      </div>
      <div className={stickyActions ? 'sticky bottom-0 grid shrink-0 grid-cols-2 gap-gutter border-t border-foreground/10 bg-surface px-page pt-gutter pb-[max(env(safe-area-inset-bottom),1rem)]' : 'grid gap-gutter sm:grid-cols-2'}>
        <button type="submit" disabled={submitting} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{submitting ? 'Salvando...' : item ? 'Salvar alterações' : 'Adicionar'}</button>
        <button type="button" onClick={onCancel} disabled={submitting} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold text-foreground">Cancelar</button>
      </div>
    </form>
  )
}
