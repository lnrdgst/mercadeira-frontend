import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { CompraRevisaoPage } from '../src/features/shopping/pages/CompraRevisaoPage'
import { renderApp } from './helpers'

const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
  vi.spyOn(Math, 'random').mockReturnValue(0)
})
afterEach(() => { if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal); if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close) })

function compra(podeEncerrarCompraAdministrativamente = true) {
  return { id: 'compra', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_ANDAMENTO', iniciadaEm: '2026-09-01T12:00:00Z', finalizadaEm: null, finalizadaPor: null, participantes: [], itens: [], contextoUsuario: { participanteCompra: false, podeFinalizarCompra: false, podeEncerrarCompraAdministrativamente, podeReutilizarLista: false } }
}
function preparar(pode = true, encerrar = async () => Response.json({ ...compra(false), status: 'FINALIZADA', finalizadaEm: '2026-09-01T13:00:00Z' })) {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => String(input).endsWith('/finalizar-administrativamente') && options?.method === 'POST' ? encerrar() : Response.json(compra(pode)))
  const view = renderApp(<Routes><Route path="/listas/:listaId/compra/revisao" element={<CompraRevisaoPage />} /><Route path="/inicio" element={<h1>Início</h1>} /></Routes>, { route: '/listas/lista-a/compra/revisao' })
  return { ...view, fetch }
}

test('revisão só mostra encerramento administrativo pela capability e preserva mensagem genérica sem ela', async () => {
  preparar(false)
  await screen.findByText('Semana')
  expect(screen.queryByRole('button', { name: 'Encerrar compra' })).not.toBeInTheDocument()
  expect(screen.getByText('A finalização não está disponível para você no estado atual desta compra.')).toBeVisible()
})

test('revisão permite ao não participante encerrar por confirmação sensível e ir para Início', async () => {
  const { fetch, user } = preparar()
  await user.click(await screen.findByRole('button', { name: 'Encerrar compra' }))
  const dialog = screen.getByRole('dialog', { name: 'Encerrar esta compra?' })
  expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/finalizar-administrativamente'))).toBe(false)
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '9999')
  expect(within(dialog).getByRole('button', { name: 'Confirmar encerramento' })).toBeDisabled()
  await user.clear(within(dialog).getByLabelText('Código de confirmação'))
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar encerramento' }))
  expect(await screen.findByRole('heading', { name: 'Início' })).toBeVisible()
  expect(fetch.mock.calls.some(([url, options]) => String(url).endsWith('/finalizar-administrativamente') && options?.method === 'POST')).toBe(true)
})

test('cancelar ou erro administrativo não executa novamente e mantém a revisão recuperável', async () => {
  const { fetch, user } = preparar(true, async () => Response.json({ timestamp: '2026-09-01T13:00:00Z', status: 403, erro: 'ACESSO_NEGADO', mensagem: 'Você não é mais administrador(a).', path: '/api/compra/finalizar-administrativamente' }, { status: 403 }))
  await user.click(await screen.findByRole('button', { name: 'Encerrar compra' }))
  let dialog = screen.getByRole('dialog', { name: 'Encerrar esta compra?' })
  await user.click(within(dialog).getByRole('button', { name: 'Voltar' }))
  expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/finalizar-administrativamente'))).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Encerrar compra' }))
  dialog = screen.getByRole('dialog', { name: 'Encerrar esta compra?' })
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar encerramento' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Você não é mais administrador(a).')
  expect(screen.getByRole('heading', { name: 'Revisão da compra' })).toBeVisible()
})
