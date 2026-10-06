import { afterEach, expect, test, vi } from 'vitest'
import { apiRequest } from '../src/shared/api/apiClient'
import { registerAuthRecovery } from '../src/shared/api/authRecovery'

let unregister: (() => void) | undefined

afterEach(() => unregister?.())

test('renova uma vez e repete a requisicao com o novo access token apos 401', async () => {
  const refresh = vi.fn(async () => 'access-renovado')
  unregister = registerAuthRecovery(refresh)
  const fetchMock = vi.mocked(fetch)
  fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
  fetchMock.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))

  const resposta = await apiRequest<{ ok: boolean }>('/familias', { token: 'access-expirado' })

  expect(resposta.data).toEqual({ ok: true })
  expect(refresh).toHaveBeenCalledOnce()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer access-expirado')
  expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer access-renovado')
})

test('compartilha uma unica renovacao para requisicoes concorrentes', async () => {
  let concluir!: (token: string) => void
  const refresh = vi.fn(() => new Promise<string>((resolve) => { concluir = resolve }))
  unregister = registerAuthRecovery(refresh)
  const fetchMock = vi.mocked(fetch)
  fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
  fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
  fetchMock.mockResolvedValueOnce(new Response('{"id":1}', { status: 200 }))
  fetchMock.mockResolvedValueOnce(new Response('{"id":2}', { status: 200 }))

  const primeira = apiRequest<{ id: number }>('/primeira', { token: 'expirado' })
  const segunda = apiRequest<{ id: number }>('/segunda', { token: 'expirado' })
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
  concluir('renovado')

  await expect(Promise.all([primeira, segunda])).resolves.toEqual([
    { status: 200, data: { id: 1 } },
    { status: 200, data: { id: 2 } },
  ])
})

test('erro de rede nao tenta renovar nem descaracteriza a falha como logout', async () => {
  const refresh = vi.fn(async () => 'nao-deve-ser-usado')
  unregister = registerAuthRecovery(refresh)
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))

  await expect(apiRequest('/familias', { token: 'access-atual' })).rejects.toMatchObject({ status: undefined })
  expect(refresh).not.toHaveBeenCalled()
})
