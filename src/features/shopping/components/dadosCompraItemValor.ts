export function converterNumeroBrasileiro(valor: string, casasDecimais: number): number | null {
  const texto = valor.trim()
  if (!texto) return null
  if (!new RegExp(`^\\d+(?:[,.]\\d{1,${casasDecimais}})?$`).test(texto)) return null
  const numero = Number(texto.replace(',', '.'))
  return Number.isFinite(numero) && numero > 0 ? numero : null
}
