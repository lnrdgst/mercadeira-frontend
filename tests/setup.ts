import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  // Nenhum teste acessa backend real; cada cenário precisa definir seu HTTP.
  vi.stubGlobal('fetch', vi.fn(() => {
    throw new Error('Requisição sem mock no teste.')
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
  vi.useRealTimers()
})
