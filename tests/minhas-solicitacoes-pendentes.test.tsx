import { act, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { FamiliaSelecionarPage } from '../src/features/family/pages/FamiliaSelecionarPage'
import { familyContextFixture, familyFixture, renderApp } from './helpers'

const pendente = (id: string, nome: string) => ({
  id,
  status: 'PENDENTE' as const,
  solicitadaEm: '2026-09-26T12:00:00Z',
  familia: { id: `familia-${id}`, nome },
})

function preparar(respostas: Array<unknown[]>) {
  let chamada = 0
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).endsWith('/familias/solicitacoes/minhas-pendentes')) {
      return Response.json(respostas[Math.min(chamada++, respostas.length - 1)])
    }
    return Response.json({}, { status: 404 })
  })
  const familia = familyFixture()
  return {
    http,
    ...renderApp(<FamiliaSelecionarPage />, {
      family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }),
    }),
  }
}

test('não exibe a seção quando não há solicitações pendentes', async () => {
  preparar([[]])
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Solicitações aguardando aprovação' })).not.toBeInTheDocument())
})

test('exibe todas as solicitações pendentes e as remove após reconciliação no foco', async () => {
  preparar([[pendente('a', 'Família Natal'), pendente('b', 'Família Praia')], []])
  expect(await screen.findByRole('heading', { name: 'Solicitações aguardando aprovação' })).toBeVisible()
  expect(screen.getByText('Família Natal')).toBeVisible()
  expect(screen.getByText('Família Praia')).toBeVisible()
  expect(screen.getAllByText('Aguardando aprovação')).toHaveLength(2)

  await act(async () => { window.dispatchEvent(new Event('focus')) })
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Solicitações aguardando aprovação' })).not.toBeInTheDocument())
})
