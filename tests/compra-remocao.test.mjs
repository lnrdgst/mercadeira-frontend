import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

// Usa o transformador já instalado no projeto, sem novas dependências.
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
after(() => server.close())
const { removerItemCompra } = await server.ssrLoadModule('/src/features/shopping/api/shoppingApi.ts')
const { ItemCompraCard } = await server.ssrLoadModule('/src/features/shopping/components/ItemCompraCard.tsx')
const { SessionContext } = await server.ssrLoadModule('/src/features/auth/session/sessionContext.ts')

const autor = { participanteCompraId: 'participante', membroFamiliaId: 'membro', usuarioId: 'usuario', nome: 'Nome histórico' }
const remocao = { solicitadaPor: autor, solicitadaEm: '2026-09-10T12:00:00Z', decisao: null, decididaPor: null, decididaEm: null }
const base = {
  id: 'item-compra', itemListaOrigemId: 'item-lista', descricao: 'Arroz', quantidade: 1,
  unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 1,
  status: 'NO_CARRINHO', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null,
  colocadoNoCarrinhoPor: autor, colocadoNoCarrinhoEm: '2026-09-10T11:00:00Z',
  remocao: null, acoes: { podeSolicitarRemocao: false, podeDecidirRemocao: false },
}

function render(item, participante = false) {
  return renderToStaticMarkup(createElement(SessionContext.Provider, { value: { logout() {} } },
    createElement(ItemCompraCard, { item, participante, onColocar: async () => {}, onRemover: async () => {}, onReconciliar: async () => {} })))
}

test('POSTs usam ItemCompra.id, Bearer e nenhum body; preservam response completo inclusive autoaprovação', async (t) => {
  for (const [acao, status, decisao] of [
    ['solicitar-remocao', 'REMOCAO_SOLICITADA', null],
    ['solicitar-remocao', 'REMOVIDO', 'APROVADA'],
    ['aprovar-remocao', 'REMOVIDO', 'APROVADA'],
    ['rejeitar-remocao', 'NO_CARRINHO', 'REJEITADA'],
  ]) {
    const resposta = { ...base, status, remocao: { ...remocao, decisao, decididaPor: decisao ? autor : null, decididaEm: decisao ? '2026-09-10T12:01:00Z' : null } }
    const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.ok(url.endsWith(`/familias/familia/listas/lista/compra/itens/item-compra/${acao}`))
      assert.equal(options.method, 'POST')
      assert.equal(options.body, undefined)
      assert.equal(options.headers.get('Authorization'), 'Bearer token-de-teste')
      assert.equal(options.headers.get('Content-Type'), null)
      return Response.json(resposta)
    })
    assert.deepEqual(await removerItemCompra('token-de-teste', 'familia', 'lista', base.id, acao), resposta)
    assert.equal(fetchMock.mock.callCount(), 1)
    fetchMock.mock.restore()
  }
})

test('erros preservam status HTTP independentemente da mensagem', async (t) => {
  for (const status of [401, 403, 404, 409]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({
      timestamp: '2026-09-10T12:00:00Z', status, erro: 'CODIGO', mensagem: 'Texto variável', path: '/api/compra',
    }, { status }))
    await assert.rejects(removerItemCompra('token', 'familia', 'lista', base.id, 'aprovar-remocao'),
      (error) => error.status === status && error.message === 'Texto variável')
    fetchMock.mock.restore()
  }
})

test('solicitação depende exclusivamente da capability, inclusive após rejeição', () => {
  const html = render({ ...base, remocao: { ...remocao, decisao: 'REJEITADA', decididaPor: autor }, acoes: { podeSolicitarRemocao: true, podeDecidirRemocao: false } })
  assert.match(html, /Solicitar remoção/)
  assert.match(html, /Remoção rejeitada por Nome histórico/)
  assert.doesNotMatch(html, /Aprovar remoção|Rejeitar remoção/)
})

test('decisão depende exclusivamente da capability, sem inferir participação', () => {
  const html = render({ ...base, status: 'REMOCAO_SOLICITADA', remocao, acoes: { podeSolicitarRemocao: false, podeDecidirRemocao: true } })
  assert.match(html, /Aprovar remoção/)
  assert.match(html, /Rejeitar remoção/)
  assert.match(html, /Remoção solicitada por Nome histórico/)
  assert.doesNotMatch(html, /Colocar no carrinho|Solicitar remoção/)
})

test('capabilities falsas ocultam ações mesmo para participante; auditoria permanece para observador', () => {
  for (const participante of [true, false]) {
    const html = render({ ...base, status: 'REMOCAO_SOLICITADA', remocao }, participante)
    assert.doesNotMatch(html, /<button/)
    assert.match(html, /Remoção solicitada por Nome histórico/)
    assert.match(html, /datetime="2026-09-10T12:00:00Z"/i)
  }
})

test('removido permanece legível com badge e auditoria, sem ação de carrinho', () => {
  const html = render({ ...base, status: 'REMOVIDO', remocao: { ...remocao, decisao: 'APROVADA', decididaPor: autor, decididaEm: '2026-09-10T12:01:00Z' } }, true)
  assert.match(html, /Arroz/)
  assert.match(html, /Removido/)
  assert.match(html, /Remoção aprovada por Nome histórico/)
  assert.match(html, /datetime="2026-09-10T12:01:00Z"/i)
  assert.doesNotMatch(html, /<button/)
})

test('regressão: colocar no carrinho disponível somente para pendente e participante', () => {
  assert.match(render({ ...base, status: 'PENDENTE' }, true), /Colocar no carrinho/)
  assert.doesNotMatch(render({ ...base, status: 'PENDENTE' }), /<button/)
  assert.doesNotMatch(render(base, true), /<button/)
})
