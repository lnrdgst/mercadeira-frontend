import { act, screen } from '@testing-library/react'
import { expect, test, vi, afterEach } from 'vitest'
import { InicioPage } from '../src/features/home/pages/InicioPage'
import { MemoryRouter } from 'react-router'
import { render } from '@testing-library/react'
import { SessionContext } from '../src/features/auth/session/sessionContext'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import { FamilyContext } from '../src/features/family/session/familyContext'
import { deferred, familyContextFixture, familyFixture, sessionFixture } from './helpers'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

function preparar(responder: (input: RequestInfo | URL) => Promise<Response> = async () => Response.json([])) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(responder)
  const familia = familyFixture()
  return { fetchMock, ...render(<SessionContext value={sessionFixture()}><AuthenticatedUserContext value={{ usuario: { id: 'usuario', nome: 'Ana', email: 'ana@test' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}><FamilyContext value={familyContextFixture({ familias: [familia], familiaSelecionada: familia })}><MemoryRouter><InicioPage /></MemoryRouter></FamilyContext></AuthenticatedUserContext></SessionContext>) }
}

test('Home faz polling somente uma vez a cada intervalo quando visível e online', async () => {
  vi.useFakeTimers()
  const { fetchMock } = preparar()
  await act(async () => { await vi.runOnlyPendingTimersAsync() })
  const inicial = fetchMock.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(fetchMock.mock.calls.length).toBe(inicial + 2)
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(fetchMock.mock.calls.length).toBe(inicial + 4)
})

test('Home atualiza em focus, visible e online, e desmontagem limpa o timer', async () => {
  vi.useFakeTimers()
  const { fetchMock, unmount } = preparar()
  await act(async () => { await vi.runOnlyPendingTimersAsync() })
  const inicial = fetchMock.mock.calls.length
  await act(async () => { window.dispatchEvent(new Event('focus')); await Promise.resolve() })
  document.dispatchEvent(new Event('visibilitychange'))
  window.dispatchEvent(new Event('online'))
  await act(async () => { await Promise.resolve() })
  expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(inicial + 1)
  unmount()
  const antes = fetchMock.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(fetchMock.mock.calls.length).toBe(antes)
  expect(screen.queryByText('Minha família')).not.toBeInTheDocument()
})

test('Home não inicia polling quando a aba está oculta ou offline', async () => {
  vi.useFakeTimers()
  const hidden = Object.getOwnPropertyDescriptor(document, 'hidden')
  const online = Object.getOwnPropertyDescriptor(navigator, 'onLine')
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  const { fetchMock } = preparar()
  await act(async () => { await Promise.resolve() })
  const inicial = fetchMock.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(fetchMock.mock.calls.length).toBe(inicial)
  if (hidden) Object.defineProperty(document, 'hidden', hidden)
  if (online) Object.defineProperty(navigator, 'onLine', online)
})

test('refresh em segundo plano preserva a árvore principal enquanto a resposta está pendente', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  const pendente = deferred<Response>()
  let chamadas = 0
  const { fetchMock } = preparar(async (input) => {
    if (!String(input).endsWith('/listas')) return Response.json([])
    chamadas += 1
    return chamadas === 1
      ? Response.json([{ id: 'lista', nome: 'Preparação', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_PREPARACAO', criadaEm: '2026-09-24T10:00:00Z', atualizadaEm: '2026-09-24T10:00:00Z' }])
      : pendente.promise
  })
  expect(await screen.findByRole('heading', { name: 'Lista em preparação' })).toBeVisible()
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  await act(async () => { window.dispatchEvent(new Event('focus')); await Promise.resolve() })
  expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  expect(screen.getByRole('heading', { name: 'Lista em preparação' })).toBeVisible()
  await act(async () => pendente.resolve(Response.json([])))
})
