import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..')

describe('deploy caching and SPA fallback config', () => {
  it('does not reference stale production debug scripts from index.html', () => {
    const index = readFileSync(resolve(root, 'index.html'), 'utf8')

    expect(index).not.toContain('runtime-error-reporter.js')
    expect(index).not.toContain('vite-error-monitor.js')
    expect(index).not.toContain('component-inspector.js')
  })

  it('keeps index.html revalidated and hashed assets immutable', () => {
    const vercel = readFileSync(resolve(root, 'vercel.json'), 'utf8')
    const headers = readFileSync(resolve(root, 'public/_headers'), 'utf8')

    expect(vercel).toContain('no-cache, no-store, must-revalidate')
    expect(vercel).toContain('public, max-age=31536000, immutable')
    expect(headers).toContain('/index.html')
    expect(headers).toContain('/assets/*')
  })

  it('keeps asset requests out of the SPA fallback on static hosts', () => {
    const redirects = readFileSync(resolve(root, 'public/_redirects'), 'utf8')

    expect(redirects).toContain('/assets/*    /assets/:splat   200')
    expect(redirects).toContain('/*    /index.html   200')
  })
})
