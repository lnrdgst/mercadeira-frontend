import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
after(() => server.close())
const { finalizarCompra, buscarCompra } = await server.ssrLoadModule('/src/features/shopping/api/shoppingApi.ts')
const { CompraResumo } = await server.ssrLoadModule('/src/features/shopping/components/CompraResumo.tsx')
const { SessionContext } = await server.ssrLoadModule('/src/features/auth/session/sessionContext.ts')
const autor = { participanteCompraId: 'participante-a', membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Autora histórica' }
const itens = ['PENDENTE', 'NO_CARRINHO', 'REMOVIDO'].map((status, ordemExibicao) => ({
  id: `item-${status}`, descricao: `Produto ${status}`, status, ordemExibicao, quantidade: 1,
  unidadeMedida: null, marca: null, observacoes: null, adicionadoDuranteCompra: false,
  adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: status === 'PENDENTE' ? null : autor,
  colocadoNoCarrinhoEm: status === 'PENDENTE' ? null : '2026-09-11T10:00:00Z',
  remocao: status === 'REMOVIDO' ? { solicitadaPor: autor, solicitadaEm: '2026-09-11T10:01:00Z', decisao: 'APROVADA', decididaPor: autor, decididaEm: '2026-09-11T10:01:00Z' } : null,
  acoes: { podeSolicitarRemocao: false, podeDecidirRemocao: false },
}))
const finalizada = { id: 'compra', listaId: 'lista', nomeLista: 'Compras', categoria: 'SUPERMERCADO', estabelecimento: null,
  status: 'FINALIZADA', iniciadaEm: '2026-09-11T09:00:00Z', finalizadaPor: autor, finalizadaEm: '2026-09-11T11:00:00Z',
  contextoUsuario: { participanteCompra: true, podeFinalizarCompra: false }, participantes: [], itens }
function render(compra) {
  return renderToStaticMarkup(createElement(SessionContext.Provider, { value: { logout() {} } }, createElement(CompraResumo, { compra })))
}

test('finalização e replay retornam Compra completa com mesmos estados e primeira autoria, sem body ou GET', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith('/familias/familia/listas/lista/compra/finalizar'))
    assert.equal(options.method, 'POST')
    assert.equal(options.body, undefined)
    assert.equal(options.headers.get('Authorization'), 'Bearer teste')
    assert.equal(options.headers.get('Content-Type'), null)
    return Response.json(finalizada)
  })
  for (let i = 0; i < 2; i++) assert.deepEqual(await finalizarCompra('teste', 'familia', 'lista'), finalizada)
  assert.equal(mock.mock.callCount(), 2)
  assert.equal(finalizada.itens.find((item) => item.id === 'item-PENDENTE').status, 'PENDENTE')
  assert.equal(finalizada.itens.find((item) => item.id === 'item-REMOVIDO').status, 'REMOVIDO')
  assert.equal(finalizada.finalizadaPor, autor)
  assert.equal(finalizada.finalizadaEm, '2026-09-11T11:00:00Z')
})

test('GET recupera Compra FINALIZADA com todos os itens e auditoria', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith('/familias/familia/listas/lista/compra'))
    assert.equal(options.method, 'GET')
    return Response.json(finalizada)
  })
  assert.deepEqual(await buscarCompra('teste', 'familia', 'lista'), finalizada)
})

test('401 sem JSON preserva status; 403/404/409 preservam envelope sem comparar mensagem', async (t) => {
  for (const status of [401, 403, 404, 409]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => status === 401 ? new Response(null, { status }) : Response.json({
      timestamp: '2026-09-11T11:00:00Z', status, erro: 'CONFLITO_DE_ESTADO', mensagem: 'Mensagem variável', path: '/api/compra/finalizar', campos: {},
    }, { status }))
    await assert.rejects(finalizarCompra('teste', 'familia', 'lista'), (error) => error.status === status && (status === 401 || error.response.mensagem === 'Mensagem variável'))
    mock.mock.restore()
  }
})

test('finalização não aceita sucesso sem body nem 201', async (t) => {
  for (const response of [new Response(null, { status: 200 }), new Response(null, { status: 204 }), Response.json(finalizada, { status: 201 })]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => response)
    await assert.rejects(finalizarCompra('teste', 'familia', 'lista'), /Não foi possível recuperar/)
    mock.mock.restore()
  }
})

test('resumo final mantém grupos, itens, auditoria e data, sem mutações mesmo com capabilities de item verdadeiras', () => {
  const compra = { ...finalizada, itens: itens.map((item) => ({ ...item, acoes: { podeSolicitarRemocao: true, podeDecidirRemocao: true } })) }
  const antes = JSON.stringify(compra)
  const html = render(compra)
  for (const texto of ['Compra finalizada', 'Finalizada por Autora histórica', 'Comprados (1)', 'Não comprados (1)', 'Removidos (1)', 'Remoção aprovada por Autora histórica']) assert.ok(html.includes(texto), texto)
  assert.match(html, /dateTime="2026-09-11T11:00:00Z"/)
  assert.doesNotMatch(html, /<button|permanecerá registrado/)
  assert.equal(JSON.stringify(compra), antes)
})

test('revisão avisa sobre pendentes e remoções sem alterar estados ou capability', () => {
  const compra = { ...finalizada, status: 'EM_ANDAMENTO', finalizadaPor: null, finalizadaEm: null,
    contextoUsuario: { participanteCompra: false, podeFinalizarCompra: true },
    itens: [...itens, { ...itens[0], id: 'solicitado', status: 'REMOCAO_SOLICITADA' }] }
  const antes = JSON.stringify(compra)
  const html = render(compra)
  assert.match(html, /Existe 1 item pendente/)
  assert.match(html, /Existem solicitações de remoção pendentes/)
  assert.match(html, /Remoção pendente \(1\)/)
  assert.doesNotMatch(html, /Compra finalizada|<button/)
  assert.equal(JSON.stringify(compra), antes)
})

test('remoção solicitada é apresentada como bloqueio, enquanto a autorização permanece na capability', () => {
  const solicitado = { ...itens[0], id: 'solicitado', status: 'REMOCAO_SOLICITADA' }
  const compraBloqueada = { ...finalizada, status: 'EM_ANDAMENTO', finalizadaPor: null, finalizadaEm: null,
    contextoUsuario: { participanteCompra: true, podeFinalizarCompra: false }, itens: [solicitado] }
  const html = render(compraBloqueada)
  assert.match(html, /Existem solicitações de remoção pendentes/)
  assert.match(html, /Remoção pendente \(1\)/)
  assert.equal(compraBloqueada.contextoUsuario.podeFinalizarCompra, false)
})
