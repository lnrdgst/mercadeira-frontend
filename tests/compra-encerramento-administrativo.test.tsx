import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { CompraAndamentoPage } from '../src/features/shopping/pages/CompraAndamentoPage'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import type { CompraResponse } from '../src/features/shopping/types/shopping'
import { deferred, renderApp } from './helpers'

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

function compra(podeEncerrarCompraAdministrativamente = true): CompraResponse {
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status: 'EM_ANDAMENTO', iniciadaEm: '2026-09-21T12:00:00Z', finalizadaEm: null, finalizadaPor: null,
    contextoUsuario: { participanteCompra: false, podeAlterarPresenca: false, podeFinalizarCompra: false, podeReutilizarLista: false, podeEncerrarCompraAdministrativamente },
    responsabilidadeOperacional: { responsavel: { participanteCompraId: 'p-outra', membroFamiliaId: 'm-outra', usuarioId: 'u-outra', nome: 'Bia' }, ciclo: 1, cicloAtivo: true, revisao: 2, responsavelAnteriorId: null, alteradaPorParticipanteCompraId: 'p-outra', alteradaEm: '2026-09-21T12:00:00Z', motivo: 'INICIO_COMPRA' },
    participantes: [{ id: 'p-outra', membroFamiliaId: 'm-outra', usuarioId: 'u-outra', nome: 'Bia', papel: 'MEMBRO', geradoEm: '2026-09-21T12:00:00Z', presencaOperacional: { estado: 'PRESENTE', alteradaEm: '2026-09-21T12:00:00Z' } }],
    itens: [{ id: 'item-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 0, status: 'PENDENTE', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: { podeColocarNoCarrinho: false, podeSolicitarRemocao: false, podeDecidirRemocao: false, podeRestaurarNoCarrinho: false } }],
  }
}

function finalizada(): CompraResponse {
  return { ...compra(false), status: 'FINALIZADA', finalizadaEm: '2026-09-21T13:00:00Z' }
}

function preparar({ inicial = compra(), encerrar = async () => Response.json(finalizada()) }: { inicial?: CompraResponse; encerrar?: () => Promise<Response> } = {}) {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (String(input).endsWith('/finalizar-administrativamente') && options?.method === 'POST') return encerrar()
    return Response.json(inicial)
  })
  const view = renderApp(<AuthenticatedUserContext value={{ usuario: { id: 'u-admin', nome: 'Ana', email: 'ana@test.local' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}>
    <Routes>
      <Route path="/listas/:listaId/compra" element={<CompraAndamentoPage />} />
      <Route path="/inicio" element={<h1>Início</h1>} />
    </Routes>
  </AuthenticatedUserContext>, { route: '/listas/lista-a/compra' })
  return { ...view, fetch }
}

async function abrirConfirmacao() {
  await screen.findByRole('button', { name: 'Encerrar compra' })
  await screen.getByRole('button', { name: 'Encerrar compra' }).click()
  return screen.findByRole('dialog', { name: 'Encerrar esta compra?' })
}

test('capability falsa não expõe encerramento administrativo nem altera o fluxo normal da Compra', async () => {
  preparar({ inicial: compra(false) })

  await screen.findByRole('heading', { name: 'Semana' })
  expect(screen.queryByRole('button', { name: 'Encerrar compra' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Revisar compra' })).toBeVisible()
})

test('capability verdadeira expõe a ação ao(à) administrador(a) que não participa da Compra', async () => {
  preparar()

  await screen.findByRole('button', { name: 'Encerrar compra' })
  expect(screen.getByText('Como administrador(a) da família, você pode encerrar esta compra caso ela não esteja mais sendo realizada.')).toBeVisible()
  expect(screen.getByText('Você pode acompanhar esta compra, mas não participa dela.')).toBeVisible()
})

test('abrir, cancelar ou informar código incorreto não chama o endpoint', async () => {
  const { fetch, user } = preparar()
  const dialog = await abrirConfirmacao()
  expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/finalizar-administrativamente'))).toBe(false)
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '9999')
  expect(within(dialog).getByRole('button', { name: 'Confirmar encerramento' })).toBeDisabled()
  await user.click(within(dialog).getByRole('button', { name: 'Voltar' }))
  expect(screen.queryByRole('dialog', { name: 'Encerrar esta compra?' })).not.toBeInTheDocument()
  expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/finalizar-administrativamente'))).toBe(false)
})

test('código correto chama exclusivamente o endpoint administrativo e navega para Início', async () => {
  const { fetch, user } = preparar()
  const dialog = await abrirConfirmacao()
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar encerramento' }))

  await screen.findByRole('heading', { name: 'Início' })
  const chamada = fetch.mock.calls.find(([url, options]) => String(url).endsWith('/finalizar-administrativamente') && options?.method === 'POST')
  expect(chamada).toBeDefined()
  expect(String(chamada![0])).toContain('/familias/familia-a/listas/lista-a/compra/finalizar-administrativamente')
})

test('submissão permanece bloqueada enquanto o endpoint está em andamento', async () => {
  const resposta = deferred<Response>()
  const { fetch, user } = preparar({ encerrar: () => resposta.promise })
  const dialog = await abrirConfirmacao()
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  const confirmar = within(dialog).getByRole('button', { name: 'Confirmar encerramento' })
  await user.click(confirmar)
  await waitFor(() => expect(confirmar).toBeDisabled())
  expect(within(dialog).getByRole('button', { name: 'Voltar' })).toBeDisabled()
  expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('/finalizar-administrativamente'))).toHaveLength(1)
  resposta.resolve(Response.json(finalizada()))
  await screen.findByRole('heading', { name: 'Início' })
})

test('erro do endpoint mantém a confirmação recuperável sem alterar participantes, presença ou responsabilidade localmente', async () => {
  const inicial = compra()
  const antes = structuredClone(inicial)
  const { fetch, user } = preparar({ inicial, encerrar: async () => Response.json({ timestamp: '2026-09-21T13:00:00Z', status: 403, erro: 'ACESSO_NEGADO', mensagem: 'Você não é mais administrador(a) desta família.', path: '/api/compra/finalizar-administrativamente' }, { status: 403 }) })
  const dialog = await abrirConfirmacao()
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar encerramento' }))

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Você não é mais administrador(a) desta família.')
  expect(inicial).toEqual(antes)
  expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('/finalizar-administrativamente'))).toHaveLength(1)
  await user.click(within(dialog).getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('button', { name: 'Encerrar compra' })).toBeVisible()
})
