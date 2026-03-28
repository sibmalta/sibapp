import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, ShieldCheck, Trash2, ChevronLeft, ChevronRight, Truck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import ListingCard from '../components/ListingCard'

const CONDITION_LABELS = {
  new: 'New with tags',
  likeNew: 'Like New',
  good: 'Good condition',
  fair: 'Fair — some signs of wear',
}

export default function ListingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    getListingById, getUserById, getUserListings,
    currentUser, likedListings, toggleLike,
    getOrCreateConversation, deleteListing, showToast,
  } = useApp()

  const [imgIndex, setImgIndex] = useState(0)

  const listing = getListingById(id)
  if (!listing) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-4xl">😕</p>
      <p className="text-sib-text font-semibold">Listing not found</p>
      <button onClick={() => navigate('/browse')} className="text-sib-primary text-sm font-medium">Browse all items</button>
    </div>
  )

  const seller = getUserById(listing.sellerId)
  const liked = likedListings.includes(listing.id)
  const isOwner = currentUser?.id === listing.sellerId
  const sellerOtherListings = getUserListings(listing.sellerId)
    .filter(l => l.id !== listing.id && l.status === 'active')
    .slice(0, 4)

  const handleLike = () => {
    if (!currentUser) { navigate('/auth'); return }
    toggleLike(listing.id)
  }

  const handleMessage = () => {
    if (!currentUser) { navigate('/auth'); return }
    const conv = getOrCreateConversation(listing.sellerId, listing.id)
    navigate(`/messages/${conv.id}`)
  }

  const handleBuy = () => {
    if (!currentUser) { navigate('/auth'); return }
    navigate(`/checkout/${listing.id}`)
  }

  const handleDelete = () => {
    if (!window.confirm('Remove this listing?')) return
    deleteListing(listing.id)
    showToast('Listing removed.')
    navigate('/profile')
  }

  const nextImg = () => setImgIndex(i => (i + 1) % listing.images.length)
  const prevImg = () => setImgIndex(i => (i - 1 + listing.images.length) % listing.images.length)

  return (
    <div>
      {/* Image carousel */}
      <div className="relative bg-sib-sand aspect-[4/5] overflow-hidden">
        <img
          src={listing.images[imgIndex]}
          alt={listing.title}
          className="w-full h-full object-cover"
        />
        {listing.images.length > 1 && (
          <>
            <button onClick={prevImg} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextImg} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow">
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {listing.images.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
        {listing.status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-2xl font-bold tracking-widest uppercase">Sold</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={handleLike}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow backdrop-blur-sm ${liked ? 'bg-sib-primary' : 'bg-white/90'}`}
          >
            <Heart size={17} className={liked ? 'text-white fill-white' : 'text-sib-text'} />
          </button>
          <button className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow backdrop-blur-sm">
            <Share2 size={17} className="text-sib-text" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6">
        {/* Title & price */}
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-lg font-bold text-sib-text flex-1 pr-2">{listing.title}</h1>
          <span className="text-xl font-bold text-sib-primary flex-shrink-0">€{listing.price}</span>
        </div>
        <p className="text-sm text-sib-muted mb-3">{listing.brand} · Size {listing.size}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-sib-sand text-xs font-medium text-sib-muted capitalize">
            {listing.category}
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-50 text-xs font-medium text-blue-700">
            {CONDITION_LABELS[listing.condition] || listing.condition}
          </span>
          <span className="px-3 py-1 rounded-full bg-sib-sand text-xs font-medium text-sib-muted">
            {listing.gender}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-sib-text leading-relaxed mb-5">{listing.description}</p>

        {/* Delivery & Protection bundled */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-sib-stone bg-sib-warm mb-3">
          <Truck size={16} className="text-sib-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-sib-text">Sib Tracked Delivery</p>
            <p className="text-xs text-sib-muted">Estimated 2–3 working days via MaltaPost</p>
          </div>
        </div>

        <Link to="/buyer-protection" className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-green-50 mb-5 active:opacity-80">
          <ShieldCheck size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-green-800">Tracked delivery & buyer protection included</p>
          <ChevronRight size={14} className="text-green-600 flex-shrink-0 ml-auto" />
        </Link>

        {/* Seller */}
        <div
          onClick={() => navigate(`/profile/${seller?.username}`)}
          className="flex items-center gap-3 p-3 rounded-2xl bg-sib-sand mb-5 cursor-pointer active:opacity-80"
        >
          <UserAvatar user={seller} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-sib-text">{seller?.name}</p>
            </div>
            {seller?.sales > 0 && (
              <p className="text-xs text-sib-muted mt-0.5">{seller.sales} sold</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {isOwner ? (
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 text-red-500 font-semibold text-sm"
          >
            <Trash2 size={16} /> Remove listing
          </button>
        ) : listing.status === 'active' ? (
          <div className="flex gap-3">
            <button
              onClick={handleMessage}
              className="flex-shrink-0 w-14 h-14 rounded-2xl border border-sib-stone flex items-center justify-center"
            >
              <MessageCircle size={20} className="text-sib-text" />
            </button>
            <button
              onClick={handleBuy}
              className="flex-1 bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm"
            >
              Buy — €{listing.price}
            </button>
          </div>
        ) : (
          <div className="w-full py-3.5 rounded-2xl bg-sib-stone text-center font-bold text-sib-muted text-sm">
            This item has been sold
          </div>
        )}
      </div>

      {/* More from seller */}
      {sellerOtherListings.length > 0 && (
        <div className="px-4 pb-6">
          <h2 className="text-sm font-bold text-sib-text mb-3">More from {seller?.name?.split(' ')[0]}</h2>
          <div className="grid grid-cols-3 gap-2">
            {sellerOtherListings.map(l => (
              <ListingCard key={l.id} listing={l} size="small" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
