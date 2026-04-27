import { describe, expect, it } from 'vitest'
import { getOptimizedListingImageUrl } from '../lib/imageUrls'

describe('getOptimizedListingImageUrl', () => {
  it('requests a Supabase image rendition for listing card images', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/listings/user/photo.jpg'

    expect(getOptimizedListingImageUrl(url)).toBe(
      'https://abc.supabase.co/storage/v1/render/image/public/listings/user/photo.jpg?width=520&quality=72&resize=cover',
    )
  })

  it('leaves non-storage URLs unchanged', () => {
    const url = 'https://cdn.example.com/photo.jpg'

    expect(getOptimizedListingImageUrl(url)).toBe(url)
  })
})
