import { act, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ItemForm } from '../src/features/shopping-lists/components/ItemForm'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { ItemFieldsForm } from '../src/shared/components/ItemFieldsForm'
import { ItemDescriptionCombobox } from '../src/shared/components/ItemDescriptionCombobox'
import { deferred, renderApp } from './helpers'

const sugestoes = [{ descricao: 'Arroz', unidadeMedida: 'KG' }, { descricao: 'Arroz integral', unidadeMedida: 'PACOTE' }]

const showModalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true, writable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true, writable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') },
  })
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
  return { ...renderApp(<ItemForm submitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />), onSubmit, fetchMock }
}

test('modal da lista em preparação carrega, exibe e seleciona sugestões acima do rodapé sticky', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('/itens/sugestoes?termo=')) return Response.json(sugestoes)
    if (path.endsWith('/participantes')) return Response.json([])
    if (path.endsWith('/itens')) return Response.json([])
    if (path.endsWith('/listas/lista-a')) return Response.json({
      id: 'lista-a', nome: 'Compras da semana', status: 'EM_PREPARACAO', categoria: 'SUPERMERCADO', estabelecimento: null,
      criador: { nome: 'Ana', membroFamiliaId: 'membro-a', usuarioId: 'usuario-a' },
      contextoUsuario: { membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: true, podeGerenciarParticipantes: false, podeAlterarItens: true },
    })
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  const { user } = renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' })

  await user.click(await screen.findByRole('button', { name: 'Adicionar item na lista' }))
  const dialog = screen.getByRole('dialog')
  const input = within(dialog).getByRole('combobox', { name: 'Descrição' })
  expect(await within(dialog).findByRole('option', { name: /Arroz integral/ })).toBeVisible()
  expect(String(fetchMock.mock.calls.find(([url]) => String(url).includes('/itens/sugestoes'))?.[0])).toMatch(/\/familias\/familia-a\/itens\/sugestoes\?termo=$/)
  const listaSugestoes = within(dialog).getByRole('listbox')
  expect(listaSugestoes).toHaveClass('max-h-56')
  expect(listaSugestoes.parentElement).toHaveClass('relative', 'z-10')
  await user.click(within(dialog).getByRole('option', { name: /Arroz integral/ }))
  expect(input).toHaveValue('Arroz integral')
  expect(within(dialog).getByLabelText('Unidade')).toHaveValue('PACOTE')
})

test('recentes usam endpoint da família e seleção por teclado preenche apenas descrição/unidade', async () => {
  const { user, onSubmit, fetchMock } = preparar()
  const input = screen.getByRole('combobox', { name: 'Descrição' })
  expect(input).toHaveFocus()
  expect(await screen.findByRole('option', { name: /Arroz integral/ })).toBeVisible()
  expect(screen.getByText('Usados recentemente')).toBeVisible()
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/familias\/familia-a\/itens\/sugestoes\?termo=$/)
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
  expect(input).toHaveValue('Arroz integral')
  expect(input).toHaveFocus()
  expect(screen.getByLabelText('Unidade')).toHaveValue('PACOTE')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(onSubmit).toHaveBeenCalledWith({ descricao: 'Arroz integral', unidadeMedida: 'PACOTE', quantidade: null, marca: null, observacoes: null })
})

test('seleção por clique na edição preserva quantidade, marca e observações', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(sugestoes))
  const onSubmit = vi.fn(async () => {})
  const { user } = renderApp(<ItemForm item={{ id: 'item', descricao: 'Anterior', unidadeMedida: 'UNIDADE', quantidade: 3, marca: 'Minha marca', observacoes: 'Minha nota', ordemExibicao: 0, criadoEm: '', atualizadoEm: '' }} submitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />)
  await user.click((await within(await screen.findByRole('listbox')).findAllByRole('option'))[0])
  expect(screen.getByLabelText('Descrição')).toHaveValue('Arroz')
  expect(screen.getByLabelText('Quantidade')).toHaveValue(3)
  expect(screen.getByLabelText('Marca')).toHaveValue('Minha marca')
  expect(screen.getByLabelText('Observações')).toHaveValue('Minha nota')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(onSubmit).toHaveBeenCalledWith({ descricao: 'Arroz', unidadeMedida: 'KG', quantidade: 3, marca: 'Minha marca', observacoes: 'Minha nota' })
})

