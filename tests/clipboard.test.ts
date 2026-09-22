import { afterEach, expect, test, vi } from 'vitest'
import { copiarTexto } from '../src/shared/utils/clipboard'

const clipboardOriginal = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const execCommandOriginal = document.execCommand

afterEach(() => {
  if (clipboardOriginal) Object.defineProperty(navigator, 'clipboard', clipboardOriginal)
  else delete (navigator as { clipboard?: Clipboard }).clipboard
  document.execCommand = execCommandOriginal
  document.querySelectorAll('textarea').forEach((campo) => campo.remove())
})

function definirClipboard(writeText?: (texto: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  })
}

test('copia pela Clipboard API quando disponível', async () => {
  const writeText = vi.fn(async () => {})
  definirClipboard(writeText)
  expect(await copiarTexto('CODIGO')).toBe(true)
  expect(writeText).toHaveBeenCalledWith('CODIGO')
})

test('usa fallback quando Clipboard API não está disponível', async () => {
  definirClipboard()
  document.execCommand = vi.fn(() => true)
  expect(await copiarTexto('CODIGO')).toBe(true)
  expect(document.execCommand).toHaveBeenCalledWith('copy')
  expect(document.querySelector('textarea')).toBeNull()
})

test('usa fallback quando Clipboard API falha', async () => {
  definirClipboard(async () => { throw new Error('bloqueado') })
  document.execCommand = vi.fn(() => true)
  expect(await copiarTexto('CODIGO')).toBe(true)
})

test('informa falha somente quando Clipboard API e fallback falham', async () => {
  definirClipboard(async () => { throw new Error('bloqueado') })
  document.execCommand = vi.fn(() => false)
  expect(await copiarTexto('CODIGO')).toBe(false)
})
