import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { FamiliaPage } from '../src/features/family/pages/FamiliaPage'
import { deferred, familyContextFixture, familyFixture, renderApp } from './helpers'

function membros(podeIniciarCompra = false) {
  return [
    { membroFamiliaId: 'ana', usuarioId: 'usuario-a', nome: 'Ana', email: 'ana@example.test', papel: 'ADMINISTRADOR', usuarioAtual: true, podeIniciarCompra: true, acoes: { podeTransferirAdministracao: false, podeRemoverIntegrante: false } },
    { membroFamiliaId: 'bia', usuarioId: 'usuario-b', nome: 'Bia', email: 'bia@example.test', papel: 'MEMBRO', usuarioAtual: false, podeIniciarCompra, acoes: { podeTransferirAdministracao: true, podeRemoverIntegrante: true } },
  ]
}

function preparar({ administrador = true, podeIniciarCompra = false, patch = async () => Response.json({ ...membros(true)[1] }) } = {}) {
  const familia = familyFixture({ papel: administrador ? 'ADMINISTRADOR' : 'MEMBRO', contextoUsuario: { podeGerenciarIntegrantes: administrador } })
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = String(input)
    if (path.endsWith('/membros/bia/permissao-iniciar-compra') && options?.method === 'PATCH') return patch()
    if (path.endsWith('/membros')) return Response.json(membros(podeIniciarCompra))
    if (path.endsWith('/solicitacoes')) return Response.json([])
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  return { ...renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) }), fetchMock }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('administrador ve o switch com o estado persistido e as acoes continuam separadas', async () => {
  preparar({ podeIniciarCompra: false })
  await screen.findByText('Bia')
  const switches = screen.getAllByRole('switch', { name: 'Pode iniciar compras' })
  expect(switches).toHaveLength(2)
  expect(switches[1]).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('button', { name: 'Transferir administração' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Remover integrante' })).toBeVisible()
})

test('altera a permissao, bloqueia chamadas concorrentes e conserva o novo estado no sucesso', async () => {
  const resposta = deferred<Response>()
  const { user, fetchMock } = preparar({ patch: () => resposta.promise })
  await screen.findByText('Bia')
  const switchBia = screen.getAllByRole('switch', { name: 'Pode iniciar compras' })[1]
  await user.click(switchBia)
  await user.click(switchBia)
  expect(switchBia).toBeDisabled()
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(1)
  const chamada = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH')
  expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ podeIniciarCompra: true })
  resposta.resolve(Response.json({ ...membros(true)[1] }))
  await waitFor(() => expect(switchBia).toHaveAttribute('aria-checked', 'true'))
  expect(switchBia).toBeEnabled()
})

test('erro preserva o valor anterior e apresenta feedback', async () => {
  const { user } = preparar({ patch: async () => Response.json({ timestamp: '2026-10-01T12:00:00Z', status: 403, erro: 'SEM_PERMISSAO', mensagem: 'Sem permissão.', path: '/familias' }, { status: 403 }) })
  await screen.findByText('Bia')
  const switchBia = screen.getAllByRole('switch', { name: 'Pode iniciar compras' })[1]
  await user.click(switchBia)
  expect(await screen.findByRole('status')).toHaveTextContent('Sem permissão.')
  expect(switchBia).toHaveAttribute('aria-checked', 'false')
})

test('membro comum nao recebe controle editavel', async () => {
  preparar({ administrador: false })
  await screen.findByText('Bia')
  expect(screen.queryByRole('switch', { name: 'Pode iniciar compras' })).not.toBeInTheDocument()
})
