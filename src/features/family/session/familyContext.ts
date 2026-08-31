import { createContext, useContext } from 'react'
import type { FamiliaResponse } from '../types/family'

export interface FamilyContextValue {
  familias: FamiliaResponse[]
  familiaSelecionada: FamiliaResponse | null
  loading: boolean
  error: boolean
  selecionarFamilia: (familiaId: string) => void
  recarregarFamilias: (familiaIdPreferido?: string) => Promise<FamiliaResponse | null>
}

export const FamilyContext = createContext<FamilyContextValue | null>(null)

export function useFamilyContext() {
  const value = useContext(FamilyContext)

  if (!value) {
    throw new Error('useFamilyContext deve ser usado dentro de FamilyProvider.')
  }

  return value
}
