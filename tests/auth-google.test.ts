import { expect, test, vi } from 'vitest'
import { loginComGoogle, vincularGoogle } from '../src/features/auth/api/authApi'

test('envia somente credential ao endpoint de login Google', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ vinculoNecessario: false, token: 'access', expiracao: '2026-10-05T12:00:00Z', refreshToken: 'refresh' }), { status: 200 }))

  await loginComGoogle('credential-google')

  const [url, options] = vi.mocked(fetch).mock.calls[0]
  expect(url).toContain('/autenticacao/google')
  expect(JSON.parse(String(options?.body))).toEqual({ credential: 'credential-google' })
})

test('vinculo Google reenviа credential e senha atual somente ao endpoint de vinculo', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ vinculoNecessario: false, token: 'access', expiracao: '2026-10-05T12:00:00Z', refreshToken: 'refresh' }), { status: 200 }))

  await vincularGoogle('credential-google', 'senha-atual')

  const [url, options] = vi.mocked(fetch).mock.calls[0]
  expect(url).toContain('/autenticacao/google/vincular')
  expect(JSON.parse(String(options?.body))).toEqual({ credential: 'credential-google', senhaAtual: 'senha-atual' })
})
