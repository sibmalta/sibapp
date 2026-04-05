import React from 'react'

/**
 * Unified "Vintage Verified" icon — Tag base with a small check overlay.
 * Uses the same Tag silhouette as the Vintage quick-filter for visual consistency.
 *
 * Props:
 *   size       – overall icon size in px (default 16)
 *   className  – optional Tailwind classes for the wrapper <span>
 *   tagClass   – color class for the tag icon (default "text-amber-600")
 *   checkClass – color class for the check badge (default "text-amber-700")
 */
export default function VintageVerifiedIcon({
  size = 16,
  className = '',
  tagClass = 'text-amber-600',
  checkClass = 'text-amber-700',
}) {
  const checkSize = Math.max(8, Math.round(size * 0.55))
  const checkOffset = Math.round(size * -0.15)

  return (
    <span className={`relative inline-flex flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* Tag base — matches the Vintage quick-filter icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-full h-full ${tagClass}`}
      >
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      </svg>

      {/* Small verified check badge — bottom-right corner */}
      <span
        className={`absolute flex items-center justify-center rounded-full bg-white ring-1 ring-white ${checkClass}`}
        style={{
          width: checkSize,
          height: checkSize,
          bottom: checkOffset,
          right: checkOffset,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    </span>
  )
}
