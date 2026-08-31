import { environment } from '../../config/environment'

export interface ApiErrorResponse {
  timestamp: string
  status: number
  erro: string
  mensagem: string
  path: string
  campos?: unknown
}

export type ApiRequestError = Error & {
  status?: number
  response?: ApiErrorResponse
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
}

interface ApiResponse<T> {
  status: number
  data: T | null
}

function buildUrl(path: string) {
  return `${environment.apiBaseUrl}/${path.replace(/^\/+/, '')}`
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const error = value as Record<string, unknown>

  return (
    typeof error.timestamp === 'string' &&
    typeof error.status === 'number' &&
    typeof error.erro === 'string' &&
    typeof error.mensagem === 'string' &&
    typeof error.path === 'string'
  )
}

function createApiError(
  message: string,
  status?: number,
  response?: ApiErrorResponse,
): ApiRequestError {
  return Object.assign(new Error(message), { status, response })
}

async function parseJson(response: Response): Promise<unknown | null> {
  const body = await response.text()

  if (!body) {
    return null
  }

  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers({ Accept: 'application/json' })

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw createApiError('Não foi possível conectar ao servidor.')
  }

  if (response.status === 204) {
    return { status: response.status, data: null }
  }

  const data = await parseJson(response)

  if (!response.ok) {
    const apiError = isApiErrorResponse(data) ? data : undefined
    throw createApiError(
      apiError?.mensagem || 'Não foi possível concluir esta operação.',
      response.status,
      apiError,
    )
  }

  return { status: response.status, data: data as T }
}
