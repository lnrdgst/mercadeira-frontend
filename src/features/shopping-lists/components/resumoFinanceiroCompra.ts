import type { ResumoFinanceiroCompraResponse } from '../types/shoppingList'

type RegistroFinanceiro = {
  valor: number
  estabelecimentoNome: string | null
}

export function resumirRegistrosFinanceiros(registros: RegistroFinanceiro[] | undefined, totalRegistrado?: number): ResumoFinanceiroCompraResponse | null {
  if (!registros || registros.length === 0) return null
  const estabelecimentos = new Map<string, string>()
  registros.forEach((registro) => {
    const estabelecimento = registro.estabelecimentoNome?.trim()
    if (estabelecimento) estabelecimentos.set(estabelecimento.toLocaleLowerCase(), estabelecimento)
  })
  const nomesEstabelecimentos = [...estabelecimentos.values()]
  return {
    totalRegistrado: totalRegistrado ?? registros.reduce((total, registro) => total + registro.valor, 0),
    quantidadeRegistrosFinanceiros: registros.length,
    quantidadeEstabelecimentos: nomesEstabelecimentos.length,
    estabelecimentoResumo: nomesEstabelecimentos.length === 1 ? nomesEstabelecimentos[0] : null,
  }
}
