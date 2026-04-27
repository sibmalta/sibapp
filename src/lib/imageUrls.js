export function getOptimizedListingImageUrl(url, { width = 520, quality = 72 } = {}) {
  if (typeof url !== 'string') return url
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) return trimmed

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return trimmed
  }

  if (!parsed.pathname.includes('/storage/v1/object/public/')) return trimmed

  parsed.pathname = parsed.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  parsed.searchParams.set('width', String(width))
  parsed.searchParams.set('quality', String(quality))
  parsed.searchParams.set('resize', 'cover')
  return parsed.toString()
}
