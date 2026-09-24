import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { SessionContext } from '../src/features/auth/session/sessionContext'
import { FamilyContext } from '../src/features/family/session/familyContext'
import { FamiliaPage } from '../src/features/family/pages/FamiliaPage'
import { deferred, familyContextFixture, familyFixture, renderApp, sessionFixture } from './helpers'

function membros() {
  return [
    { membroFamiliaId: 'membro-b', usuarioId: 'usuario-b', nome: 'Camila', email: 'camila@example.test', papel: 'MEMBRO', usuarioAtual: false },
    { membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Leonardo', email: 'leo@example.test', papel: 'ADMINISTRADOR', usuarioAtual: true },
  ]
}

function telaDaFamilia(familia: ReturnType<typeof familyFixture>, familias = [familia]) {
  return <SessionContext value={sessionFixture()}><FamilyContext value={familyContextFixture({ familias, familiaSelecionada: familia })}>
    <MemoryRouter><FamiliaPage /></MemoryRouter>
  </FamilyContext></SessionContext>
}

test('carrega integrantes, ordena administrador primeiro e identifica o usuário atual', async () => {
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('/membros')) return Response.json(membros())
    if (path.includes('/solicitacoes')) return Response.json([])
    return Response.json([])
  })

  renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  const integrante = await screen.findByText('Leonardo (você)')
  expect(integrante).toBeInTheDocument()
  expect(screen.getByText('leo@example.test')).toBeInTheDocument()
  expect(screen.getAllByText('Administrador(a)')).toHaveLength(2)
  expect(screen.getByText('Camila')).toBeInTheDocument()
  expect(screen.getByText('Membro')).toBeInTheDocument()

  const nomes = screen.getAllByRole('listitem').map((item) => item.textContent)
  expect(nomes.findIndex((texto) => texto?.includes('Leonardo'))).toBeLessThan(nomes.findIndex((texto) => texto?.includes('Camila')))
  expect(screen.queryByRole('button', { name: /remover|transferir|editar nome|sugerir/i })).not.toBeInTheDocument()
})

test('reconcilia integrantes ao trocar a família sem manter resultados anteriores', async () => {
  const familiaA = familyFixture({ id: 'familia-a', nome: 'Família A' })
  const familiaB = familyFixture({ id: 'familia-b', nome: 'Família B' })
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('/familias/familia-a/membros')) return Response.json([{ membroFamiliaId: 'a', usuarioId: 'ua', nome: 'Ana', email: 'ana@example.test', papel: 'ADMINISTRADOR', usuarioAtual: true }])
    if (path.includes('/familias/familia-b/membros')) return Response.json([{ membroFamiliaId: 'b', usuarioId: 'ub', nome: 'Bia', email: 'bia@example.test', papel: 'MEMBRO', usuarioAtual: true }])
    return Response.json([])
  })

  const view = render(telaDaFamilia(familiaA, [familiaA, familiaB]))
  await screen.findByText('Ana (você)')

  view.rerender(telaDaFamilia(familiaB, [familiaA, familiaB]))
  expect(screen.queryByText('Ana (você)')).not.toBeInTheDocument()
  expect(await screen.findByText('Bia (você)')).toBeInTheDocument()
})

test('erro de integrantes mantém a página da família disponível para nova tentativa', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    timestamp: '2026-09-22T12:00:00Z', status: 503, erro: 'INDISPONIVEL', mensagem: 'Serviço indisponível.', path: '/api/familias/familia-a/membros',
  }, { status: 503 }))

  renderApp(<FamiliaPage />)

  expect(await screen.findByText('Serviço indisponível.')).toBeInTheDocument()
  expect(screen.getByText('Código de ingresso')).toBeInTheDocument()
  await screen.getByRole('button', { name: 'Tentar novamente' }).click()
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
})

test('polling e refresh em segundo plano preservam os integrantes montados e atualizam seus dados', async () => {
  const respostasPendentes: ReturnType<typeof deferred<Response>>[] = []
  let consultasDeMembros = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('/membros')) {
      consultasDeMembros += 1
      if (consultasDeMembros === 1) return Response.json(membros())
      const resposta = deferred<Response>()
      respostasPendentes.push(resposta)
      return resposta.promise
    }
    if (path.includes('/solicitacoes')) return Response.json([])
    return Response.json([])
  })
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })
  renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
  expect(screen.getByText('Leonardo (voc\u00ea)')).toBeVisible()
  await act(async () => { window.dispatchEvent(new Event('focus')); await Promise.resolve() })
  document.dispatchEvent(new Event('visibilitychange'))
  window.dispatchEvent(new Event('online'))
  await waitFor(() => expect(consultasDeMembros).toBeGreaterThanOrEqual(2))

  expect(screen.getByText('Leonardo (voc\u00ea)')).toBeVisible()
  expect(screen.queryByText('Carregando integrantes...')).not.toBeInTheDocument()

  respostasPendentes.at(-1)?.resolve(Response.json([
    { membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Leonardo', email: 'leo@example.test', papel: 'ADMINISTRADOR', usuarioAtual: true },
    { membroFamiliaId: 'membro-c', usuarioId: 'usuario-c', nome: 'Bia', email: 'bia@example.test', papel: 'MEMBRO', usuarioAtual: false },
  ]))

  expect(await screen.findByText('Bia')).toBeVisible()
  respostasPendentes[0]?.resolve(Response.json([
    { membroFamiliaId: 'membro-antigo', usuarioId: 'usuario-antigo', nome: 'Resposta antiga', email: 'antiga@example.test', papel: 'MEMBRO', usuarioAtual: false },
  ]))
  await act(async () => { await Promise.resolve() })
  expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument()
})

test('polling periódico não ativa loading global depois da carga inicial', async () => {
  vi.useFakeTimers()
  const respostaPendente = deferred<Response>()
  let consultasDeMembros = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (!String(input).includes('/membros')) return Response.json([])
    consultasDeMembros += 1
    return consultasDeMembros === 1 ? Response.json(membros()) : respostaPendente.promise
  })
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })
  renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
  expect(screen.getByText('Leonardo (voc\u00ea)')).toBeVisible()
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })

  expect(consultasDeMembros).toBe(2)
  expect(screen.getByText('Leonardo (voc\u00ea)')).toBeVisible()
  expect(screen.queryByText('Carregando integrantes...')).not.toBeInTheDocument()
  respostaPendente.resolve(Response.json(membros()))
  vi.useRealTimers()
})
