import { screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { DadosCompraItem } from '../src/features/shopping/components/DadosCompraItem'
import { LeituraPrecoDialog } from '../src/features/shopping/components/LeituraPrecoDialog'
import type { ItemCompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

const ocr = vi.hoisted(() => ({ reconhecer: vi.fn(), encerrar: vi.fn() }))
vi.mock('../src/features/shopping/hooks/useOcrLocal', () => ({ useOcrLocal: () => ({ estado: 'idle', reconhecendo: false, reconhecer: ocr.reconhecer, encerrar: ocr.encerrar }) }))

const item: ItemCompraResponse = { id: 'item-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 1, status: 'NO_CARRINHO', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null, acoes: { podeColocarNoCarrinho: false, podeRestaurarNoCarrinho: false, podeSolicitarRemocao: true, podeRemoverDiretamente: true, podeDecidirRemocao: false } }

function configurarCamera() {
  const stop = vi.fn()
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,captura')
  return { getUserMedia, stop }
}

async function capturar(user: ReturnType<typeof renderApp>['user']) {
  const video = await screen.findByLabelText('Prévia da câmera')
  Object.defineProperties(video, { videoWidth: { configurable: true, value: 1280 }, videoHeight: { configurable: true, value: 720 } })
  await user.click(screen.getByRole('button', { name: 'Capturar preço' }))
}

test('abre a câmera traseira preferencialmente e mostra prévia', async () => {
  const { getUserMedia } = configurarCamera()
  renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={vi.fn()} />)
  expect(await screen.findByLabelText('Prévia da câmera')).toBeVisible()
  expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: expect.objectContaining({ facingMode: { ideal: 'environment' } }) }))
})

test('usa fallback compatível e apresenta retorno manual se a permissão for negada', async () => {
  const { getUserMedia } = configurarCamera()
  getUserMedia.mockRejectedValueOnce(new DOMException('restrição', 'OverconstrainedError'))
  renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={vi.fn()} />)
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2))
  expect(getUserMedia).toHaveBeenLastCalledWith({ audio: false, video: true })
})

test('um candidato OCR preenche localmente e não salva', async () => {
  configurarCamera(); ocr.reconhecer.mockResolvedValueOnce('3,99')
  const onSalvar = vi.fn(async () => {})
  const { user } = renderApp(<DadosCompraItem item={item} disabled={false} podeEditar onSalvar={onSalvar} />)
  await user.click(screen.getByRole('button', { name: 'Informar R$' }))
  await user.click(screen.getByRole('button', { name: 'Ler o preço da etiqueta' }))
  await capturar(user)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Preço unitário' })).toHaveTextContent(/R\$\s*3,99/))
  expect(onSalvar).not.toHaveBeenCalled()
})

test('vários candidatos exigem escolha e não escolhem automaticamente', async () => {
  configurarCamera(); ocr.reconhecer.mockResolvedValueOnce('R$ 13,98 R$ 14,90 R$ 15,98')
  const confirmar = vi.fn()
  const { user } = renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={confirmar} />)
  await capturar(user)
  expect(await screen.findAllByRole('radio')).toHaveLength(3)
  expect(confirmar).not.toHaveBeenCalled()
  await user.click(screen.getByRole('radio', { name: /R\$\s*14,90/ }))
  await user.click(screen.getByRole('button', { name: 'Usar preço' }))
  expect(confirmar).toHaveBeenCalledWith(14.9)
})

test('sem candidato permite tentar novamente ou informar manualmente', async () => {
  configurarCamera(); ocr.reconhecer.mockResolvedValueOnce('PROMOCAO 3 POR 20')
  const onClose = vi.fn()
  const { user } = renderApp(<LeituraPrecoDialog open onClose={onClose} onConfirmar={vi.fn()} />)
  await capturar(user)
  expect(await screen.findByText('Não encontrei um preço com segurança.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByLabelText('Prévia da câmera')).toBeVisible()
  await user.click(screen.getByLabelText('Fechar modal'))
  expect(onClose).toHaveBeenCalled()
})

test('fecha e desmonta liberando a câmera', async () => {
  const { stop } = configurarCamera()
  const view = renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={vi.fn()} />)
  await screen.findByLabelText('Prévia da câmera')
  view.unmount()
  expect(stop).toHaveBeenCalled()
})

test('sem permissão de edição não expõe a leitura', () => {
  renderApp(<DadosCompraItem item={item} disabled={false} podeEditar={false} onSalvar={vi.fn(async () => {})} />)
  expect(screen.queryByRole('button', { name: /Ler o preço da etiqueta|Informar R\$|Alterar R\$/ })).not.toBeInTheDocument()
})
