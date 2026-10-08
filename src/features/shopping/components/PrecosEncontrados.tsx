import { formatarValorMonetario } from '../../../shared/formatarValorMonetario'

type Props = {
  candidatos: number[]
  selecionado: number | null
  onSelecionar: (valor: number) => void
}

export function PrecosEncontrados({ candidatos, selecionado, onSelecionar }: Props) {
  return <fieldset className="space-y-2">
    <legend className="font-semibold">Preços encontrados</legend>
    <div className="space-y-2">
      {candidatos.map((valor) => <label key={valor} className="flex min-h-touch cursor-pointer items-center gap-3 rounded-control border border-foreground/20 bg-surface px-gutter py-2">
        <input type="radio" name="preco-encontrado" checked={selecionado === valor} onChange={() => onSelecionar(valor)} />
        <span className="font-semibold">{formatarValorMonetario(valor)}</span>
      </label>)}
    </div>
  </fieldset>
}
