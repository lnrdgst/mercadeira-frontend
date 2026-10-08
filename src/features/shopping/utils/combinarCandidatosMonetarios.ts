/** Junta candidatos de múltiplas leituras mantendo a primeira ocorrência de cada valor. */
export function combinarCandidatosMonetarios(listas: number[][]) {
  const vistos = new Set<number>()
  return listas.flat().filter((valor) => {
    const centavos = Math.round(valor * 100)
    if (vistos.has(centavos)) return false
    vistos.add(centavos)
    return true
  })
}
