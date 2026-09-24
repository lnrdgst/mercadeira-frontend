import { createContext, useContext } from 'react'
import type { CompraResponse } from '../types/shopping'

type StatusCompra = CompraResponse['status'] | null

interface CompraTransacionalContextValue {
  statusCompra: StatusCompra
  atualizarStatusCompra: (listaId: string, status: StatusCompra) => void
}

export const CompraTransacionalContext = createContext<CompraTransacionalContextValue>({
  statusCompra: null,
  atualizarStatusCompra: () => undefined,
})

export function useCompraTransacional() {
  return useContext(CompraTransacionalContext)
}
