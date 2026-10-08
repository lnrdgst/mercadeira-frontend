export type CenarioLeituraPrecoDemo = 'zero' | 'um' | 'multiplos'

export const cenariosLeituraPrecoDemo: Record<CenarioLeituraPrecoDemo, { titulo: string; textoOcr: string }> = {
  zero: { titulo: 'Sem preço encontrado', textoOcr: 'PROMOCAO 3 POR 20' },
  um: { titulo: 'Um preço encontrado', textoOcr: 'R$ 25,90' },
  multiplos: { titulo: 'Vários preços encontrados', textoOcr: 'Clientes Bahamas R$ 13,98 Atacado R$ 14,90 Varejo R$ 15,98 13.98' },
}
