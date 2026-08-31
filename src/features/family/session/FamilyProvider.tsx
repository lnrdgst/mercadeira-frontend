import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../auth/session/sessionContext'
import { buscarFamilias } from '../api/familyApi'
import type { FamiliaResponse } from '../types/family'
import { FamilyContext } from './familyContext'

const storageKey = 'mercadeira.familia.selecionada'

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
    localStorage.removeItem(storageKey)
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

      localStorage.setItem(storageKey, familia.id)
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
      const storedId = localStorage.getItem(storageKey)
      const familiaPreferida = items.find((item) => item.id === familiaIdPreferido) || null
      const familiaPersistida = items.find((item) => item.id === storedId) || null
      let selecionada: FamiliaResponse | null = null

      setFamilias(items)

      if (items.length === 0) {
        localStorage.removeItem(storageKey)
      } else if (items.length === 1) {
        selecionada = items[0]
      } else if (familiaPreferida) {
        selecionada = familiaPreferida
      } else if (familiaPersistida) {
        selecionada = familiaPersistida
      }

      if (selecionada) {
        localStorage.setItem(storageKey, selecionada.id)
      } else {
        localStorage.removeItem(storageKey)
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
