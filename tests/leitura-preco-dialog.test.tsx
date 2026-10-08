import { screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { DadosCompraItem } from '../src/features/shopping/components/DadosCompraItem'
import { LeituraPrecoDialog } from '../src/features/shopping/components/LeituraPrecoDialog'
import type { ItemCompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

const item: ItemCompraResponse = {
  id: 'item-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 1,
  status: 'NO_CARRINHO', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null,
  acoes: { podeColocarNoCarrinho: false, podeRestaurarNoCarrinho: false, podeSolicitarRemocao: true, podeRemoverDiretamente: true, podeDecidirRemocao: false },
}

function configurarCamera() {
  const stop = vi.fn()
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  return { getUserMedia, stop }
}

async function avancarAteDemonstracao(user: ReturnType<typeof renderApp>['user']) {
  const video = await screen.findByLabelText('Prévia da câmera')
  Object.defineProperties(video, { videoWidth: { configurable: true, value: 1280 }, videoHeight: { configurable: true, value: 720 } })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,captura')
  await user.click(screen.getByRole('button', { name: 'Capturar foto' }))
  await user.click(screen.getByRole('button', { name: 'Usar captura' }))
}

test('abre a câmera traseira preferencialmente e mostra prévia', async () => {
  const { getUserMedia } = configurarCamera()
  renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={vi.fn()} />)
  expect(await screen.findByLabelText('Prévia da câmera')).toBeVisible()
  expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: { ideal: 'environment' } }) }))
})

test('usa configuração compatível quando a preferencial falha', async () => {
  const { getUserMedia } = configurarCamera()
  getUserMedia.mockRejectedValueOnce(new DOMException('restrição', 'OverconstrainedError'))
  renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={vi.fn()} />)
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2))
  expect(getUserMedia).toHaveBeenLastCalledWith({ audio: false, video: true })
})

test('negação apresenta retorno para entrada manual sem nova tentativa automática', async () => {
  const { getUserMedia } = configurarCamera()
  getUserMedia.mockRejectedValueOnce(new DOMException('negada', 'NotAllowedError'))
  renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={vi.fn()} />)
  expect(await screen.findByText(/Não foi possível acessar a câmera/)).toBeVisible()
  expect(getUserMedia).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Voltar para entrada manual' })).toBeVisible()
})

test('captura quadro em memória, permite tentar novamente e libera a câmera ao confirmar captura', async () => {
  const { stop } = configurarCamera()
  const { user } = renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={vi.fn()} />)
  const video = await screen.findByLabelText('Prévia da câmera')
  Object.defineProperties(video, { videoWidth: { configurable: true, value: 1280 }, videoHeight: { configurable: true, value: 720 } })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,captura')
  await user.click(screen.getByRole('button', { name: 'Capturar foto' }))
  expect(screen.getByAltText('Captura da etiqueta de preço')).toHaveAttribute('src', 'data:image/jpeg;base64,captura')
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  const novaPrevia = await screen.findByLabelText('Prévia da câmera')
  Object.defineProperties(novaPrevia, { videoWidth: { configurable: true, value: 1280 }, videoHeight: { configurable: true, value: 720 } })
  await user.click(screen.getByRole('button', { name: 'Capturar foto' }))
  await user.click(screen.getByRole('button', { name: 'Usar captura' }))
  expect(stop).toHaveBeenCalled()
  expect(screen.getByText(/Demonstração temporária/)).toBeVisible()
})

test('cancela e desmonta liberando todas as tracks', async () => {
  const { stop } = configurarCamera()
  const onClose = vi.fn()
  const view = renderApp(<LeituraPrecoDialog open onClose={onClose} onConfirmar={vi.fn()} />)
  await screen.findByLabelText('Prévia da câmera')
  await view.user.click(screen.getByLabelText('Fechar modal'))
  expect(onClose).toHaveBeenCalled()
  expect(stop).toHaveBeenCalled()
  view.unmount()
})

test('seleção temporária preserva confirmação explícita e não duplica candidatos', async () => {
  configurarCamera()
  const confirmar = vi.fn()
  const { user } = renderApp(<LeituraPrecoDialog open onClose={vi.fn()} onConfirmar={confirmar} />)
  await avancarAteDemonstracao(user)
  expect(screen.getByRole('button', { name: 'Selecione um preço' })).toBeDisabled()
  await user.selectOptions(screen.getByLabelText('Cenário de demonstração'), 'multiplos')
  expect(screen.getAllByRole('radio')).toHaveLength(3)
  await user.click(screen.getByRole('radio', { name: /R\$\s*14,90/ }))
  await user.click(screen.getByRole('button', { name: /Usar R\$\s*14,90/ }))
  expect(confirmar).toHaveBeenCalledWith(14.9)
})

test('Ler preço respeita permissão, preenche somente estado local e salvar continua separado', async () => {
  configurarCamera()
  const onSalvar = vi.fn(async () => {})
  const { user } = renderApp(<DadosCompraItem item={item} disabled={false} podeEditar onSalvar={onSalvar} />)
  expect(screen.queryByRole('button', { name: 'Ler o preço da etiqueta' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Informar R$' }))
  await user.click(screen.getByRole('button', { name: 'Ler o preço da etiqueta' }))
  await avancarAteDemonstracao(user)
  await user.click(screen.getByRole('radio', { name: /R\$\s*25,90/ }))
  await user.click(screen.getByRole('button', { name: /Usar R\$\s*25,90/ }))
  expect(screen.getByRole('button', { name: 'Preço unitário' })).toHaveTextContent(/R\$\s*25,90/)
  expect(onSalvar).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Salvar R$' }))
  expect(onSalvar).toHaveBeenCalledWith({ precoUnitario: 25.9, quantidadeComprada: 1 })
})

test('sem permissão de edição não expõe a leitura', () => {
  renderApp(<DadosCompraItem item={item} disabled={false} podeEditar={false} onSalvar={vi.fn(async () => {})} />)
  expect(screen.queryByRole('button', { name: /Ler o preço da etiqueta|Informar R\$|Alterar R\$/ })).not.toBeInTheDocument()
})
