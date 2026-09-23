import { act, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { EditarDadosLista } from '../src/features/shopping-lists/components/EditarDadosLista'
import type { ListaCompraDetalheResponse } from '../src/features/shopping-lists/types/shoppingList'
import { deferred, renderApp } from './helpers'

function lista(permitido = true): ListaCompraDetalheResponse {
  return { id: 'lista-a', nome: 'Original', categoria: 'SUPERMERCADO', estabelecimento: 'Mercado', status: 'EM_PREPARACAO', criadaEm: '2026-09-13T12:00:00Z', atualizadaEm: '2026-09-13T12:00:00Z',
    criador: { nome: 'Outra pessoa', membroFamiliaId: 'outro', usuarioId: 'outro' },
    contextoUsuario: { membroFamiliaId: 'membro-a', papelFamilia: 'MEMBRO', participanteAtivo: false, podeGerenciarParticipantes: false, podeAlterarItens: false, podeEditarDadosBasicos: permitido, podeSairDaLista: false, podeExcluirLista: false } }
}

test('apresenta o status de preparação antes da categoria com destaque neutro', async () => {
  preparar(async () => Response.json(lista()))

  const status = await screen.findByText('Em preparação')
  const categoria = screen.getByText('Supermercado')
  expect(status.compareDocumentPosition(categoria) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  expect(status).toHaveClass('border', 'border-foreground/20', 'bg-foreground/5', 'text-foreground-muted')
  expect(categoria).toHaveClass('bg-foreground/5', 'text-foreground-muted')
})

function preparar(salvar: () => Promise<Response>, inicial = lista(), consultar?: () => Promise<Response>) {
  let consultas = 0
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (options?.method === 'PUT') return salvar()
    if (String(input).endsWith('/listas/lista-a')) {
      consultas++
      return consultas > 1 && consultar ? consultar() : Response.json(inicial)
    }
    return Response.json([])
  })
  const view = renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' })
  return { ...view, fetchMock, puts: () => fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT') }
}
async function abrir(user: ReturnType<typeof renderApp>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Editar dados desta lista' }))
}

test('capability concede ação sem inferir papel, autoria ou participação; salva representação completa e reabre atualizada', async () => {
  const atualizada = { ...lista(), nome: 'Corrigida pelo servidor', categoria: 'ROUPAS', estabelecimento: null }
  const { user, puts } = preparar(async () => Response.json(atualizada))
  await abrir(user)
  expect(screen.getByLabelText('Nome da lista')).toHaveValue('Original')
  expect(screen.getByLabelText('Nome da lista')).toHaveFocus()
  expect(screen.getByLabelText('Categoria')).toHaveValue('SUPERMERCADO')
  expect(screen.getByLabelText('Estabelecimento (opcional)')).toHaveValue('Mercado')
  await user.clear(screen.getByLabelText('Nome da lista'))
  await user.type(screen.getByLabelText('Nome da lista'), 'Corrigida')
  await user.selectOptions(screen.getByLabelText('Categoria'), 'ROUPAS')
  await user.clear(screen.getByLabelText('Estabelecimento (opcional)'))
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Corrigida pelo servidor' })).toBeVisible()
  expect(puts()).toHaveLength(1)
  expect(String(puts()[0][0])).toMatch(/\/familias\/familia-a\/listas\/lista-a$/)
  expect(JSON.parse(String(puts()[0][1]?.body))).toEqual({ nome: 'Corrigida', categoria: 'ROUPAS', estabelecimento: null })
  await abrir(user)
  expect(screen.getByLabelText('Nome da lista')).toHaveValue('Corrigida pelo servidor')
  expect(screen.getByLabelText('Estabelecimento (opcional)')).toHaveValue('')
})

test('capability falsa oculta ação mesmo para criador administrador participante', async () => {
  const inicial = lista(false)
  inicial.criador.membroFamiliaId = 'membro-a'
  inicial.contextoUsuario.papelFamilia = 'ADMINISTRADOR'
  inicial.contextoUsuario.participanteAtivo = true
  preparar(async () => { throw new Error('Não deveria salvar') }, inicial)
  await screen.findByRole('heading', { name: 'Original' })
  expect(screen.queryByRole('button', { name: 'Editar dados desta lista' })).not.toBeInTheDocument()
})

test('nome vazio mostra mensagem em português, suprime aviso nativo e permite corrigir', async () => {
  const { user, puts } = preparar(async () => Response.json(lista()))
  await abrir(user)
  const nome = screen.getByLabelText('Nome da lista')
  let invalidEvent: Event | undefined
  nome.addEventListener('invalid', (event) => { invalidEvent = event })
  await user.clear(nome)
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome da lista.')
  expect(invalidEvent?.defaultPrevented).toBe(true)
  expect(nome).toHaveFocus()
  expect(puts()).toHaveLength(0)
  await user.type(nome, 'Nome corrigido')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument())
  expect(puts()).toHaveLength(1)
})

