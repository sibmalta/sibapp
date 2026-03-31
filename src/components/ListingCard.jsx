import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'

const CONDITION_LABELS = {
  new: 'New',
  likeNew: 'Like New',
  good: 'Good',
  fair: 'Fair',
}

const CONDITION_COLORS = {
  new: 'bg-green-50 text-green-700',
  likeNew: 'bg-blue-50 text-blue-700',
  good: 'bg-yellow-50 text-yellow-700',
  fair: 'bg-orange-50 text-orange-700',
}

export default function ListingCard({ listing, size = 'normal' }) {
  const navigate = useNavigate()
  const { likedListings, toggleLike, currentUser } = useApp()
  const liked = likedListings.includes(listing.id)

  const handleLike = (e) => {
    e.stopPropagation()
    if (!currentUser) { navigate('/auth'); return }
    toggleLike(listing.id)
  }

  if (size === 'small') {
    return (
      <div
        onClick={() => navigate(`/listing/${listing.id}`)}
        className="cursor-pointer"
      >
        <div className="relative rounded-2xl overflow-hidden bg-sib-sand aspect-square">
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
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

  return (
    <div
      onClick={() => navigate(`/listing/${listing.id}`)}
      className="cursor-pointer"
    >
      <div className="relative rounded-2xl overflow-hidden bg-sib-sand aspect-[4/5]">
        <img
          src={listing.images[0]}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        {listing.status === 'sold' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-base tracking-wider uppercase">Sold</span>
          </div>
        )}
        <button
          onClick={handleLike}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${
            liked ? 'bg-sib-primary' : 'bg-white/80'
          }`}
        >
          <Heart
            size={15}
            className={liked ? 'text-white fill-white' : 'text-sib-text'}
          />
        </button>
        {listing.boosted && (
          <div className="absolute top-2.5 left-2.5">
            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sib-primary text-white shadow-sm">
              <Zap size={9} className="fill-white" />
              Featured
            </span>
          </div>
        )}
        <div className="absolute bottom-2.5 left-2.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CONDITION_COLORS[listing.condition] || 'bg-gray-50 text-gray-600'}`}>
            {CONDITION_LABELS[listing.condition] || listing.condition}
          </span>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-xs text-sib-muted font-medium">{listing.brand}</p>
        <p className="text-sm text-sib-text font-medium line-clamp-1">{listing.title}</p>
        <p className="text-base font-bold text-sib-primary mt-0.5">€{listing.price}</p>
      </div>
    </div>
  )
}
