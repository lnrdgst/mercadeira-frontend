import { afterEach, expect, test, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { Route, Routes } from 'react-router'
import { AlertaContinuidadeCompraModal } from '../src/features/shopping/components/AlertaContinuidadeCompraModal'
import type { CompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

afterEach(() => vi.restoreAllMocks())

const alerta = { necessario: true, iniciadaEm: '2026-10-04T12:00:00Z', adiadoAte: null }

function resposta(status: CompraResponse['status'], necessario: boolean): CompraResponse {
  return {
    id: 'compra', listaId: 'lista', nomeLista: 'Semana', categoria: 'OUTROS', estabelecimento: null,
    status, iniciadaEm: alerta.iniciadaEm, alertaContinuidade: { ...alerta, necessario },
    finalizadaPor: null, finalizadaEm: null, participantes: [], itens: [],
    contextoUsuario: { participanteCompra: true, podeAlterarPresenca: false, podeFinalizarCompra: false, podeReutilizarLista: false },
  }
}

test('renderiza acentuação correta e exige uma decisão explícita', () => {
  renderApp(<AlertaContinuidadeCompraModal alerta={alerta} token="token" familiaId="familia" listaId="lista" onAtualizar={vi.fn()} />)
  expect(screen.getByRole('dialog', { name: /Esta compra ainda/ })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Esta compra ainda está em andamento' })).toBeVisible()
  expect(screen.getByText('Esta compra foi iniciada há mais de um dia. Deseja continuar ou encerrá-la?')).toBeVisible()
  expect(screen.getByText(/Iniciada em/)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Fechar modal' })).not.toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.getByRole('dialog', { name: /Esta compra ainda/ })).toBeVisible()
})

test('continuar usa o estado devolvido pelo backend e não reabre após remount', async () => {
  const atualizada = resposta('EM_ANDAMENTO', false)
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(atualizada, { status: 200 }))
  const onAtualizar = vi.fn()
  function ModalComEstado() {
    const [alertaAtual, setAlertaAtual] = useState(alerta)
    return <AlertaContinuidadeCompraModal alerta={alertaAtual} token="token" familiaId="familia" listaId="lista" onAtualizar={(compra) => {
      setAlertaAtual(compra.alertaContinuidade ?? null)
      onAtualizar(compra)
    }} />
  }
  const view = renderApp(<ModalComEstado />)
  await view.user.click(screen.getByRole('button', { name: 'Continuar compra' }))
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  expect(String(fetch.mock.calls[0][0])).toContain('/familias/familia/listas/lista/compra/continuar')
  expect(onAtualizar).toHaveBeenCalledWith(atualizada)
  expect(screen.queryByRole('dialog', { name: /Esta compra ainda/ })).not.toBeInTheDocument()

  view.unmount()
  renderApp(<AlertaContinuidadeCompraModal alerta={atualizada.alertaContinuidade} token="token" familiaId="familia" listaId="lista" onAtualizar={onAtualizar} />)
  expect(screen.queryByRole('dialog', { name: /Esta compra ainda/ })).not.toBeInTheDocument()
})

test('encerrar usa endpoint próprio e navega diretamente para início', async () => {
  const atualizada = resposta('CANCELADA', false)
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(atualizada, { status: 200 }))
  const onAtualizar = vi.fn()
  const view = renderApp(<Routes>
    <Route path="/" element={<AlertaContinuidadeCompraModal alerta={alerta} token="token" familiaId="familia" listaId="lista" onAtualizar={onAtualizar} />} />
    <Route path="/inicio" element={<h1>Início</h1>} />
  </Routes>)

  await view.user.click(screen.getByRole('button', { name: 'Encerrar esta compra' }))
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  expect(String(fetch.mock.calls[0][0])).toContain('/familias/familia/listas/lista/compra/encerrar-prolongada')
  expect(onAtualizar).toHaveBeenCalledWith(atualizada)
  expect(await screen.findByRole('heading', { name: 'Início' })).toBeVisible()
  expect(screen.queryByText(/Revisão da compra/)).not.toBeInTheDocument()
})

test('erro ao encerrar mantém a modal aberta', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ mensagem: 'Não foi possível encerrar.' }, { status: 500 }))
  const view = renderApp(<AlertaContinuidadeCompraModal alerta={alerta} token="token" familiaId="familia" listaId="lista" onAtualizar={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Encerrar esta compra' }))
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(screen.getByRole('dialog', { name: /Esta compra ainda/ })).toBeVisible()
})
