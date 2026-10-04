import { afterEach, expect, test, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { RegistrosFinanceirosCompra } from '../src/features/shopping/components/RegistrosFinanceirosCompra'
import type { CompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

afterEach(() => vi.restoreAllMocks())

function compra(status: CompraResponse['status'] = 'EM_ANDAMENTO'): CompraResponse {
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status, iniciadaEm: '2026-10-02T18:00:00Z', finalizadaPor: null, finalizadaEm: null,
    participantes: [], itens: [], registrosFinanceiros: [{ id: 'registro-a', valor: 82.4, tipo: 'MANUAL', estabelecimentoNome: 'Mercado Central', criadoEm: '2026-10-02T18:00:00Z' }], totalRegistrado: 82.4,
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: false, podeFinalizarCompra: true, podeReutilizarLista: false, podeGerenciarRegistrosFinanceiros: status === 'EM_ANDAMENTO' },
  }
}

test('apresenta registros e total somente para leitura apos a finalizacao', () => {
  renderApp(<RegistrosFinanceirosCompra compra={compra('FINALIZADA')} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  expect(screen.getByText('Valores da compra')).toBeVisible()
  expect(screen.getByText('Mercado Central')).toBeVisible()
  expect(screen.getAllByText(/82,40/)).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Adicionar valor' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument()
})

test('envia valor manual e estabelecimento para o endpoint da compra', async () => {
  const atualizada = { ...compra(), registrosFinanceiros: [], totalRegistrado: 0 }
  const onAtualizar = vi.fn()
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(atualizada, { status: 201 }))
  const view = renderApp(<RegistrosFinanceirosCompra compra={atualizada} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={onAtualizar} onNaoAutorizado={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Informar valor' }))
  await view.user.type(screen.getByLabelText('Valor'), '82,40')
  await view.user.type(screen.getByLabelText(/Estabelecimento/), 'Mercado Central')
  await view.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Adicionar valor' }))

  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  expect(fetch.mock.calls[0][0]).toContain('/familias/familia-a/listas/lista-a/compra/registros-financeiros')
  const request = fetch.mock.calls[0][1] as RequestInit
  expect(request.method).toBe('POST')
  expect((request.headers as Headers).get('Authorization')).toBe('Bearer token')
  expect(JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)).toEqual({ valor: 82.4, estabelecimentoNome: 'Mercado Central' })
  expect(onAtualizar).toHaveBeenCalledWith(atualizada)
})
