import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const scrollPositions = {}

/**
 * Saves scroll position when leaving a route, restores it when returning.
 * Uses the route pathname as the storage key.
 */
export default function useScrollRestore(key) {
  const { pathname } = useLocation()
  const storageKey = key || pathname
  const restoredRef = useRef(false)

  // Save scroll position continuously so it's always up to date
  useEffect(() => {
    restoredRef.current = false

    const handleScroll = () => {
      scrollPositions[storageKey] = window.scrollY
    }

    // Restore saved position after a microtask (DOM needs to render first)
    const savedY = scrollPositions[storageKey]
    if (savedY != null && savedY > 0) {
      // Use requestAnimationFrame to wait for paint, then scroll
      const raf = requestAnimationFrame(() => {
        window.scrollTo(0, savedY)
        restoredRef.current = true
      })
      // Fallback: try again after images/layout may have shifted
      const timeout = setTimeout(() => {
        if (scrollPositions[storageKey] != null) {
          window.scrollTo(0, scrollPositions[storageKey])
        }
      }, 100)

      window.addEventListener('scroll', handleScroll, { passive: true })

      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(timeout)
        window.removeEventListener('scroll', handleScroll)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [storageKey])
}

/**
 * Clear scroll position for a specific key (useful when filters change).
 */
export function clearScrollPosition(key) {
  delete scrollPositions[key]
}
