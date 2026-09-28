import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

describe('PWA assets', () => {
  it('defines an installable manifest with local Mercadeira icons', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8')) as {
      name: string
      short_name: string
      start_url: string
      scope: string
      display: string
      icons: Array<{ src: string; sizes: string; purpose: string }>
    }

    expect(manifest).toMatchObject({
      name: 'Mercadeira',
      short_name: 'Mercadeira',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    })
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icons/mercadeira-192.png', sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/mercadeira-512.png', sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/mercadeira-maskable-512.png', sizes: '512x512', purpose: 'maskable' }),
    ]))
    manifest.icons.forEach(({ src }) => {
      expect(existsSync(resolve(root, 'public', src.slice(1)))).toBe(true)
    })
  })

  it('never intercepts or caches API requests', () => {
    const serviceWorker = readFileSync(resolve(root, 'public/sw.js'), 'utf8')

    expect(serviceWorker).toContain("url.pathname === '/api' || url.pathname.startsWith('/api/')")
    expect(serviceWorker).not.toContain("cache.put(request, response)")
  })
})
