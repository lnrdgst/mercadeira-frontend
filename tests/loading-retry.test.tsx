import { act, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { FamiliaEntradaPage } from '../src/features/family/pages/FamiliaEntradaPage'
import { buscarMinhasSolicitacoesPendentes } from '../src/features/family/api/familyApi'
import { ListasPage } from '../src/features/shopping-lists/pages/ListasPage'
import { deferred, renderApp } from './helpers'

test('listas: loading, falha HTTP, tentativa explícita e sucesso com acesso ao resumo final', async () => {
  const primeira = deferred<Response>()
  const segunda = deferred<Response>()
  const fetchMock = vi.spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(primeira.promise).mockReturnValueOnce(segunda.promise)
  const { user } = renderApp(<ListasPage />)
  expect(screen.getByText('Carregando suas listas...')).toBeInTheDocument()
  await act(async () => primeira.resolve(Response.json({
    timestamp: '2026-09-13T12:00:00Z', status: 503, erro: 'INDISPONIVEL', mensagem: 'Serviço indisponível no momento.', path: '/api/familias/familia-a/listas',
  }, { status: 503 })))
  expect(await screen.findByText('Serviço indisponível no momento.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(screen.getByText('Carregando suas listas...')).toBeInTheDocument()
  await act(async () => segunda.resolve(Response.json([
    { id: 'lista-finalizada', nome: 'Compra concluída', status: 'FINALIZADA', categoria: 'SUPERMERCADO', estabelecimento: 'Mercado' },
  ])))
  const resumo = await screen.findByRole('link', { name: /Compra concluída.*Ver resumo/ })
  expect(resumo).toHaveAttribute('href', '/listas/lista-finalizada/compra/revisao')
  expect(screen.queryByText('Serviço indisponível no momento.')).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('listas vazias oferecem criação sem confundir ausência de dados com falha', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))
  renderApp(<ListasPage />)
  expect(await screen.findByText('Você ainda não possui listas.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
})

test('GET de solicitações pendentes aceita 204 e onboarding oferece criar/entrar sem erro', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    expect(String(input)).toMatch(/\/familias\/solicitacoes\/minhas-pendentes$/)
    expect(options?.method).toBe('GET')
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer token-teste')
    return new Response(null, { status: 204 })
  })
  expect(await buscarMinhasSolicitacoesPendentes('token-teste')).toEqual({ status: 204, data: null })
  renderApp(<FamiliaEntradaPage />)
  expect(await screen.findByRole('button', { name: 'Criar uma família' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Entrar em uma família' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByText('Solicitações aguardando aprovação')).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
