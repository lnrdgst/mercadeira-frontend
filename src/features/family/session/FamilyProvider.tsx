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

  const limparContexto = useCallback(() => {
    localStorage.removeItem(storageKey)
    setFamilias([])
    setFamiliaSelecionada(null)
    setError(false)
    setLoading(false)
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

  const recarregarFamilias = useCallback(async () => {
    if (!auth) {
      limparContexto()
      return
    }

    setLoading(true)
    setError(false)

    try {
      const response = await buscarFamilias(auth.token)
      const items = response.data || []
      const storedId = localStorage.getItem(storageKey)
      const storedFamily = items.find((item) => item.id === storedId) || null

      setFamilias(items)

      if (items.length === 0) {
        localStorage.removeItem(storageKey)
        setFamiliaSelecionada(null)
      } else if (items.length === 1) {
        localStorage.setItem(storageKey, items[0].id)
        setFamiliaSelecionada(items[0])
      } else if (storedFamily) {
        setFamiliaSelecionada(storedFamily)
      } else {
        localStorage.removeItem(storageKey)
        setFamiliaSelecionada(null)
      }
    } catch {
      setError(true)
      setFamiliaSelecionada(null)
    } finally {
      setLoading(false)
    }
  }, [auth, limparContexto])

  useEffect(() => {
    void Promise.resolve().then(recarregarFamilias)
  }, [recarregarFamilias])

  return (
    <FamilyContext
      value={{
        familias,
        familiaSelecionada,
        loading,
        error,
        selecionarFamilia,
        recarregarFamilias,
      }}
    >
      {children}
    </FamilyContext>
  )
}