test('Cancelar descarta rascunho sem PUT; nome em branco não é enviado', async () => {
  const { user, puts } = preparar(async () => Response.json(lista()))
  await abrir(user)
  await user.clear(screen.getByLabelText('Nome da lista'))
  await user.type(screen.getByLabelText('Nome da lista'), '   ')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome')
  expect(puts()).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByRole('button', { name: 'Editar dados desta lista' })).toHaveFocus()
  await abrir(user)
  await user.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: 'Editar dados desta lista' })).toHaveFocus()
  await abrir(user)
  expect(screen.getByLabelText('Nome da lista')).toHaveValue('Original')
})

test('envio bloqueia duplicação e cancelamento; erro preserva valores para nova tentativa', async () => {
  const pendente = deferred<Response>()
  let chamadas = 0
  const { user, puts } = preparar(() => ++chamadas === 1 ? pendente.promise : Promise.resolve(Response.json(lista())))
  await abrir(user)
  await user.type(screen.getByLabelText('Nome da lista'), ' alterada')
  await user.dblClick(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(puts()).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  await act(async () => pendente.resolve(erroApi(400, 'Nome inválido')))
  expect(await screen.findByRole('alert')).toHaveTextContent('Nome inválido')
  expect(screen.getByLabelText('Nome da lista')).toHaveValue('Original alterada')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument())
  expect(puts()).toHaveLength(2)
})

test.each([403, 409])('%i reconcilia por GET e impede novos envios quando capability muda', async (status) => {
  const atualizada = { ...lista(false), status: 'EM_COMPRA' as const }
  const { user, puts } = preparar(async () => erroApi(status, 'Edição indisponível'), lista(), async () => Response.json(atualizada))
  await abrir(user)
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByText('Os dados desta lista estão disponíveis somente para leitura.')).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent('Edição indisponível')
  expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  expect(puts()).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('button', { name: 'Editar dados desta lista' })).not.toBeInTheDocument()
})

test('falha do GET de reconciliação bloqueia salvar até atualização bem-sucedida', async () => {
  let consultas = 0
  const { user } = preparar(async () => erroApi(409, 'Conflito'), lista(), async () => ++consultas === 1 ? Response.json({}, { status: 503 }) : Response.json(lista()))
  await abrir(user)
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('button', { name: 'Atualizar lista' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Atualizar lista' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled())
})

test('401 mantém tratamento de sessão', async () => {
  const { user, session } = preparar(async () => new Response(null, { status: 401 }))
  await abrir(user)
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(session.logout).toHaveBeenCalledOnce())
})

test('resposta pendente não atualiza página após sair do contexto', async () => {
  const resposta = deferred<Response>()
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => resposta.promise)
  const onAtualizada = vi.fn()
  const { user, unmount } = renderApp(<EditarDadosLista familiaId="familia-a" lista={lista()} onAtualizada={onAtualizada} />)
  await abrir(user)
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  unmount()
  await act(async () => resposta.resolve(Response.json(lista())))
  expect(onAtualizada).not.toHaveBeenCalled()
})

test('GET de lista após F5 mantém dados e capability de somente leitura', async () => {
  preparar(async () => Response.json(lista()), { ...lista(false), nome: 'Persistida', status: 'FINALIZADA' })
  expect(await screen.findByRole('heading', { name: 'Persistida' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Editar dados desta lista' })).not.toBeInTheDocument()
})

function erroApi(status: number, mensagem: string) {
  return Response.json({ timestamp: '2026-09-13T12:00:00Z', status, erro: 'ERRO_TESTE', mensagem, path: '/api/familias/familia-a/listas/lista-a', campos: null }, { status })
}
