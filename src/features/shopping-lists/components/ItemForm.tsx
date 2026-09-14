import { ItemFieldsForm } from '../../../shared/components/ItemFieldsForm'
import { useCallback } from 'react'
import { useSession } from '../../auth/session/sessionContext'
import { useFamilyContext } from '../../family/session/familyContext'
import { buscarSugestoesItens } from '../api/shoppingListsApi'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import type { ItemListaCompraResponse, SalvarItemListaRequest } from '../types/shoppingList'

interface ItemFormProps {
  item?: ItemListaCompraResponse
  submitting: boolean
  onCancel: () => void
  onSubmit: (data: SalvarItemListaRequest) => Promise<void>
}

export function ItemForm(props: ItemFormProps) {
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  const token = auth?.token
  const familiaId = familiaSelecionada?.id
  const load = useCallback(async (termo: string) => {
    if (!token || !familiaId) return []
    try { return (await buscarSugestoesItens(token, familiaId, termo)).data || [] }
    catch (error) { if ((error as ApiRequestError).status === 401) logout(); throw error }
  }, [token, familiaId, logout])
  return <ItemFieldsForm key={familiaId} {...props} loadSuggestions={load} />
}
