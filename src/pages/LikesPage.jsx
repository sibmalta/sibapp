import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'

export default function LikesPage() {
  const { listings, likedIds, currentUser } = useApp()
  const navigate = useNavigate()

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const liked = listings.filter(l => likedIds.has(l.id))

  return (
    <div className="md:max-w-4xl md:mx-auto">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 md:pt-6">
        <button onClick={() => navigate(-1)} className="md:hidden p-1">
          <ArrowLeft className="w-5 h-5 text-sib-text" />
        </button>
        <h1 className="text-lg font-bold text-sib-text">Saved Items</h1>
        <span className="text-xs text-sib-muted">({liked.length})</span>
      </div>

      <div className="px-4 mt-2">
        {liked.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-sib-stone mx-auto mb-3" />
            <p className="text-sib-muted text-sm font-medium">No saved items yet</p>
            <p className="text-sib-muted text-xs mt-1">Tap the heart on items you like</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {liked.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
