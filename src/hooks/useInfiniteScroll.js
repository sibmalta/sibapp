import { useState, useEffect, useCallback, useRef } from 'react'

const PAGE_SIZE = 16

/**
 * Simulates infinite scroll by progressively revealing items from the loaded array.
 * If the backing store has more pages, onNeedMore is called when the sentinel is reached.
 * Returns the visible slice and a sentinel ref to attach to a bottom element.
 */
export default function useInfiniteScroll(allItems, { canLoadMore = false, isLoadingMore = false, onNeedMore } = {}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)

  // Reset when items change (new search/filter)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [allItems])

  const loadMore = useCallback(() => {
    setVisibleCount(prev => {
      if (prev < allItems.length) return Math.min(prev + PAGE_SIZE, allItems.length)
      if (canLoadMore && !isLoadingMore) onNeedMore?.()
      return prev
    })
  }, [allItems.length, canLoadMore, isLoadingMore, onNeedMore])

  // IntersectionObserver for auto-loading
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [loadMore, visibleCount])

  const visibleItems = allItems.slice(0, visibleCount)
  const hasMore = visibleCount < allItems.length || canLoadMore

  return { visibleItems, hasMore, sentinelRef }
}
