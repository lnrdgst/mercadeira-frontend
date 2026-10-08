import { normalizarCandidatoMonetario } from './normalizarCandidatoMonetario'

const sequenciaMonetaria = /(?:R\s*\$\s*)?(?:(?:[0-9O]{1,3}[.])+[0-9O]{3}|[0-9O]+)[,.][0-9O]{2}/gi

function fazParteDeSequenciaMaior(texto: string, inicio: number, fim: number) {
  return /[A-Z0-9O]/i.test(texto[inicio - 1] ?? '') || /[A-Z0-9O]/i.test(texto[fim] ?? '')
}

/** Extrai preços com duas casas decimais, preservando a ordem da primeira ocorrência. */
export function extrairCandidatosMonetarios(textoOcr: string): number[] {
  const candidatos: number[] = []
  const vistos = new Set<number>()

  for (const encontrado of textoOcr.matchAll(sequenciaMonetaria)) {
    const candidato = encontrado[0]
    const inicio = encontrado.index ?? 0
    const fim = inicio + candidato.length
    if (fazParteDeSequenciaMaior(textoOcr, inicio, fim)) continue

    const valor = normalizarCandidatoMonetario(candidato)
    if (valor === null) continue
    const emCentavos = Math.round(valor * 100)
    if (!vistos.has(emCentavos)) {
      vistos.add(emCentavos)
      candidatos.push(valor)
    }
  }

  return candidatos
}
