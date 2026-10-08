import { screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useOcrLocal } from '../src/features/shopping/hooks/useOcrLocal'
import { renderApp } from './helpers'

const tesseract = vi.hoisted(() => ({ createWorker: vi.fn() }))
vi.mock('tesseract.js', () => ({ createWorker: tesseract.createWorker, PSM: { SINGLE_LINE: 'single-line', SPARSE_TEXT: 'sparse-text' } }))

function Probe() {
  const { reconhecer } = useOcrLocal()
  return <button type="button" onClick={() => void reconhecer('data:image/png;base64,original', 'data:image/png;base64,processada')}>Ler</button>
}

test('cria worker sob demanda com recursos locais, sem cache persistente, e o encerra após reconhecer', async () => {
  const worker = { setParameters: vi.fn(), recognize: vi.fn().mockResolvedValueOnce({ data: { text: '3,99', confidence: 96 } }).mockResolvedValueOnce({ data: { text: '3,99\n6,50', confidence: 90 } }), terminate: vi.fn() }
  tesseract.createWorker.mockResolvedValueOnce(worker)
  const { user } = renderApp(<Probe />)
  await user.click(screen.getByRole('button', { name: 'Ler' }))
  await waitFor(() => expect(tesseract.createWorker).toHaveBeenCalledWith('por', 1, expect.objectContaining({ workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang', cacheMethod: 'none' })))
  expect(worker.setParameters).toHaveBeenNthCalledWith(1, { tessedit_pageseg_mode: 'single-line', tessedit_char_whitelist: '0123456789O.,R$' })
  expect(worker.setParameters).toHaveBeenNthCalledWith(2, { tessedit_pageseg_mode: 'sparse-text', tessedit_char_whitelist: '0123456789O.,R$' })
  expect(worker.recognize).toHaveBeenCalledTimes(2)
  await waitFor(() => expect(worker.terminate).toHaveBeenCalled())
})

test('mantém o resultado quando uma passagem falha e a outra conclui', async () => {
  const worker = { setParameters: vi.fn(), recognize: vi.fn().mockRejectedValueOnce(new Error('falha na primeira passagem')).mockResolvedValueOnce({ data: { text: 'R$ 1,39\nR$ 2,78', confidence: 90 } }), terminate: vi.fn() }
  tesseract.createWorker.mockResolvedValueOnce(worker)
  const { user } = renderApp(<Probe />)
  await user.click(screen.getByRole('button', { name: 'Ler' }))
  await waitFor(() => expect(worker.recognize).toHaveBeenCalledTimes(2))
  expect(worker.terminate).toHaveBeenCalled()
})
