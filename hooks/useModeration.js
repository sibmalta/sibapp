import { useCallback } from 'react'
import { moderateContent, moderateUsername, moderateAll } from '../lib/moderation'

/**
 * useModeration — convenience hook wrapping the moderation library.
 *
 * Usage:
 *   const { checkContent, checkUsername, checkAll } = useModeration()
 *
 *   const result = checkContent(text, 'title')
 *   // → { blocked, flagged, reason, matchedTerm }
 *
 *   const { blocked, reason } = checkUsername('@cool_name')
 *
 *   const all = checkAll({ title: '...', description: '...' })
 *   // → { blocked, flagged, results, firstBlockedField, blockReason }
 */
export default function useModeration() {
  const checkContent = useCallback((text, context = 'general') => {
    return moderateContent(text, context)
  }, [])

  const checkUsername = useCallback((username) => {
    return moderateUsername(username)
  }, [])

  const checkAll = useCallback((fields, context = 'general') => {
    return moderateAll(fields, context)
  }, [])

  return { checkContent, checkUsername, checkAll }
}