test('Escape fecha sugestões sem propagar ao dialog; Tab segue formulário sem selecionar', async () => {
  const bubblingKey = vi.fn()
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json(sugestoes))
  const { user } = renderApp(<div onKeyDown={bubblingKey}><ItemForm submitting={false} onCancel={vi.fn()} onSubmit={vi.fn()} /></div>)
  await screen.findByRole('option', { name: /Arroz integral/ })
  await user.keyboard('{ArrowDown}')
  const input = screen.getByLabelText('Descrição')
  expect(input).toHaveAttribute('aria-activedescendant')
  bubblingKey.mockClear()
  await user.keyboard('{Escape}')
  expect(bubblingKey).not.toHaveBeenCalled()
  expect(input).toHaveAttribute('aria-expanded', 'false')
  expect(input).toHaveValue('')
  await user.keyboard('{ArrowDown}')
  await screen.findByRole('option', { name: /Arroz integral/ })
  await user.keyboard('{ArrowUp}')
  await user.tab()
  expect(screen.getByLabelText('Quantidade')).toHaveFocus()
  expect(input).toHaveValue('')
})

test.each(['vazio', 'erro'])('busca %s permite salvar texto novo livremente', async (modo) => {
  const { user, onSubmit } = preparar(async () => modo === 'vazio' ? Response.json([]) : Response.json({}, { status: 503 }))
  await user.type(screen.getByLabelText('Descrição'), 'Novo produto')
  await screen.findByText(modo === 'vazio' ? 'Nenhuma sugestão. Você pode cadastrar um novo item.' : 'Não foi possível carregar sugestões. Você pode continuar digitando.')
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ descricao: 'Novo produto' }))
})

test('debounce busca texto mais recente e ignora resposta antiga', async () => {
  const antiga = deferred<Response>()
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => String(url).endsWith('termo=') ? antiga.promise : Response.json([{ descricao: 'Feijao', unidadeMedida: null }]))
  const { user } = renderApp(<ItemForm submitting={false} onCancel={vi.fn()} onSubmit={vi.fn()} />)
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
  await user.type(screen.getByLabelText('Descrição'), 'feij')
  await screen.findByRole('option', { name: /Feijao/ })
  expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('termo=feij')
  await act(async () => antiga.resolve(Response.json(sugestoes)))
  expect(screen.queryByRole('option', { name: /Arroz/ })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Descrição')).toHaveValue('feij')
})

test('trocar fonte de sugestões descarta resposta da família anterior', async () => {
  const antiga = deferred<[{ descricao: string; unidadeMedida: null }]>()
  const loadA = vi.fn(() => antiga.promise)
  const loadB = vi.fn(async () => [{ descricao: 'Família B', unidadeMedida: null }])
  const { rerender } = renderApp(<ItemDescriptionCombobox value="" disabled={false} onChange={vi.fn()} onSelect={vi.fn()} load={loadA} />)
  await waitFor(() => expect(loadA).toHaveBeenCalled())
  rerender(<ItemDescriptionCombobox value="" disabled={false} onChange={vi.fn()} onSelect={vi.fn()} load={loadB} />)
  await screen.findByRole('option', { name: /Família B/ })
  await act(async () => antiga.resolve([{ descricao: 'Família A', unidadeMedida: null }]))
  expect(screen.queryByRole('option', { name: /Família A/ })).not.toBeInTheDocument()
})

test('401 preserva expiração de sessão', async () => {
  const { session } = preparar(async () => new Response(null, { status: 401 }))
  await waitFor(() => expect(session.logout).toHaveBeenCalledOnce())
})

test('formulário da Compra sem sugestões preserva campo e não consulta histórico', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  renderApp(<ItemFieldsForm submitting={false} onCancel={vi.fn()} onSubmit={vi.fn()} />)
  expect(screen.getByRole('textbox', { name: 'Descrição' })).toBeVisible()
  expect(screen.queryByRole('combobox', { name: 'Descrição' })).not.toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})
