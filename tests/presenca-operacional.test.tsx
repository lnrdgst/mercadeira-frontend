import { act, screen, waitFor, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Link, Route, Routes } from 'react-router'
import { CompraAndamentoPage } from '../src/features/shopping/pages/CompraAndamentoPage'
import { AuthenticatedUserContext } from '../src/features/auth/user/AuthenticatedUserContext'
import type { CompraResponse, PresencaOperacional } from '../src/features/shopping/types/shopping'
import { deferred, renderApp } from './helpers'

function compra(estado: PresencaOperacional = 'NAO_INFORMADA', capability = false): CompraResponse {
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status: 'EM_ANDAMENTO', iniciadaEm: '2026-09-01T12:00:00Z', finalizadaEm: null, finalizadaPor: null,
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: true, podeFinalizarCompra: true, podeReutilizarLista: false },
    participantes: [{ id: 'p-a', membroFamiliaId: 'm-a', usuarioId: 'u-a', nome: 'Ana', papel: 'MEMBRO', geradoEm: '2026-09-01T12:00:00Z', presencaOperacional: { estado, alteradaEm: estado === 'NAO_INFORMADA' ? null : '2026-09-01T12:30:00Z' } }],
    itens: ['Arroz', 'Feijão'].map((descricao, index) => ({
      id: `item-${index}`, descricao, status: 'PENDENTE', ordemExibicao: index, quantidade: null, unidadeMedida: null,
      marca: null, observacoes: null, adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null,
      colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null,
      acoes: { podeColocarNoCarrinho: capability, podeSolicitarRemocao: false, podeDecidirRemocao: false, podeRestaurarNoCarrinho: false },
    })),
  }
}

function preparar({ inicial = compra(), put = async () => Response.json(compra('PRESENTE', true)), get = async () => Response.json(compra('NAO_PRESENTE')), post = async () => Response.json({}, { status: 409 }) } = {}) {
  let consultas = 0
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (options?.method === 'PUT') {
      expect(String(input)).toMatch(/\/familias\/familia-a\/listas\/lista-a\/compra\/minha-presenca$/)
      expect((options.headers as Headers).get('Authorization')).toBe('Bearer token-teste')
      return put()
    }
    if (options?.method === 'POST') return post()
    return ++consultas === 1 ? Response.json(inicial) : get()
  })
  const view = renderApp(<AuthenticatedUserContext value={{ usuario: { id: 'u-a', nome: 'Ana', email: 'ana@example.test' }, loading: false, error: false, recarregarUsuario: vi.fn(async () => {}) }}><Link to="/listas/lista-b/compra">Outra compra</Link><Routes>
    <Route path="/listas/:listaId/compra" element={<CompraAndamentoPage />} />
  </Routes></AuthenticatedUserContext>, { route: '/listas/lista-a/compra' })
  return { ...view, http, puts: () => http.mock.calls.filter(([, options]) => options?.method === 'PUT') }
}

test.each([
  ['NAO_INFORMADA', 'Presença não informada'], ['PRESENTE', 'No mercado'], ['NAO_PRESENTE', 'Não está no mercado'],
] as const)('GET preserva semântica de %s sem inferir autorização; inclusão permanece disponível', async (estado, label) => {
  preparar({ inicial: compra(estado) })
  expect(await screen.findByText(label)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Adicionar item' })).toBeEnabled()
  expect(screen.queryByRole('button', { name: /Colocar no carrinho:/ })).not.toBeInTheDocument()
})

test.each([false, undefined])('sem capability explícita não permite alterar presença (%s)', async (capability) => {
  const inicial = compra()
  Object.assign(inicial.contextoUsuario, { podeAlterarPresenca: capability })
  preparar({ inicial })
  await screen.findByText('Presença não informada')
  expect(screen.queryByRole('button', { name: 'Estou no mercado' })).not.toBeInTheDocument()
})

test('PUT explícito bloqueia envio duplicado e substitui toda Compra, inclusive permissões dos demais itens', async () => {
  const pendente = deferred<Response>()
  const { user, puts } = preparar({ put: () => pendente.promise })
  await user.dblClick(await screen.findByRole('button', { name: 'Estou no mercado' }))
  expect(puts()).toHaveLength(1)
  expect(JSON.parse(puts()[0][1]!.body as string)).toEqual({ estado: 'PRESENTE' })
  expect(screen.getByRole('button', { name: /Não estou no mercado/ })).toBeDisabled()
  await act(async () => pendente.resolve(Response.json(compra('PRESENTE', true))))
  expect(await screen.findByText('No mercado')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Colocar no carrinho:/ })).toHaveLength(2)
  expect(screen.queryByRole('heading', { name: 'Minha presença no mercado' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Ana.*Não estou no mercado/ })).toHaveFocus()
})

