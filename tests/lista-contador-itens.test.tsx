import { cleanup, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { renderApp } from './helpers'

const showModalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    writable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    writable: true,
    value: function (this: HTMLDialogElement) { this.removeAttribute('open') },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

afterAll(() => {
  if (showModalOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalOriginal)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  if (closeOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeOriginal)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

function renderLista(itens: Array<Record<string, unknown>>) {
  let itensAtuais = itens
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = String(input)
    if (path.includes('/itens/sugestoes?')) return Response.json([])
    if (path.endsWith('/itens') && options?.method === 'POST') {
      return Response.json({
        id: 'item-novo', descricao: 'Cafe', quantidade: 5, unidadeMedida: null,
        marca: null, observacoes: null, ordemExibicao: 0,
      }, { status: 201 })
    }
    if (path.endsWith('/itens/ordem') && options?.method === 'PUT') return new Response(null, { status: 204 })
    if (options?.method === 'DELETE') {
      itensAtuais = []
      return new Response(null, { status: 204 })
    }
    if (path.endsWith('/participantes')) return Response.json([])
    if (path.endsWith('/itens')) return Response.json(itensAtuais)
    if (path.endsWith('/listas/lista-a')) return Response.json({
      id: 'lista-a', nome: 'Compras da semana', status: 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null,
      criador: { nome: 'Ana', membroFamiliaId: 'membro-a', usuarioId: 'usuario-a' },
      contextoUsuario: {
        membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: true,
        podeGerenciarParticipantes: false, podeAlterarItens: true,
        podeEditarDadosBasicos: false, podeSairDaLista: false, podeExcluirLista: false,
      },
    })
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  return renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' })
}

test('contador usa linhas, mesmo quando as quantidades internas sao maiores', async () => {
  renderLista([
    { id: 'item-a', descricao: 'Arroz', quantidade: 5, unidadeMedida: 'KG', marca: null, observacoes: null, ordemExibicao: 0 },
    { id: 'item-b', descricao: 'Leite', quantidade: 3, unidadeMedida: 'UNIDADE', marca: null, observacoes: null, ordemExibicao: 1 },
  ])
  await screen.findByRole('heading', { name: 'Arroz' })
  expect(screen.getByText('2 itens')).toBeInTheDocument()
})

test('contador acompanha a inclusao de item', async () => {
  const { user } = renderLista([])
  await screen.findByText('Nenhum item adicionado ainda.')
  expect(screen.getByText('0 itens')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Adicionar item na lista' }))
  const dialog = screen.getByRole('dialog')
  await user.type(within(dialog).getByRole('combobox', { name: /Descr/ }), 'Cafe')
  await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }))
  expect(await screen.findByText('1 item')).toBeInTheDocument()
})

test('contador acompanha a remocao de item', async () => {
  const { user } = renderLista([
    { id: 'item-a', descricao: 'Arroz', quantidade: 1, unidadeMedida: 'KG', marca: null, observacoes: null, ordemExibicao: 0 },
  ])
  await screen.findByRole('heading', { name: 'Arroz' })
  expect(screen.getByText('1 item')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Remover Arroz da lista' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }))
  expect(await screen.findByText('0 itens')).toBeInTheDocument()
})
