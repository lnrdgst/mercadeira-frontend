function normalizeApiBaseUrl(value: string | undefined) {
  const apiBaseUrl = value?.trim() || '/api'
  return apiBaseUrl.replace(/\/+$/, '') || '/api'
}

export const environment = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
}
