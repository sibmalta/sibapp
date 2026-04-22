import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ImageIcon, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CONDITION_LABELS, CONDITION_DOT, getCardSubtitle, getCardBadge } from '../lib/listingMeta'

function getListingImage(listing) {
  const image = Array.isArray(listing?.images) ? listing.images[0] : null
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

function ListingImage({ listing, className }) {
  const [failed, setFailed] = useState(false)
  const src = failed ? null : getListingImage(listing)

  if (!src) {
    return (
      <div className={`${className} flex items-center justify-center bg-sib-sand text-sib-muted`}>
        <ImageIcon size={22} strokeWidth={1.7} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={listing.title || ''}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export default function ListingCard({ listing, size = 'normal' }) {
  const navigate = useNavigate()
  const { likedListings, toggleLike, currentUser } = useApp()
  if (!listing?.id || listing.price === undefined || listing.price === null || Number.isNaN(Number(listing.price))) return null

  const liked = likedListings.includes(listing.id)

  const handleLike = (e) => {
    e.stopPropagation()
    if (!currentUser) { navigate('/auth'); return }
    toggleLike(listing.id)
  }

  /* ── Small card (horizontal rows, carousels) ─────────────── */
  if (size === 'small') {
    return (
      <div
        onClick={() => navigate(`/listing/${listing.id}`)}
        className="cursor-pointer"
      >
        <div className="relative rounded-xl overflow-hidden bg-sib-sand aspect-square">
          <ListingImage listing={listing} className="w-full h-full object-cover" />
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-bold text-sm tracking-wider uppercase">Sold</span>
            </div>
          )}
        </div>
        <div className="mt-1.5">
          <p className="text-xs text-sib-text font-medium line-clamp-1">{listing.title}</p>
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
      onClick={() => navigate(`/listing/${listing.id}`)}
      className="cursor-pointer group"
    >
      {/* Image container */}
      <div className="relative rounded-xl overflow-hidden bg-sib-stone/30 aspect-[3/4]">
        <ListingImage listing={listing} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" />

        {/* Sold overlay */}
        {listing.status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
            <span className="text-white font-bold text-sm tracking-widest uppercase">Sold</span>
          </div>
        )}

        {/* Heart — always on mobile, hover-reveal on desktop */}
        <button
          onClick={handleLike}
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
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-sib-text ml-auto">
              <span className={`w-1.5 h-1.5 rounded-full ${CONDITION_DOT[listing.condition] || 'bg-gray-400'}`} />
              {CONDITION_LABELS[listing.condition] || listing.condition}
            </span>
          )}
        </div>
      </div>

      {/* Info — category-aware subtitle */}
      <div className="mt-1.5 px-0.5 space-y-0">
        {subtitle && (
          <p className="text-[11px] text-sib-muted font-medium truncate leading-tight">{subtitle}</p>
        )}
        <p className="text-[13px] text-sib-text font-semibold line-clamp-1 leading-snug">{listing.title}</p>
        <p className="text-sm font-bold text-sib-text mt-0.5">€{listing.price}</p>
      </div>
    </div>
  )
}
