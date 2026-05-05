const CHUNK_RELOAD_KEY = 'sib:chunk-load-reload-attempted'

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk \d+ failed/i,
  /error loading JS chunk/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
  /\/assets\/.*\.js/i,
]

function textFromError(input) {
  if (!input) return ''
  if (typeof input === 'string') return input
  const target = input?.target || input?.srcElement
  return [
    input?.name,
    input?.message,
    input?.reason?.name,
    input?.reason?.message,
    input?.error?.name,
    input?.error?.message,
    target?.src,
    target?.href,
  ].filter(Boolean).join(' ')
}

export function isChunkLoadError(input) {
  const text = textFromError(input)
  return CHUNK_ERROR_PATTERNS.some(pattern => pattern.test(text))
}

export function installChunkErrorRecovery({ reload = () => window.location.reload() } = {}) {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return () => {}

  const recover = (event) => {
    if (!isChunkLoadError(event)) return
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    reload()
  }

  const onError = (event) => recover(event)
  const onUnhandledRejection = (event) => recover(event)

  window.addEventListener('error', onError, true)
  window.addEventListener('unhandledrejection', onUnhandledRejection)

  return () => {
    window.removeEventListener('error', onError, true)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }
}
