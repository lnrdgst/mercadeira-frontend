import { formatarValorMonetario } from '../../../shared/formatarValorMonetario'
import type { StatusListaCompra, ResumoFinanceiroCompraResponse } from '../types/shoppingList'

type Props = {
  status: StatusListaCompra
  resumoFinanceiro?: ResumoFinanceiroCompraResponse | null
  estabelecimentoJaExibido?: string | null
}

export function ResumoFinanceiroCompraCard({ status, resumoFinanceiro, estabelecimentoJaExibido }: Props) {
  if (status !== 'FINALIZADA' || !resumoFinanceiro || resumoFinanceiro.quantidadeRegistrosFinanceiros < 1) return null

  const variosRegistros = resumoFinanceiro.quantidadeRegistrosFinanceiros > 1
  const variosEstabelecimentos = resumoFinanceiro.quantidadeEstabelecimentos > 1
  const estabelecimento = resumoFinanceiro.quantidadeEstabelecimentos === 1
    ? resumoFinanceiro.estabelecimentoResumo
    : variosEstabelecimentos
      ? `${resumoFinanceiro.quantidadeEstabelecimentos} estabelecimentos`
      : null
  const exibirEstabelecimento = estabelecimento
    && estabelecimento.trim().toLocaleLowerCase() !== estabelecimentoJaExibido?.trim().toLocaleLowerCase()

  return <div className="space-y-1 border-t border-foreground/10 pt-gutter">
    {exibirEstabelecimento && <p className="break-words text-body-md text-foreground-muted">{estabelecimento}</p>}
    <p className="text-body-md font-semibold text-foreground">
      {variosRegistros && `${resumoFinanceiro.quantidadeRegistrosFinanceiros} registros • `}{formatarValorMonetario(resumoFinanceiro.totalRegistrado)}
    </p>
  </div>
}
