export type RefreshAccessToken = () => Promise<string | null>

let refreshAccessToken: RefreshAccessToken | null = null
let refreshInFlight: Promise<string | null> | null = null

export function registerAuthRecovery(handler: RefreshAccessToken) {
  refreshAccessToken = handler

  return () => {
    if (refreshAccessToken === handler) refreshAccessToken = null
  }
}

export async function recoverAccessToken() {
  if (!refreshAccessToken) return null
  if (refreshInFlight) return refreshInFlight

  const promise = refreshAccessToken()
  refreshInFlight = promise
  try {
    return await promise
  } finally {
    if (refreshInFlight === promise) refreshInFlight = null
  }
}