test('saída envia NAO_PRESENTE, aceita resposta do servidor sem otimismo e mantém inclusão', async () => {
  const { user, puts } = preparar({ inicial: compra('PRESENTE', true), put: async () => Response.json(compra('NAO_PRESENTE')) })
  await user.click(await screen.findByRole('button', { name: /Não estou no mercado/ }))
  expect(await screen.findByText('Não está no mercado')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Minha presença no mercado' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Ana.*Estou no mercado/ })).toHaveFocus()
  expect(JSON.parse(puts()[0][1]!.body as string)).toEqual({ estado: 'NAO_PRESENTE' })
  expect(screen.queryByRole('button', { name: /Colocar no carrinho:/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Adicionar item' })).toBeEnabled()
})

test.each([400, 403, 404, 409, 500])('erro %s reconcilia Compra completa sem repetir PUT', async (status) => {
  const atualizada = compra('NAO_PRESENTE')
  atualizada.contextoUsuario.podeAlterarPresenca = false
  const { user, puts, http } = preparar({ put: async () => Response.json({}, { status }), get: async () => Response.json(atualizada) })
  await user.click(await screen.findByRole('button', { name: 'Estou no mercado' }))
  expect(await screen.findByText('Não está no mercado')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Estou no mercado' })).not.toBeInTheDocument()
  expect(http).toHaveBeenCalledTimes(3)
  expect(puts()).toHaveLength(1)
})

test('falha de rede e de reconciliação bloqueia nova declaração até GET manual bem-sucedido', async () => {
  let falhar = true
  const { user, puts } = preparar({ put: async () => { throw new TypeError('offline') }, get: async () => { if (falhar) throw new TypeError('offline'); return Response.json(compra('PRESENTE', true)) } })
  await user.click(await screen.findByRole('button', { name: 'Estou no mercado' }))
  const atualizar = await screen.findByRole('button', { name: 'Atualizar compra' })
  expect(screen.getByRole('button', { name: 'Estou no mercado' })).toBeDisabled()
  falhar = false
  await user.click(atualizar)
  expect(await screen.findByText('No mercado')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Não estou no mercado/ })).toBeEnabled()
  expect(puts()).toHaveLength(1)
})

test('primeira declaração por teclado oculta bloco inicial e retorna pelo chip sem recriar bloco', async () => {
  let presente = true
  const { user, puts } = preparar({ put: async () => {
    const resposta = compra(presente ? 'NAO_PRESENTE' : 'PRESENTE')
    presente = !presente
    return Response.json(resposta)
  } })
  await screen.findByRole('heading', { name: 'Minha presença no mercado' })
  const inicial = screen.getByRole('button', { name: 'Não estou no mercado' })
  inicial.focus()
  await user.keyboard('{Enter}')
  const chip = await screen.findByRole('button', { name: /Ana.*Estou no mercado/ })
  expect(chip).toHaveFocus()
  expect(screen.queryByRole('heading', { name: 'Minha presença no mercado' })).not.toBeInTheDocument()
  await user.keyboard(' ')
  expect(await screen.findByRole('button', { name: /Ana.*Não estou no mercado/ })).toHaveFocus()
  expect(puts()).toHaveLength(2)
  expect(JSON.parse(puts()[1][1]!.body as string)).toEqual({ estado: 'PRESENTE' })
})

test('participantes compactos únicos antes de revisar; terceiros não têm controles mesmo com nome igual', async () => {
  const inicial = compra('PRESENTE')
  inicial.participantes.push(
    { ...inicial.participantes[0], id: 'p-b', usuarioId: 'u-b', nome: 'Ana', presencaOperacional: { estado: 'NAO_PRESENTE', alteradaEm: null } },
    { ...inicial.participantes[0], id: 'p-c', usuarioId: 'u-c', nome: 'Camila', presencaOperacional: { estado: 'NAO_INFORMADA', alteradaEm: null } },
  )
  preparar({ inicial })
  const area = await screen.findByRole('region', { name: 'Participantes' })
  expect(screen.getAllByRole('heading', { name: 'Participantes' })).toHaveLength(1)
  expect(within(area).getAllByRole('listitem')).toHaveLength(3)
  expect(within(area).getAllByRole('button')).toHaveLength(1)
  expect(within(area).getByText('No mercado')).toBeInTheDocument()
  expect(within(area).getByText('Não está no mercado')).toBeInTheDocument()
  expect(within(area).getByText('Presença não informada')).toBeInTheDocument()
  expect(area.compareDocumentPosition(screen.getByRole('link', { name: 'Revisar compra' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

test.each([false, undefined])('chip próprio após declaração continua condicionado à capability (%s)', async (capability) => {
  const inicial = compra('PRESENTE')
  Object.assign(inicial.contextoUsuario, { podeAlterarPresenca: capability })
  preparar({ inicial })
  const area = await screen.findByRole('region', { name: 'Participantes' })
  expect(within(area).queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Minha presença no mercado' })).not.toBeInTheDocument()
})

test('401 encerra sessão sem reconciliar nem repetir escrita', async () => {
  const { user, session, http } = preparar({ put: async () => new Response(null, { status: 401 }) })
  await user.click(await screen.findByRole('button', { name: 'Estou no mercado' }))
  await waitFor(() => expect(session.logout).toHaveBeenCalledOnce())
  expect(http).toHaveBeenCalledTimes(2)
})

test('409 de item reconcilia presenças e capabilities de todos os itens', async () => {
  const { user } = preparar({ inicial: compra('PRESENTE', true) })
  await user.click(await screen.findByRole('button', { name: 'Colocar no carrinho: Arroz' }))
  expect(await screen.findByText('Não está no mercado')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Colocar no carrinho:/ })).not.toBeInTheDocument()
})

test('resposta de presença de contexto anterior não sobrescreve a nova compra', async () => {
  const pendente = deferred<Response>()
  const nova = { ...compra('NAO_PRESENTE'), id: 'compra-b', listaId: 'lista-b', nomeLista: 'Outra lista' }
  const { user } = preparar({ put: () => pendente.promise, get: async () => Response.json(nova) })
  await user.click(await screen.findByRole('button', { name: 'Estou no mercado' }))
  await user.click(screen.getByRole('link', { name: 'Outra compra' }))
  await screen.findByRole('heading', { name: 'Outra lista' })
  await act(async () => pendente.resolve(Response.json(compra('PRESENTE', true))))
  expect(screen.getByText('Não está no mercado')).toBeInTheDocument()
  expect(screen.queryByText('No mercado')).not.toBeInTheDocument()
})

test('reconciliação que retorna finalizada encerra controles operacionais', async () => {
  const finalizada = compra('PRESENTE')
  finalizada.status = 'FINALIZADA'
  const { user } = preparar({ put: async () => Response.json({}, { status: 409 }), get: async () => Response.json(finalizada) })
  await user.click(await screen.findByRole('button', { name: 'Estou no mercado' }))
  await screen.findByRole('link', { name: 'Ver resumo' })
  expect(screen.queryByRole('button', { name: 'Estou no mercado' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Adicionar item' })).not.toBeInTheDocument()
})
