import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Heart, ImageIcon, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CONDITION_LABELS, CONDITION_DOT, getCardSubtitle, getCardBadge } from '../lib/listingMeta'
import { getOptimizedListingImageUrl } from '../lib/imageUrls'

function isValidImageUrl(image) {
  if (typeof image !== 'string') return null
  const trimmed = image.trim()
  if (!trimmed) return null
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed
  }
  return null
}

function getListingImages(listing) {
  if (!Array.isArray(listing?.images)) return []
  return listing.images.map(isValidImageUrl).filter(Boolean)
}

function getListingImage(listing) {
  return getListingImages(listing)[0] || null
}

function ListingImage({ listing, className, src }) {
  const [failed, setFailed] = useState(false)
  const rawImageSrc = src || getListingImage(listing)
  const imageSrc = failed ? null : getOptimizedListingImageUrl(rawImageSrc)

  if (!imageSrc) {
    return (
      <div className={`${className} flex items-center justify-center bg-sib-sand dark:bg-[#26322f] text-sib-muted dark:text-[#aeb8b4]`}>
        <ImageIcon size={22} strokeWidth={1.7} />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={listing.title || ''}
      className={className}
      loading="lazy"
      decoding="async"
      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
      draggable={false}
      onError={() => setFailed(true)}
      onDragStart={(e) => e.preventDefault()}
    />
  )
}

function SwipeableListingImage({ listing, className, imageClassName, children, onSwipe }) {
  const images = getListingImages(listing)
  const hasMultipleImages = images.length > 1
  const [imageIndex, setImageIndex] = useState(0)
  const touchStartRef = useRef(null)
  const swipedRef = useRef(false)

  const handleTouchStart = (e) => {
    if (!hasMultipleImages) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    swipedRef.current = false
  }

  const handleTouchMove = (e) => {
    if (!hasMultipleImages || !touchStartRef.current) return
    if (swipedRef.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y

    if (Math.abs(dx) < 24 || Math.abs(dx) <= Math.abs(dy) * 1.15) return

    swipedRef.current = true
    onSwipe?.()
    setImageIndex(prev => {
      if (dx < 0) return Math.min(prev + 1, images.length - 1)
      return Math.max(prev - 1, 0)
    })
  }

  const handleTouchEnd = (e) => {
    if (!hasMultipleImages || !touchStartRef.current) return
    if (swipedRef.current) {
      touchStartRef.current = null
      swipedRef.current = false
      return
    }
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    touchStartRef.current = null

    if (Math.abs(dx) < 28 || Math.abs(dx) <= Math.abs(dy) * 1.15) return

    e.stopPropagation()
    onSwipe?.()
    setImageIndex(prev => {
      if (dx < 0) return Math.min(prev + 1, images.length - 1)
      return Math.max(prev - 1, 0)
    })
  }

  const handleTouchCancel = () => {
    touchStartRef.current = null
    swipedRef.current = false
  }

  const showPreviousImage = (e) => {
    e.stopPropagation()
    setImageIndex(prev => Math.max(prev - 1, 0))
  }

  const showNextImage = (e) => {
    e.stopPropagation()
    setImageIndex(prev => Math.min(prev + 1, images.length - 1))
  }

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={hasMultipleImages ? { touchAction: 'pan-y' } : undefined}
    >
      <ListingImage listing={listing} src={images[imageIndex]} className={imageClassName} />
      {children}
      {hasMultipleImages && (
        <>
          <button
            type="button"
            onClick={showPreviousImage}
            disabled={imageIndex === 0}
            aria-label="Previous photo"
            className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/35 text-white items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={showNextImage}
            disabled={imageIndex === images.length - 1}
            aria-label="Next photo"
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/35 text-white items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}
      {hasMultipleImages && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === imageIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ListingCard({ listing, size = 'normal' }) {
  const navigate = useNavigate()
  const { likedListings, toggleLike, currentUser } = useApp()
  const suppressClickRef = useRef(false)
  if (!listing?.id || listing.price === undefined || listing.price === null || Number.isNaN(Number(listing.price))) return null

  const liked = likedListings.includes(listing.id)

  const handleCardClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    navigate(`/listing/${listing.id}`)
  }

  const handleImageSwipe = () => {
    suppressClickRef.current = true
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 220)
  }

  const handleLike = (e) => {
    e.stopPropagation()
    if (!currentUser) { navigate('/auth'); return }
    toggleLike(listing.id)
  }

  /* ── Small card (horizontal rows, carousels) ─────────────── */
  if (size === 'small') {
    return (
      <div
        onClick={handleCardClick}
        className="cursor-pointer group"
      >
        <SwipeableListingImage
          listing={listing}
          className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100"
          imageClassName="h-full w-full object-cover object-center"
          onSwipe={handleImageSwipe}
        >
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-bold text-sm tracking-wider uppercase">Sold</span>
            </div>
          )}
        </SwipeableListingImage>
        <div className="mt-1.5">
          <p className="text-xs text-sib-text dark:text-[#f4efe7] font-medium line-clamp-1">{listing.title}</p>
          <p className="text-sm font-bold text-sib-primary">€{listing.price}</p>
        </div>
      </div>
    )
  }

  /* ── Normal card (grid) — category-aware metadata ────────── */
  const subtitle = getCardSubtitle(listing)
  const badge = getCardBadge(listing)

  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer group"
    >
      {/* Image container */}
      <SwipeableListingImage
        listing={listing}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100"
        imageClassName="h-full w-full object-cover object-center"
        onSwipe={handleImageSwipe}
      >

        {/* Sold overlay */}
        {listing.status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
            <span className="text-white font-bold text-sm tracking-widest uppercase">Sold</span>
          </div>
        )}

        {/* Heart — always on mobile, hover-reveal on desktop */}
        <button
          onClick={handleLike}
          onTouchStart={(e) => e.stopPropagation()}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            liked
              ? 'bg-sib-secondary scale-100 opacity-100'
              : 'bg-black/20 backdrop-blur-sm lg:opacity-0 lg:scale-90 lg:group-hover:opacity-100 lg:group-hover:scale-100'
          }`}
        >
          <Heart
            size={14}
            className={liked ? 'text-white fill-white' : 'text-white'}
            strokeWidth={liked ? 0 : 2}
          />
        </button>

        {/* Boosted badge */}
        {listing.boosted && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sib-primary text-white shadow-sm">
              <Zap size={8} className="fill-white" />
              Boost
            </span>
          </div>
        )}

        {/* Bottom overlay — category-aware badge + condition */}
        <div className="absolute bottom-0 inset-x-0 p-2 flex items-end justify-between">
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-white">
              {badge}
            </span>
          )}
          {listing.condition && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-[#26322f]/90 backdrop-blur-sm text-sib-text dark:text-[#f4efe7] ml-auto">
              <span className={`w-1.5 h-1.5 rounded-full ${CONDITION_DOT[listing.condition] || 'bg-gray-400'}`} />
              {CONDITION_LABELS[listing.condition] || listing.condition}
            </span>
          )}
        </div>
      </SwipeableListingImage>

      {/* Info — category-aware subtitle */}
      <div className="mt-1.5 px-0.5 space-y-0">
        {subtitle && (
          <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] font-medium truncate leading-tight">{subtitle}</p>
        )}
        <p className="text-[13px] text-sib-text dark:text-[#f4efe7] font-semibold line-clamp-1 leading-snug">{listing.title}</p>
        <p className="text-sm font-bold text-sib-text dark:text-[#f4efe7] mt-0.5">€{listing.price}</p>
      </div>
    </div>
  )
}
