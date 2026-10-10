import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../auth/session/sessionContext'
import { buscarFamilias } from '../api/familyApi'
import type { FamiliaResponse } from '../types/family'
import { FamilyContext } from './familyContext'
import {
  clearFamilySelectionStorage,
  hasManualFamilySelection,
  persistInitialFamilySelection,
  persistManualFamilySelection,
  readSelectedFamilyId,
} from './familySelectionStorage'

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useSession()
  const [familias, setFamilias] = useState<FamiliaResponse[]>([])
  const [familiaSelecionada, setFamiliaSelecionada] =
    useState<FamiliaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [tokenCarregado, setTokenCarregado] = useState<string | null>(null)
  const carregandoFamilias = Boolean(auth && tokenCarregado !== auth.token && !error) || loading

  const limparContexto = useCallback(() => {
    clearFamilySelectionStorage()
    setFamilias([])
    setFamiliaSelecionada(null)
    setError(false)
    setLoading(false)
    setTokenCarregado(null)
  }, [])

  const selecionarFamilia = useCallback(
    (familiaId: string) => {
      const familia = familias.find((item) => item.id === familiaId)

      if (!familia) {
        return
      }

      persistManualFamilySelection(familia.id)
      setFamiliaSelecionada(familia)
    },
    [familias],
  )

  const recarregarFamilias = useCallback(async (familiaIdPreferido?: string) => {
    if (!auth) {
      limparContexto()
      return null
    }

    setLoading(true)
    setError(false)

    try {
      const response = await buscarFamilias(auth.token)
      const items = response.data || []
      const storedId = readSelectedFamilyId()
      const familiaPreferida = items.find((item) => item.id === familiaIdPreferido) || null
      const familiaManual = hasManualFamilySelection()
        ? items.find((item) => item.id === storedId) || null
        : null
      const familiaPrincipal = items.find((item) => item.principal) || null
      let selecionada: FamiliaResponse | null = null

      setFamilias(items)

      if (items.length === 0) {
        clearFamilySelectionStorage()
      } else if (items.length === 1) {
        selecionada = items[0]
      } else if (familiaPreferida) {
        selecionada = familiaPreferida
      } else if (familiaManual) {
        selecionada = familiaManual
      } else if (familiaPrincipal) {
        selecionada = familiaPrincipal
      }

      if (selecionada) {
        persistInitialFamilySelection(selecionada.id)
      } else {
        clearFamilySelectionStorage()
      }

      setFamiliaSelecionada(selecionada)
      setTokenCarregado(auth.token)
      return selecionada
    } catch {
      setError(true)
      setFamiliaSelecionada(null)
      setTokenCarregado(auth.token)
      return null
    } finally {
      setLoading(false)
    }
  }, [auth, limparContexto])

  useEffect(() => {
    void Promise.resolve().then(() => recarregarFamilias())
  }, [recarregarFamilias])

  return (
    <FamilyContext
      value={{
        familias,
        familiaSelecionada,
        loading: carregandoFamilias,
        error,
        selecionarFamilia,
        recarregarFamilias,
      }}
    >
      {children}
    </FamilyContext>
  )
}
