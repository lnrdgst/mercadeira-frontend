const formatoMonetario = /^(?:R\s*\$\s*)?((?:[0-9O]{1,3}[.][0-9O]{3})+|[0-9O]+)[,.]([0-9O]{2})$/i

/**
 * Normaliza somente uma sequência que já tenha formato monetário explícito.
 * Não deve ser aplicada ao texto OCR inteiro, para não converter palavras como
 * "PROMOCAO" em números.
 */
export function normalizarCandidatoMonetario(candidato: string): number | null {
  const encontrado = candidato.trim().match(formatoMonetario)
  if (!encontrado) return null

  const inteiro = encontrado[1].replace(/[.]/g, '').replace(/O/gi, '0')
  const centavos = encontrado[2].replace(/O/gi, '0')
  const valor = Number(`${inteiro}.${centavos}`)
  if (!Number.isFinite(valor) || valor <= 0) return null

  const emCentavos = Math.round(valor * 100)
  return Number.isSafeInteger(emCentavos) ? emCentavos / 100 : null
}
