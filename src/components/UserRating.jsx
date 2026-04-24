import React from 'react'
import { Star } from 'lucide-react'

/**
 * Honest rating display:
 * - 0 reviews → "No reviews yet"
 * - 1-2 reviews → "New seller" + rating
 * - 3+ reviews → full rating + count
 */
export default function UserRating({ rating, reviewCount, size = 'md', showStars = true, className = '' }) {
  const count = reviewCount || 0
  const avg = count > 0 ? rating : 0

  // No reviews at all
  if (count === 0) {
    return (
      <span className={`text-sib-muted dark:text-[#aeb8b4] ${size === 'sm' ? 'text-xs' : 'text-sm'} italic ${className}`}>
        No reviews yet
      </span>
    )
  }

  const starSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'
  const boldSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showStars && (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              size={starSize}
              className={i <= Math.round(avg) ? 'text-sib-primary fill-sib-primary' : 'text-sib-stone'}
            />
          ))}
        </div>
      )}
      {!showStars && (
        <Star size={starSize} className="text-sib-primary fill-sib-primary" />
      )}
      <span className={`${boldSize} font-extrabold text-sib-text dark:text-[#f4efe7] leading-none`}>{avg.toFixed(1)}</span>
      <span className={`${textSize} text-sib-muted dark:text-[#aeb8b4]`}>
        {count < 3 ? (
          <>· New seller</>
        ) : (
          <>({count} review{count !== 1 ? 's' : ''})</>
        )}
      </span>
    </div>
  )
}
