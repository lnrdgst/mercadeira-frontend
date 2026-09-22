import { screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { FamiliaPage } from '../src/features/family/pages/FamiliaPage'
import { renderApp } from './helpers'

const shareOriginal = Object.getOwnPropertyDescriptor(navigator, 'share')
const clipboardOriginal = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const execCommandOriginal = document.execCommand

afterEach(() => {
  if (shareOriginal) Object.defineProperty(navigator, 'share', shareOriginal)
  else delete (navigator as { share?: Navigator['share'] }).share
  if (clipboardOriginal) Object.defineProperty(navigator, 'clipboard', clipboardOriginal)
  else delete (navigator as { clipboard?: Clipboard }).clipboard
  document.execCommand = execCommandOriginal
})

function definirShare(share?: (dados: ShareData) => Promise<void>) {
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
}

function definirClipboard(writeText?: (texto: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: writeText ? { writeText } : undefined })
}

test('compartilha nativamente quando Share API está disponível', async () => {
  const share = vi.fn(async () => {})
  definirShare(share)
  renderApp(<FamiliaPage />)
  await screen.findByText('Código de ingresso')
  await screen.getByRole('button', { name: 'Compartilhar' }).click()
  expect(share).toHaveBeenCalledOnce()
  expect(await screen.findByText('Código compartilhado.')).toBeInTheDocument()
})

test('compartilhamento indisponível copia o código', async () => {
  definirShare()
  const writeText = vi.fn(async () => {})
  definirClipboard(writeText)
  renderApp(<FamiliaPage />)
  await screen.findByText('Código de ingresso')
  await screen.getByRole('button', { name: 'Compartilhar' }).click()
  expect(await screen.findByText('Compartilhamento não disponível. Código copiado.')).toBeInTheDocument()
})

test('cancelar compartilhamento não mostra erro', async () => {
  definirShare(async () => { throw Object.assign(new Error('cancelado'), { name: 'AbortError' }) })
  renderApp(<FamiliaPage />)
  await screen.findByText('Código de ingresso')
  await screen.getByRole('button', { name: 'Compartilhar' }).click()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('falha técnica ao compartilhar tenta copiar o código', async () => {
  definirShare(async () => { throw new Error('falha') })
  const writeText = vi.fn(async () => {})
  definirClipboard(writeText)
  renderApp(<FamiliaPage />)
  await screen.findByText('Código de ingresso')
  await screen.getByRole('button', { name: 'Compartilhar' }).click()
  expect(await screen.findByText('Não foi possível compartilhar. Código copiado.')).toBeInTheDocument()
})
