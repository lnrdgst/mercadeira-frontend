import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { renderApp } from './helpers'

const showModalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  if (showModalOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalOriginal)
  if (closeOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeOriginal)
})

function detalhe(podeExcluirLista: boolean) {
  return {
    id: 'lista-a', nome: 'Compras da semana', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_PREPARACAO',
    criadaEm: '2026-09-20T12:00:00Z', atualizadaEm: '2026-09-20T12:00:00Z',
    criador: { membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Ana Souza' },
    contextoUsuario: {
      membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: true,
      podeGerenciarParticipantes: true, podeAlterarItens: true, podeEditarDadosBasicos: true,
      podeSairDaLista: false, podeExcluirLista,
    },
  }
}

function Localizacao() {
  return <output data-testid="rota-atual">{useLocation().pathname}</output>
}

function preparar(podeExcluirLista = true, excluir = () => new Response(null, { status: 204 })) {
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = String(input)
    if (path.endsWith('/listas/lista-a') && options?.method === 'DELETE') return excluir()
    if (path.endsWith('/listas/lista-a')) return Response.json(detalhe(podeExcluirLista))
    if (path.endsWith('/participantes') || path.endsWith('/itens') || path.endsWith('/membros')) return Response.json([])
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  return {
    ...renderApp(<><Localizacao /><Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /><Route path="/listas" element={<p>Minhas listas</p>} /></Routes></>, { route: '/listas/lista-a' }),
    http,
  }
}

test('exibe a exclusão somente pela capability e exige código antes do DELETE', async () => {
  const { user, http } = preparar()
  await user.click(await screen.findByRole('button', { name: 'Excluir lista' }))
  const dialog = await screen.findByRole('dialog', { name: 'Excluir esta lista?' })
  const confirmar = within(dialog).getByRole('button', { name: 'Excluir lista' })
  expect(confirmar).toBeDisabled()
  expect(http.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false)

  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(confirmar)
  await waitFor(() => expect(http.mock.calls.some(([input, options]) => String(input).endsWith('/listas/lista-a') && options?.method === 'DELETE')).toBe(true))
  expect(await screen.findByText('Minhas listas')).toBeVisible()
  expect(screen.getByTestId('rota-atual')).toHaveTextContent('/listas')
})

test('não exibe a ação quando a capability é falsa', async () => {
  preparar(false)
  await screen.findByRole('heading', { name: 'Compras da semana' })
  expect(screen.queryByRole('button', { name: 'Excluir lista' })).not.toBeInTheDocument()
})

test('mantém a confirmação aberta e apresenta o erro retornado pelo backend', async () => {
  const { user } = preparar(true, () => Response.json({ timestamp: '2026-09-23T12:00:00Z', status: 409, erro: 'CONFLITO_DE_ESTADO', mensagem: 'A lista já possui uma compra associada.', path: '/api/familias/familia-a/listas/lista-a' }, { status: 409 }))
  await user.click(await screen.findByRole('button', { name: 'Excluir lista' }))
  const dialog = await screen.findByRole('dialog', { name: 'Excluir esta lista?' })
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(within(dialog).getByRole('button', { name: 'Excluir lista' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('A lista já possui uma compra associada.')
  expect(screen.getByTestId('rota-atual')).toHaveTextContent('/listas/lista-a')
})
