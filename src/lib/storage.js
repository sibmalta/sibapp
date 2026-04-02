/**
 * storage.js — Supabase Storage helpers for listing images and avatars.
 *
 * Buckets:
 *   listing-images  — public,  image/*,  max 10 MB
 *   avatars         — public,  image/*,  max 5 MB
 *
 * Both functions return { url, error }.
 * On error, they return the original fallback (base64 / old URL) so the UI
 * is never left with a broken image.
 */

const LISTING_BUCKET = 'listing-images'
const AVATAR_BUCKET = 'avatars'

/**
 * Upload a listing image File and return its public URL.
 *
 * @param {object} supabase - authenticated Supabase client
 * @param {string} sellerId - auth user id of the seller
 * @param {File}   file     - the image file to upload
 * @param {number} index    - position in the images array (0–3)
 * @returns {Promise<{url: string|null, error: Error|null}>}
 */
export async function uploadListingImage(supabase, sellerId, file, index = 0) {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${sellerId}/${Date.now()}_${index}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(LISTING_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) return { url: null, error: uploadError }

    const { data } = supabase.storage.from(LISTING_BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  } catch (e) {
    return { url: null, error: e }
  }
}

/**
 * Upload a resized avatar blob/file and return its public URL.
 *
 * @param {object}    supabase - authenticated Supabase client
 * @param {string}    userId   - auth user id
 * @param {File|Blob} file     - the image to upload
 * @returns {Promise<{url: string|null, error: Error|null}>}
 */
export async function uploadAvatar(supabase, userId, file) {
  try {
    const ext = (file.name || 'avatar').split('.').pop() || 'jpg'
    const path = `${userId}/avatar_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true, // overwrite previous avatar for same user
      })

    if (uploadError) return { url: null, error: uploadError }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  } catch (e) {
    return { url: null, error: e }
  }
}

/**
 * Convert a base64 dataURL to a File object (for uploading legacy images).
 * Used during the transition from old base64 storage to Supabase Storage.
 */
export function dataUrlToFile(dataUrl, filename = 'image.jpg') {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new File([u8arr], filename, { type: mime })
}
