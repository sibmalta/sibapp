import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Calendar } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'

export default function SellerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getUser, listings } = useApp()
  const seller = getUser(id)

  if (!seller) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sib-muted">Seller not found</p>
      </div>
    )
  }

  const sellerListings = listings.filter(l => l.sellerId === seller.id)

  return (
    <div className="md:max-w-4xl md:mx-auto">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 md:pt-6">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5 text-sib-text" />
        </button>
        <h1 className="text-lg font-bold text-sib-text">Seller</h1>
      </div>

      {/* Seller card */}
      <div className="mx-4 mt-2 bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-sib-primary/10 flex items-center justify-center text-sib-primary font-bold text-xl">
            {seller.username.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-sib-text">@{seller.username}</h2>
            <p className="text-sm text-sib-muted">@{seller.username}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-sib-muted">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {seller.location}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {seller.joined}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-5 pt-4 border-t border-sib-sand">
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-sib-text">{sellerListings.length}</p>
            <p className="text-xs text-sib-muted">Listed</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-sib-text">{seller.sold}</p>
            <p className="text-xs text-sib-muted">Sold</p>
          </div>
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-bold text-sib-text">{seller.rating}</span>
            </div>
            <p className="text-xs text-sib-muted">{seller.reviewCount} reviews</p>
          </div>
        </div>
      </div>

      {/* Seller listings */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-bold text-sib-text mb-3">
          {sellerListings.length} item{sellerListings.length !== 1 ? 's' : ''} for sale
        </h3>
        {sellerListings.length === 0 ? (
          <p className="text-sm text-sib-muted text-center py-8">No items listed yet</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {sellerListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
