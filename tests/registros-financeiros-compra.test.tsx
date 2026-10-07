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
    participantes: [], itens: [], registrosFinanceiros: [{ id: 'registro-a', valor: 82.4, tipo: 'MANUAL', estabelecimentoNome: 'Mercado Central', criadoEm: '2026-10-02T18:00:00Z' }], totalRegistrado: 82.4, totalItensComprados: 82.4, quantidadeItensNoCarrinhoSemPreco: 0,
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: false, podeFinalizarCompra: true, podeReutilizarLista: false, podeGerenciarRegistrosFinanceiros: status === 'EM_ANDAMENTO' },
  }
}

test('mantém a gestão manual de valores após a finalização', () => {
  const finalizada = { ...compra('FINALIZADA'), contextoUsuario: { ...compra().contextoUsuario, podeGerenciarRegistrosFinanceiros: true } }
  renderApp(<RegistrosFinanceirosCompra compra={finalizada} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  expect(screen.getByText('Valores da compra')).toBeVisible()
  expect(screen.getByText('Mercado Central')).toBeVisible()
  expect(screen.getAllByText(/82,40/)).toHaveLength(3)
  expect(screen.getByRole('button', { name: 'Adicionar outro valor' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Remover' })).toBeVisible()
})

test('preenche o estabelecimento da Lista, mas permite alterar ou apagar antes de registrar', async () => {
  const inicial = { ...compra(), estabelecimento: 'Snapshot anterior', estabelecimentoLista: 'Supermaxi', registrosFinanceiros: [], totalRegistrado: 0 }
  const atualizada = { ...inicial, registrosFinanceiros: [{ id: 'registro-novo', valor: 1, tipo: 'MANUAL' as const, estabelecimentoNome: 'Farmacia X', criadoEm: '2026-10-02T19:00:00Z' }] }
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(atualizada, { status: 201 }))
  const view = renderApp(<RegistrosFinanceirosCompra compra={inicial} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Informar valor pago desta compra' }))
  const estabelecimento = screen.getByLabelText(/Estabelecimento/)
  expect(estabelecimento).toHaveValue('Supermaxi')
  await view.user.clear(estabelecimento)
  await view.user.type(estabelecimento, 'Farmacia X')
  await view.user.click(screen.getByRole('button', { name: /1$/ }))
  await view.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Adicionar valor' }))

  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  expect(JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)).toEqual({ valor: 1, estabelecimentoNome: 'Farmacia X' })
})

test('reutiliza o estabelecimento retornado pela Lista no prÃ³ximo registro sem recarregar a pÃ¡gina', async () => {
  const inicial = { ...compra(), registrosFinanceiros: [], totalRegistrado: 0 }
  const atualizada = { ...inicial, estabelecimentoLista: 'Supermaxi', registrosFinanceiros: [{ id: 'registro-novo', valor: 10, tipo: 'MANUAL' as const, estabelecimentoNome: 'Supermaxi', criadoEm: '2026-10-02T19:00:00Z' }], totalRegistrado: 10 }
  const onAtualizar = vi.fn()
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(atualizada, { status: 201 }))
  const view = renderApp(<RegistrosFinanceirosCompra compra={inicial} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={onAtualizar} onNaoAutorizado={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Informar valor pago desta compra' }))
  await view.user.click(screen.getByRole('button', { name: /1$/ }))
  await view.user.type(screen.getByLabelText(/Estabelecimento/), 'Supermaxi')
  await view.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Adicionar valor' }))
  await vi.waitFor(() => expect(onAtualizar).toHaveBeenCalledWith(atualizada))

  view.rerender(<RegistrosFinanceirosCompra compra={atualizada} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={onAtualizar} onNaoAutorizado={vi.fn()} />)
  await view.user.click(screen.getByRole('button', { name: 'Adicionar outro valor' }))
  expect(screen.getByLabelText(/Estabelecimento/)).toHaveValue('Supermaxi')
})

test('usa o estabelecimento da Lista tambÃ©m em compra finalizada', async () => {
  const finalizada = { ...compra('FINALIZADA'), estabelecimentoLista: 'Supermaxi', contextoUsuario: { ...compra().contextoUsuario, podeGerenciarRegistrosFinanceiros: true } }
  const view = renderApp(<RegistrosFinanceirosCompra compra={finalizada} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Adicionar outro valor' }))
  expect(screen.getByLabelText(/Estabelecimento/)).toHaveValue('Supermaxi')
})

test('envia valor manual e estabelecimento para o endpoint da compra', async () => {
  const atualizada = { ...compra(), registrosFinanceiros: [], totalRegistrado: 0 }
  const onAtualizar = vi.fn()
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(atualizada, { status: 201 }))
  const view = renderApp(<RegistrosFinanceirosCompra compra={atualizada} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={onAtualizar} onNaoAutorizado={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Informar valor pago desta compra' }))
  await view.user.click(screen.getByRole('button', { name: 'Número 8' }))
  await view.user.click(screen.getByRole('button', { name: 'Número 2' }))
  await view.user.click(screen.getByRole('button', { name: 'Vírgula decimal' }))
  await view.user.click(screen.getByRole('button', { name: 'Número 4' }))
  await view.user.click(screen.getByRole('button', { name: 'Número 0' }))
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

test('participante remoto consulta valores registrados sem receber mutações financeiras', () => {
  const remoto = {
    ...compra(),
    participantes: [{
      id: 'participante-remoto', membroFamiliaId: 'membro-remoto', usuarioId: 'usuario-remoto',
      nome: 'Pessoa remota', papel: 'MEMBRO' as const, geradoEm: '2026-10-02T18:00:00Z',
      presencaOperacional: { estado: 'NAO_PRESENTE' as const, alteradaEm: '2026-10-02T18:01:00Z' },
    }],
    contextoUsuario: { ...compra().contextoUsuario, podeGerenciarRegistrosFinanceiros: false },
  }
  renderApp(<RegistrosFinanceirosCompra compra={remoto} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  expect(screen.getByText(/Total registrado por item:/)).toHaveTextContent(/R\$\s*82,40/)
  expect(screen.getByText(/Valor pago da compra:/)).toHaveTextContent(/R\$\s*82,40/)
  expect(screen.getByText(/Diferença:/)).toHaveTextContent(/R\$\s*0,00/)
  expect(screen.getByText('Mercado Central')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Informar valor pago desta compra|Adicionar outro valor|Alterar valor/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument()
})

test('mostra total por item, mas não mostra diferença antes de informar o valor pago', () => {
  const semValorPago = { ...compra(), registrosFinanceiros: [], totalRegistrado: 0, totalItensComprados: 120 }
  renderApp(<RegistrosFinanceirosCompra compra={semValorPago} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  expect(screen.getByText(/Total registrado por item:/)).toHaveTextContent(/R\$\s*120,00/)
  expect(screen.queryByText(/Diferença:/)).not.toBeInTheDocument()
  expect(screen.queryByText(/Valor pago da compra:/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Informar valor pago desta compra' })).toBeVisible()
})

test('mostra uma única diferença positiva, negativa ou zero entre total por item e valor pago', () => {
  const { rerender } = renderApp(<RegistrosFinanceirosCompra compra={{ ...compra(), totalRegistrado: 115, registrosFinanceiros: [{ ...compra().registrosFinanceiros![0], valor: 115 }], totalItensComprados: 120 }} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  expect(screen.getByText(/Diferença:/)).toHaveTextContent(/\+\s*R\$\s*5,00/)
  expect(screen.getAllByText(/Diferença:/)).toHaveLength(1)

  rerender(<RegistrosFinanceirosCompra compra={{ ...compra(), totalRegistrado: 125, registrosFinanceiros: [{ ...compra().registrosFinanceiros![0], valor: 125 }], totalItensComprados: 120 }} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)
  expect(screen.getByText(/Diferença:/)).toHaveTextContent(/-\s*R\$\s*5,00/)

  rerender(<RegistrosFinanceirosCompra compra={{ ...compra(), totalItensComprados: 82.4 }} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)
  expect(screen.getByText(/Diferença:/)).toHaveTextContent(/R\$\s*0,00/)
  expect(screen.getByText(/Diferença:/)).not.toHaveTextContent(/[+-]\s*R\$/)
})

test('avisa quando há itens no carrinho sem preço e omite o aviso quando todos possuem preço', () => {
  const { rerender } = renderApp(<RegistrosFinanceirosCompra compra={{ ...compra(), quantidadeItensNoCarrinhoSemPreco: 1 }} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)

  expect(screen.getByText('1 item ainda está sem preço registrado.')).toBeVisible()

  rerender(<RegistrosFinanceirosCompra compra={{ ...compra(), quantidadeItensNoCarrinhoSemPreco: 0 }} token="token" familiaId="familia-a" listaId="lista-a" onAtualizar={vi.fn()} onNaoAutorizado={vi.fn()} />)
  expect(screen.queryByText(/item ainda está sem preço registrado/)).not.toBeInTheDocument()
})
