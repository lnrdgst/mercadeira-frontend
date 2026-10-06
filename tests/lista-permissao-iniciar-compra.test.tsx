import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { renderApp } from './helpers'

function preparar({ podeIniciarCompra, itens = 1 }: { podeIniciarCompra: boolean; itens?: number }) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.endsWith('/participantes')) return Response.json([])
    if (path.endsWith('/itens')) return Response.json(Array.from({ length: itens }, (_, indice) => ({
      id: `item-${indice}`, descricao: `Item ${indice}`, quantidade: 1, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: indice,
    })))
    if (path.endsWith('/listas/lista-a')) return Response.json({
      id: 'lista-a', nome: 'Semana', status: 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null,
      criador: { nome: 'Ana', membroFamiliaId: 'membro-a', usuarioId: 'usuario-a' },
      contextoUsuario: { membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: true, podeGerenciarParticipantes: false, podeAlterarItens: true, podeEditarDadosBasicos: false, podeSairDaLista: false, podeExcluirLista: false, podeIniciarCompra },
    })
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  return { ...renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' }), fetchMock }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('com itens e permissao, mantem o inicio habilitado', async () => {
  preparar({ podeIniciarCompra: true })
  expect(await screen.findByRole('button', { name: 'Iniciar compra' })).toBeEnabled()
})

test('com itens e sem permissao, explica e desabilita o inicio sem fazer requisicao', async () => {
  const { user, fetchMock } = preparar({ podeIniciarCompra: false })
  const iniciar = await screen.findByRole('button', { name: 'Iniciar compra' })
  expect(iniciar).toBeDisabled()
  expect(screen.getByText('Você não possui permissão para iniciar compras nesta família.')).toBeVisible()
  await user.click(iniciar)
  expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
})

test('lista vazia continua sem oferecer inicio', async () => {
  preparar({ podeIniciarCompra: false, itens: 0 })
  await screen.findByText('Nenhum item adicionado ainda.')
  expect(screen.queryByRole('button', { name: 'Iniciar compra' })).not.toBeInTheDocument()
})
