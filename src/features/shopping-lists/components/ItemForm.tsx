import { ItemFieldsForm } from '../../../shared/components/ItemFieldsForm'
import type { ItemListaCompraResponse, SalvarItemListaRequest } from '../types/shoppingList'

interface ItemFormProps {
  item?: ItemListaCompraResponse
  submitting: boolean
  onCancel: () => void
  onSubmit: (data: SalvarItemListaRequest) => Promise<void>
}

export function ItemForm(props: ItemFormProps) {
  return <ItemFieldsForm {...props} />
}
