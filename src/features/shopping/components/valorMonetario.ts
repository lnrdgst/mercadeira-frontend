export function valorValido(valor: string) {
  if (!/^\d+(,\d{0,2})?$/.test(valor)) return false
  return Number(valor.replace(',', '.')) > 0
}

export function converterValorMonetario(valor: string): number | null {
  if (!valorValido(valor)) return null
  const numero = Number(valor.replace(',', '.'))
  return Number.isFinite(numero) ? numero : null
}
