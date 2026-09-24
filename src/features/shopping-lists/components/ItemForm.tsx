import { ItemFieldsForm } from '../../../shared/components/ItemFieldsForm'
import { useCallback } from 'react'
import { useSession } from '../../auth/session/sessionContext'
import { useFamilyContext } from '../../family/session/familyContext'
import { buscarSugestoesItens } from '../api/shoppingListsApi'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import type { CategoriaCompra, ItemListaCompraResponse, SalvarItemListaRequest } from '../types/shoppingList'

interface ItemFormProps {
  listaId: string
  categoria: CategoriaCompra
  item?: ItemListaCompraResponse
  submitting: boolean
  stickyActions?: boolean
  onCancel: () => void
  onSubmit: (data: SalvarItemListaRequest) => Promise<void>
}

export function ItemForm({ listaId, categoria, ...props }: ItemFormProps) {
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  const token = auth?.token
  const familiaId = familiaSelecionada?.id
  const load = useCallback(async (termo: string) => {
    if (!token || !familiaId) return []
    try { return (await buscarSugestoesItens(token, familiaId, listaId, categoria, termo)).data || [] }
    catch (error) { if ((error as ApiRequestError).status === 401) logout(); throw error }
  }, [token, familiaId, listaId, categoria, logout])
  return <ItemFieldsForm key={familiaId} {...props} loadSuggestions={load} />
}
