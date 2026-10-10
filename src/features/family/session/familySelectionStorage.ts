const selectedFamilyStorageKey = 'mercadeira.familia.selecionada'
const manualSelectionSessionKey = 'mercadeira.familia.selecao-manual'

export function readSelectedFamilyId() {
  return localStorage.getItem(selectedFamilyStorageKey)
}

export function hasManualFamilySelection() {
  return sessionStorage.getItem(manualSelectionSessionKey) === 'true'
}

export function persistInitialFamilySelection(familiaId: string) {
  localStorage.setItem(selectedFamilyStorageKey, familiaId)
}

export function persistManualFamilySelection(familiaId: string) {
  localStorage.setItem(selectedFamilyStorageKey, familiaId)
  sessionStorage.setItem(manualSelectionSessionKey, 'true')
}

export function clearFamilySelectionStorage() {
  localStorage.removeItem(selectedFamilyStorageKey)
  sessionStorage.removeItem(manualSelectionSessionKey)
}
