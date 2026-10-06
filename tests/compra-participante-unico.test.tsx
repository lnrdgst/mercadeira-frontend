import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { IniciarCompraButton } from '../src/features/shopping/components/IniciarCompraButton'
import { MinhaPresenca } from '../src/features/shopping/components/MinhaPresenca'
import type { CompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

const showModalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})

afterEach(() => {
  if (showModalOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalOriginal)
  if (closeOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeOriginal)
})

const ana = { membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana', papelFamilia: 'MEMBRO' as const, entrouEm: '2026-09-01T12:00:00Z' }
const bia = { membroFamiliaId: 'm-b', usuarioId: 'u-b', nome: 'Bia', papelFamilia: 'MEMBRO' as const, entrouEm: '2026-09-01T12:00:00Z' }

function iniciar(participantes = [ana]) {
  return renderApp(<Routes>
    <Route path="/" element={<IniciarCompraButton familiaId="familia-a" listaId="lista-a" participantes={participantes} iniciadorMembroFamiliaId="m-a" />} />
    <Route path="/listas/lista-a/compra" element={<p>Compra iniciada</p>} />
  </Routes>)
}

function compra(participantes = 1): CompraResponse {
  const propria = { id: 'p-a', membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana', papel: 'MEMBRO' as const, geradoEm: '2026-09-01T12:00:00Z', presencaOperacional: { estado: 'PRESENTE' as const, alteradaEm: '2026-09-01T12:00:00Z' } }
  const outra = { id: 'p-b', membroFamiliaId: 'm-b', usuarioId: 'u-b', nome: 'Bia', papel: 'MEMBRO' as const, geradoEm: '2026-09-01T12:00:00Z', presencaOperacional: { estado: 'PRESENTE' as const, alteradaEm: '2026-09-01T12:00:00Z' } }
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_ANDAMENTO', iniciadaEm: '2026-09-01T12:00:00Z', finalizadaEm: null, finalizadaPor: null,
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: true, podeFinalizarCompra: true, podeReutilizarLista: false, podeDeclararSaida: true },
    participantes: participantes === 1 ? [propria] : [propria, outra],
    itens: [],
  }
}

function presenca(atual: CompraResponse) {
  return renderApp(<MinhaPresenca compra={atual} usuarioId="u-a" ocupada={false} onSolicitar={vi.fn(async () => {})} onCancelar={vi.fn(async () => {})} onDecidir={vi.fn(async () => {})} onSair={vi.fn(async () => {})} onSolicitarResponsabilidade={vi.fn(async () => {})} onCancelarResponsabilidade={vi.fn(async () => {})} onDecidirResponsabilidade={vi.fn(async () => {})} onTransferirResponsabilidade={vi.fn(async () => {})} onAtualizar={vi.fn(async () => {})} />)
}

test('inicia diretamente com participante único e envia um único POST compatível', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'compra-a' }, { status: 201 }))
  const { user } = iniciar()

  await user.click(screen.getByRole('button', { name: 'Iniciar compra' }))

  expect(screen.queryByRole('dialog', { name: 'Quem está com você?' })).not.toBeInTheDocument()
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ participantesPresentesIds: [] }) })
  expect(await screen.findByText('Compra iniciada')).toBeInTheDocument()
})

test('preserva o diálogo e a seleção quando há dois ou mais participantes', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'compra-a' }, { status: 201 }))
  const { user } = iniciar([ana, bia])

  await user.click(screen.getByRole('button', { name: 'Iniciar compra' }))
  const dialog = screen.getByRole('dialog', { name: 'Quem está com você?' })
  await user.click(within(dialog).getByRole('checkbox', { name: 'Bia' }))
  await user.click(within(dialog).getByRole('button', { name: 'Iniciar compra' }))

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ participantesPresentesIds: ['m-b'] }) })
})

test('oculta ficar remoto para a Compra com um participante e preserva para múltiplos', () => {
  const unica = presenca(compra(1))
  expect(screen.queryByRole('button', { name: 'Vou participar desta compra à distância' })).not.toBeInTheDocument()
  unica.unmount()

  presenca(compra(2))
  expect(screen.getByRole('button', { name: 'Vou participar desta compra à distância' })).toBeVisible()
})
