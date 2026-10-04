import { afterEach, expect, test, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { RegistrosFinanceirosCompra } from '../src/features/shopping/components/RegistrosFinanceirosCompra'
import type { CompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

afterEach(() => vi.restoreAllMocks())

function compra(status: CompraResponse['status'] = 'EM_ANDAMENTO'): CompraResponse {
  return {
    id: 'compra-a', listaId: 'lista-a', nomeLista: 'Semana', categoria: 'SUPERMERCADO', estabelecimento: null,
    status, iniciadaEm: '2026-10-02T18:00:00Z', finalizadaPor: null, finalizadaEm: null,
    participantes: [], itens: [], registrosFinanceiros: [{ id: 'registro-a', valor: 82.4, tipo: 'MANUAL', estabelecimentoNome: 'Mercado Central', criadoEm: '2026-10-02T18:00:00Z' }], totalRegistrado: 82.4,
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: false, podeFinalizarCompra: true, podeReutilizarLista: false, podeGerenciarRegistrosFinanceiros: status === 'EM_ANDAMENTO' },
  }
}

test('identifica registros NFC-e e respeita capability de gestão', () => {
  const finalizada = { ...compra('FINALIZADA'), registrosFinanceiros: [{ ...compra().registrosFinanceiros![0], tipo: 'NFCE' as const }], contextoUsuario: { ...compra().contextoUsuario, podeGerenciarRegistrosFinanceiros: true } }
  renderApp(<RegistrosFinanceirosCompra compra={finalizada} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  expect(screen.getByText('Valores da compra')).toBeVisible()
  expect(screen.getByText('Mercado Central')).toBeVisible()
  expect(screen.getByText('NFC-e')).toBeVisible()
  expect(screen.getAllByText(/82,40/)).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Escanear outro QR Code' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Remover' })).toBeVisible()
})

test('envia valor manual e estabelecimento para o endpoint da compra', async () => {
  const atualizada = { ...compra(), registrosFinanceiros: [], totalRegistrado: 0 }
  const onAtualizar = vi.fn()
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(atualizada, { status: 201 }))
  const view = renderApp(<RegistrosFinanceirosCompra compra={atualizada} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={onAtualizar} onNaoAutorizado={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Informar valor manualmente' }))
  await view.user.type(screen.getByLabelText('Valor'), '82,40')
  await view.user.type(screen.getByLabelText(/Estabelecimento/), 'Mercado Central')
  await view.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Adicionar valor' }))

  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  expect(fetch.mock.calls[0][0]).toContain('/familias/familia-a/listas/lista-a/compra/registros-financeiros')
  const request = fetch.mock.calls[0][1] as RequestInit
  expect(request.method).toBe('POST')
  expect((request.headers as Headers).get('Authorization')).toBe('Bearer token')
  expect(JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)).toEqual({ valor: 82.4, estabelecimentoNome: 'Mercado Central' })
  expect(onAtualizar).toHaveBeenCalledWith(atualizada)
})

test('analisa QR e confirma o registro NFC-e sem depender da câmera', async () => {
  const atualizada = { ...compra(), registrosFinanceiros: [], totalRegistrado: 37.53 }
  const onAtualizar = vi.fn()
  const chave = '35261012345678000123550010000012341000012345'
  const fetch = vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ nfceReconhecida: true, chaveNfce: chave, urlConsulta: `https://sefaz.exemplo.gov.br/nfce?q=${chave}`, valor: 37.53, estabelecimentoNome: null, cnpjEmitente: null, dataHoraDocumento: null }))
    .mockResolvedValueOnce(Response.json(atualizada, { status: 201 }))
  const view = renderApp(<RegistrosFinanceirosCompra compra={{ ...atualizada, totalRegistrado: 0 }} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={onAtualizar} onNaoAutorizado={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Escanear QR Code' }))
  expect(await screen.findByRole('dialog')).toBeVisible()
  await view.user.type(screen.getByLabelText('Conteúdo do QR Code'), `https://sefaz.exemplo.gov.br/nfce?q=${chave}`)
  await view.user.click(screen.getByRole('button', { name: 'Analisar NFC-e' }))
  expect(await screen.findByText('NFC-e identificada')).toBeVisible()
  await view.user.click(screen.getByRole('button', { name: 'Registrar NFC-e' }))

  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  expect(fetch.mock.calls[0][0]).toContain('/registros-financeiros/analisar-qr')
  expect(fetch.mock.calls[1][0]).toContain('/registros-financeiros/nfce')
  expect(JSON.parse((fetch.mock.calls[1][1] as RequestInit).body as string)).toEqual({
    valor: 37.53, estabelecimentoNome: null, chaveNfce: chave,
    urlConsulta: `https://sefaz.exemplo.gov.br/nfce?q=${chave}`, cnpjEmitente: null,
  })
  expect(onAtualizar).toHaveBeenCalledWith(atualizada)
})

test('mantém fallback manual quando a câmera não está disponível ou o QR não é NFC-e', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    nfceReconhecida: false, chaveNfce: null, urlConsulta: null, valor: null,
    estabelecimentoNome: null, cnpjEmitente: null, dataHoraDocumento: null,
  }))
  const view = renderApp(<RegistrosFinanceirosCompra compra={compra()} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Escanear outro QR Code' }))
  expect(await screen.findByText(/câmera não está disponível/i)).toBeVisible()
  await view.user.type(screen.getByLabelText('Conteúdo do QR Code'), 'https://mercadeira.app/convite')
  await view.user.click(screen.getByRole('button', { name: 'Analisar NFC-e' }))
  expect(await screen.findByText(/não parece ser de uma NFC-e/i)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Informar valor manualmente' })).toBeVisible()
  expect(fetch).toHaveBeenCalledOnce()
})

test('não expõe mutações financeiras sem capability', () => {
  const semPermissao = { ...compra(), contextoUsuario: { ...compra().contextoUsuario, podeGerenciarRegistrosFinanceiros: false } }
  renderApp(<RegistrosFinanceirosCompra compra={semPermissao} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  expect(screen.queryByRole('button', { name: /Escanear/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument()
})
