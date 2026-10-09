import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { renderApp } from './helpers'

type Item = {
  id: string
  descricao: string
  quantidade: number | null
  referenciaPreco: { precoUnitario: number; data: string; estabelecimento: string | null } | null
}

function renderLista({ itens, estimativa }: {
  itens: Item[]
  estimativa?: { valor: number; itensComReferencia: number; totalItens: number } | null
}) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.endsWith('/participantes')) return Response.json([])
    if (path.endsWith('/itens')) {
      return Response.json(itens.map((item, ordemExibicao) => ({
        ...item,
        unidadeMedida: 'UNIDADE', marca: null, observacoes: null, ordemExibicao,
        criadoEm: '2026-10-09T12:00:00Z', atualizadoEm: '2026-10-09T12:00:00Z',
      })))
    }
    if (path.endsWith('/listas/lista-a')) return Response.json({
      id: 'lista-a', nome: 'Semana', status: 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null,
      criador: { nome: 'Ana', membroFamiliaId: 'membro-a', usuarioId: 'usuario-a' },
      contextoUsuario: {
        membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: true,
        podeGerenciarParticipantes: false, podeAlterarItens: true,
        podeEditarDadosBasicos: false, podeSairDaLista: false, podeExcluirLista: false,
      },
      estimativa,
    })
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  return renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('mostra último preço, estimativa do item e consolidado retornado pelo backend', async () => {
  renderLista({
    itens: [{
      id: 'arroz', descricao: 'Arroz', quantidade: 2,
      referenciaPreco: { precoUnitario: 23.99, data: '2026-10-01T12:00:00Z', estabelecimento: 'Mercado Central' },
    }],
    estimativa: { valor: 47.98, itensComReferencia: 1, totalItens: 1 },
  })

  await screen.findByRole('heading', { name: 'Arroz' })
  expect(screen.getByText(/Último preço:/)).toHaveTextContent(/R\$\s*23,99/)
  expect(screen.getByText(/Estimado:/)).toHaveTextContent(/R\$\s*47,98/)
  expect(screen.getByText('Estimativa da lista')).toBeInTheDocument()
  expect(screen.getAllByText(/R\$\s*47,98/)).toHaveLength(2)
  expect(screen.getByText('1 de 1 item com referência')).toBeInTheDocument()
  expect(screen.queryByText('Mercado Central')).not.toBeInTheDocument()
  expect(screen.queryByText('2026-10-01T12:00:00Z')).not.toBeInTheDocument()
})

test('identifica item sem referência sem exibir preço fictício', async () => {
  renderLista({
    itens: [{ id: 'leite', descricao: 'Leite', quantidade: 1, referenciaPreco: null }],
    estimativa: { valor: 0, itensComReferencia: 0, totalItens: 1 },
  })

  await screen.findByRole('heading', { name: 'Leite' })
  expect(screen.getByText('Sem preço anterior')).toBeInTheDocument()
  expect(screen.queryByText(/Último preço:/)).not.toBeInTheDocument()
  expect(screen.getByText('0 de 1 item com referência')).toBeInTheDocument()
})

test('calcula a apresentação do item conforme sua quantidade planejada', async () => {
  renderLista({
    itens: [{
      id: 'cafe', descricao: 'Café', quantidade: 30,
      referenciaPreco: { precoUnitario: 0.7, data: '2026-10-01T12:00:00Z', estabelecimento: null },
    }],
    estimativa: { valor: 21, itensComReferencia: 1, totalItens: 1 },
  })

  await screen.findByRole('heading', { name: 'Café' })
  expect(screen.getByText(/Estimado:/)).toHaveTextContent(/R\$\s*21,00/)
})
