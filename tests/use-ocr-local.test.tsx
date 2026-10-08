import { screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useOcrLocal } from '../src/features/shopping/hooks/useOcrLocal'
import { renderApp } from './helpers'

const tesseract = vi.hoisted(() => ({ createWorker: vi.fn() }))
vi.mock('tesseract.js', () => ({ createWorker: tesseract.createWorker, PSM: { SINGLE_LINE: 'single-line' } }))

function Probe() {
  const { reconhecer } = useOcrLocal()
  return <button type="button" onClick={() => void reconhecer('data:image/jpeg;base64,imagem')}>Ler</button>
}

test('cria worker sob demanda com recursos locais, sem cache persistente, e o encerra após reconhecer', async () => {
  const worker = { setParameters: vi.fn(), recognize: vi.fn().mockResolvedValue({ data: { text: '3,99', confidence: 96 } }), terminate: vi.fn() }
  tesseract.createWorker.mockResolvedValueOnce(worker)
  const { user } = renderApp(<Probe />)
  await user.click(screen.getByRole('button', { name: 'Ler' }))
  await waitFor(() => expect(tesseract.createWorker).toHaveBeenCalledWith('por', 1, expect.objectContaining({ workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang', cacheMethod: 'none' })))
  expect(worker.setParameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: 'single-line', tessedit_char_whitelist: '0123456789O.,R$' })
  await waitFor(() => expect(worker.terminate).toHaveBeenCalled())
})
