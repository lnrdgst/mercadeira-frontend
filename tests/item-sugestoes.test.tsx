import { act, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ItemForm } from '../src/features/shopping-lists/components/ItemForm'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { ItemFieldsForm } from '../src/shared/components/ItemFieldsForm'
import { ItemDescriptionCombobox } from '../src/shared/components/ItemDescriptionCombobox'
import { deferred, renderApp } from './helpers'

const sugestoes = [{ descricao: 'Arroz', unidadeMedida: 'KG' as const }, { descricao: 'Arroz integral', unidadeMedida: 'PACOTE' as const }]
const contextoLista = { listaId: 'lista-a', categoria: 'SUPERMERCADO' as const }
const showModalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})
afterAll(() => {
  for (const [name, descriptor] of [['showModal', showModalOriginal], ['close', closeOriginal]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

function preparar(response = async () => Response.json(sugestoes)) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(response)
  const onSubmit = vi.fn(async () => {})
  return { ...renderApp(<ItemForm {...contextoLista} submitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />), onSubmit, fetchMock }
}

test('lista em preparação consulta sugestões somente após dois caracteres e envia lista e categoria', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('/itens/sugestoes?')) return Response.json(sugestoes)
    if (path.endsWith('/participantes') || path.endsWith('/itens')) return Response.json([])
    if (path.endsWith('/listas/lista-a')) return Response.json({
      id: 'lista-a', nome: 'Compras da semana', status: 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null,
      criador: { nome: 'Ana', membroFamiliaId: 'membro-a', usuarioId: 'usuario-a' },
      contextoUsuario: { membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: true, podeGerenciarParticipantes: false, podeAlterarItens: true, podeEditarDadosBasicos: false, podeSairDaLista: false, podeExcluirLista: false },
    })
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  const { user } = renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' })
  await user.click(await screen.findByRole('button', { name: 'Adicionar item na lista' }))
  const dialog = screen.getByRole('dialog')
  const input = within(dialog).getByRole('combobox', { name: 'Descrição' })
  expect(screen.getByText('Digite ao menos 2 caracteres para buscar sugestões.')).toBeVisible()
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/itens/sugestoes'))).toBe(false)
  await user.type(input, 'ar')
  expect(await within(dialog).findByRole('option', { name: /Arroz integral/ })).toBeVisible()
  expect(String(fetchMock.mock.calls.find(([url]) => String(url).includes('/itens/sugestoes'))?.[0])).toContain('listaId=lista-a&categoria=SUPERMERCADO&termo=ar')
  await user.click(within(dialog).getByRole('option', { name: /Arroz integral/ }))
  expect(input).toHaveValue('Arroz integral')
  expect(within(dialog).getByLabelText('Unidade')).toHaveValue('PACOTE')
})

test('seleção preserva os demais campos e ainda permite inclusão livre', async () => {
  const { user, onSubmit } = preparar()
  const input = screen.getByRole('combobox', { name: 'Descrição' })
  await user.type(input, 'ar')
  await user.click(await screen.findByRole('option', { name: /Arroz integral/ }))
  await user.type(screen.getByLabelText('Quantidade'), '3')
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(onSubmit).toHaveBeenCalledWith({ descricao: 'Arroz integral', unidadeMedida: 'PACOTE', quantidade: 3, marca: null, observacoes: null })
})

test('proteção stale descarta resultado da categoria anterior', async () => {
  const antiga = deferred<[{ descricao: string; unidadeMedida: null }]>()
  const loadA = vi.fn(() => antiga.promise)
  const loadB = vi.fn(async () => [{ descricao: 'Farmácia', unidadeMedida: null }])
  const { rerender } = renderApp(<ItemDescriptionCombobox value="ar" disabled={false} onChange={vi.fn()} onSelect={vi.fn()} load={loadA} />)
  await waitFor(() => expect(loadA).toHaveBeenCalledWith('ar'))
  rerender(<ItemDescriptionCombobox value="ar" disabled={false} onChange={vi.fn()} onSelect={vi.fn()} load={loadB} />)
  expect(await screen.findByRole('option', { name: /Farmácia/ })).toBeVisible()
  await act(async () => antiga.resolve([{ descricao: 'Supermercado antigo', unidadeMedida: null }]))
  expect(screen.queryByRole('option', { name: 'Supermercado antigo' })).not.toBeInTheDocument()
})

test('401 da busca encerra a sessão e formulário sem sugestão não consulta histórico', async () => {
  const { user, session, fetchMock } = preparar(async () => new Response(null, { status: 401 }))
  await user.type(screen.getByLabelText('Descrição'), 'ar')
  await waitFor(() => expect(session.logout).toHaveBeenCalledOnce())
  const chamadasAntes = fetchMock.mock.calls.length
  const semSugestoes = renderApp(<ItemFieldsForm submitting={false} onCancel={vi.fn()} onSubmit={vi.fn()} />)
  expect(semSugestoes.container.querySelector('input')).toBeVisible()
  expect(fetchMock.mock.calls).toHaveLength(chamadasAntes)
})
