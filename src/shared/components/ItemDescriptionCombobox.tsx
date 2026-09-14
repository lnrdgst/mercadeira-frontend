import { useEffect, useId, useRef, useState } from 'react'
import type { UnidadeMedida } from '../../features/shopping-lists/types/shoppingList'
import { unidadeMedidaLabels } from '../../features/shopping-lists/types/shoppingList'

export interface ItemSuggestion { descricao: string; unidadeMedida: UnidadeMedida | null }
export type LoadItemSuggestions = (termo: string) => Promise<ItemSuggestion[]>

export function ItemDescriptionCombobox({ value, disabled, onChange, onSelect, load }: {
  value: string; disabled: boolean; onChange: (value: string) => void
  onSelect: (item: ItemSuggestion) => void; load: LoadItemSuggestions
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [result, setResult] = useState<{ term: string; source: LoadItemSuggestions; items: ItemSuggestion[]; error: boolean } | null>(null)
  const matches = result?.term === value && result.source === load
  const items = matches ? result.items : []
  const expanded = open && !disabled
  const loading = expanded && !matches

  useEffect(() => { list.current?.children[active]?.scrollIntoView?.({ block: 'nearest' }) }, [active])

  useEffect(() => {
    if (!expanded) return
    let current = true
    const timer = setTimeout(() => {
      void load(value).then((items) => {
        if (current) setResult({ term: value, source: load, items, error: false })
      }).catch(() => {
        if (current) setResult({ term: value, source: load, items: [], error: true })
      })
    }, 200)
    return () => { current = false; clearTimeout(timer) }
  }, [value, load, expanded])

  function select(item: ItemSuggestion) {
    onSelect(item)
    setOpen(false)
    setActive(-1)
    input.current?.focus()
  }

  return <div className="relative">
    <input ref={input} id="item-descricao" role="combobox" aria-autocomplete="list" aria-expanded={expanded}
      aria-controls={expanded ? id : undefined} aria-activedescendant={expanded && items[active] ? `${id}-${active}` : undefined}
      aria-describedby={`${id}-hint`} autoComplete="off" value={value} required autoFocus disabled={disabled} maxLength={200}
      onFocus={() => { setResult(null); setOpen(true) }} onBlur={() => { setOpen(false); setActive(-1) }}
      onChange={(event) => { onChange(event.target.value); setActive(-1); setOpen(true) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && expanded) { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1) }
        else if (event.key === 'Tab') { setOpen(false); setActive(-1) }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); if (!expanded) setResult(null); setOpen(true)
          if (items.length) setActive((previous) => event.key === 'ArrowDown' ? (previous + 1) % items.length : (previous <= 0 ? items.length : previous) - 1)
        } else if (event.key === 'Enter' && expanded && items[active]) { event.preventDefault(); select(items[active]) }
      }} className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60" />
    <p id={`${id}-hint`} className="text-label-md text-foreground-muted">Escolha uma sugestão ou digite um novo item.</p>
    {expanded && <div className="mt-1 rounded-card border border-foreground/20 bg-surface p-2">
      <p className="text-label-md text-foreground-muted">{value.trim() ? 'Sugestões da família' : 'Usados recentemente'}</p>
      <p role="status" className="text-label-md text-foreground-muted">{loading ? 'Buscando sugestões...' : result?.error ? 'Não foi possível carregar sugestões. Você pode continuar digitando.' : items.length === 0 ? 'Nenhuma sugestão. Você pode cadastrar um novo item.' : ''}</p>
      <ul ref={list} id={id} role="listbox" aria-label="Sugestões de itens" className="max-h-56 overflow-y-auto">
        {items.map((item, index) => <li key={item.descricao} id={`${id}-${index}`} role="option" aria-selected={active === index}
          onPointerDown={(event) => event.preventDefault()} onClick={() => select(item)}
          className={`flex min-h-touch cursor-pointer items-center justify-between gap-2 rounded-card px-gutter ${active === index ? 'bg-primary/10 text-primary' : 'hover:bg-foreground/5'}`}>
          <span>{item.descricao}</span><span className="text-label-md">{item.unidadeMedida ? unidadeMedidaLabels[item.unidadeMedida] : 'Sem unidade'}</span>
        </li>)}
      </ul>
    </div>}
  </div>
}
