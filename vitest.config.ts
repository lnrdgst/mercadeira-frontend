import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{mjs,ts,tsx}'],
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
  },
})
