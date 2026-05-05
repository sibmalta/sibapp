import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChunkErrorRecovery, isChunkLoadError } from '../lib/chunkErrorRecovery'

describe('chunk error recovery', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('recognizes stale dynamic import and hashed asset load failures', () => {
    expect(isChunkLoadError({ message: 'Failed to fetch dynamically imported module' })).toBe(true)
    expect(isChunkLoadError({ name: 'ChunkLoadError' })).toBe(true)
    expect(isChunkLoadError({ target: { src: 'https://sib.app/assets/index-deadbeef.js' } })).toBe(true)
    expect(isChunkLoadError({ message: 'Regular render error' })).toBe(false)
  })

  it('reloads only once per session for chunk failures', () => {
    const reload = vi.fn()
    const uninstall = installChunkErrorRecovery({ reload })

    window.dispatchEvent(new ErrorEvent('error', {
      message: 'Failed to fetch dynamically imported module',
    }))
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'Failed to fetch dynamically imported module',
    }))

    expect(reload).toHaveBeenCalledTimes(1)
    uninstall()
  })
})
