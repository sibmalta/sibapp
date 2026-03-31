import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Settings, Star, Package, ShoppingBag, Heart, ShieldCheck, Wallet, Zap, Award, Clock, Truck, MessageCircle, ChevronRight, ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import ListingCard from '../components/ListingCard'

export default function ProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { currentUser, getUserByUsername, getUserListings, likedListings, getListingById } = useApp()

  const isOwnProfile = !username || (currentUser && currentUser.username === username)
  const profileUser = isOwnProfile ? currentUser : getUserByUsername(username)

  const [tab, setTab] = useState('listings')

  if (!profileUser) {
    if (isOwnProfile && !currentUser) {
      navigate('/auth')
      return null
    }
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-4xl">👤</p>
        <p className="font-semibold text-sib-text">User not found</p>
      </div>
    )
  }

  const userListings = getUserListings(profileUser.id)
  const activeListings = userListings.filter(l => l.status === 'active')
  const soldListings = userListings.filter(l => l.status === 'sold')
  const likedItems = isOwnProfile
    ? likedListings.map(id => getListingById(id)).filter(Boolean)
    : []

  const rating = profileUser.rating || 0
  const reviewCount = profileUser.reviewCount || 0
  const memberSince = profileUser.joinedAt ? new Date(profileUser.joinedAt) : new Date('2024-06-01')
  const daysSinceJoin = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24))

  const trustBadges = []
  if (profileUser.verified) trustBadges.push({ label: 'Verified Seller', icon: ShieldCheck, color: 'text-blue-600 bg-blue-50 border-blue-100' })
  if (soldListings.length >= 5) trustBadges.push({ label: 'Top Seller', icon: Award, color: 'text-amber-700 bg-amber-50 border-amber-100' })
  if (soldListings.length >= 1) trustBadges.push({ label: 'Fast Shipper', icon: Zap, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' })
  if (reviewCount >= 3 && rating >= 4) trustBadges.push({ label: 'Buyer Trusted', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-100' })

  return (
    <div className="lg:max-w-5xl lg:mx-auto lg:px-8">
      {/* Gradient header background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sib-primary/10 via-sib-secondary/5 to-sib-warm" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        {/* Action buttons - top row */}
        <div className="relative flex items-center justify-between px-4 pt-4 lg:pt-6">
          {/* Back button for other users' profiles */}
          {!isOwnProfile ? (
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full border border-white/60 bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <ArrowLeft size={16} className="text-sib-text" />
            </button>
          ) : <div />}
          <div className="flex gap-2">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => navigate('/seller')}
                  className="w-9 h-9 rounded-full border border-white/60 bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                  <Wallet size={16} className="text-sib-primary" />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-9 h-9 rounded-full border border-white/60 bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                  <Settings size={16} className="text-sib-text" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (!currentUser) { navigate('/auth'); return }
                  navigate(`/messages?new=${profileUser.id}`)
                }}
                className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-white/60 text-sib-primary text-sm font-semibold shadow-sm hover:bg-white transition-colors"
              >
                Message
              </button>
            )}
          </div>
        </div>

        {/* Profile card */}
        <div className="relative px-4 pb-5 pt-1 lg:pb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-sib-stone/50 p-5 lg:p-6">
            {/* Avatar + Username + Badges row */}
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <UserAvatar user={profileUser} size="xl" className="ring-[3px] ring-white shadow-md" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white" title="Online" />
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-sib-text truncate">@{profileUser.username}</h1>
                  {profileUser.verified && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100">
                      <ShieldCheck size={12} className="text-blue-600" />
                      <span className="text-[10px] font-semibold text-blue-600">Verified</span>
                    </span>
                  )}
                </div>

                {/* Rating - prominent, clickable */}
                <button
                  onClick={() => navigate(`/reviews/${profileUser.username}`)}
                  className="flex items-center gap-2 mt-2 group"
                >
                  <div className="flex items-center gap-1 bg-sib-primary/5 rounded-lg px-2.5 py-1.5 group-hover:bg-sib-primary/10 transition-colors">
                    <Star size={18} className="text-sib-primary fill-sib-primary" />
                    <span className="text-lg font-extrabold text-sib-text leading-none">{rating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-sib-muted group-hover:text-sib-primary transition-colors font-medium">
                    {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                    <ChevronRight size={14} className="inline ml-0.5 -mt-px" />
                  </span>
                </button>
              </div>
            </div>

            {/* Trust badges row */}
            {trustBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {trustBadges.map(badge => (
                  <span
                    key={badge.label}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.color}`}
                  >
                    <badge.icon size={12} />
                    {badge.label}
                  </span>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="flex gap-0 mt-4 border border-sib-stone/60 rounded-xl overflow-hidden">
              <div className="flex-1 text-center py-3 bg-sib-sand/50">
                <p className="text-lg font-extrabold text-sib-text leading-none">{activeListings.length}</p>
                <p className="text-[11px] text-sib-muted mt-1 font-medium">Listings</p>
              </div>
              <div className="w-px bg-sib-stone/60" />
              <div className="flex-1 text-center py-3 bg-sib-sand/50">
                <p className="text-lg font-extrabold text-sib-text leading-none">{soldListings.length}</p>
                <p className="text-[11px] text-sib-muted mt-1 font-medium">Sold</p>
              </div>
              <div className="w-px bg-sib-stone/60" />
              <div className="flex-1 text-center py-3 bg-sib-sand/50">
                <p className="text-lg font-extrabold text-sib-text leading-none">{daysSinceJoin < 365 ? `${Math.ceil(daysSinceJoin / 30)}mo` : `${Math.floor(daysSinceJoin / 365)}y`}</p>
                <p className="text-[11px] text-sib-muted mt-1 font-medium">Member</p>
              </div>
            </div>

            {/* Bio - compact */}
            {profileUser.bio && (
              <p className="text-sm text-sib-muted mt-3 leading-relaxed line-clamp-2">{profileUser.bio}</p>
            )}

            {/* Seller activity indicators */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-sib-stone/40">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-sib-muted">
                <Clock size={11} className="text-emerald-500" />
                <span>Active today</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-sib-muted">
                <Truck size={11} className="text-sib-primary" />
                <span>Ships in 1-2 days</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-sib-muted">
                <MessageCircle size={11} className="text-blue-500" />
                <span>Replies within hours</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-b border-sib-stone">
        {[
          { id: 'listings', label: 'Listings', icon: Package },
          { id: 'sold', label: 'Sold', icon: ShoppingBag },
          ...(isOwnProfile ? [{ id: 'liked', label: 'Liked', icon: Heart }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.id ? 'border-sib-primary text-sib-primary' : 'border-transparent text-sib-muted'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-6">
        {tab === 'listings' && (
          activeListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sib-muted text-sm">No active listings.</p>
              {isOwnProfile && (
                <button onClick={() => navigate('/sell')} className="mt-3 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-sib-secondary/90">
                  List something
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {activeListings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )
        )}
        {tab === 'sold' && (
          soldListings.length === 0 ? (
            <p className="text-center py-12 text-sm text-sib-muted">No sold items yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {soldListings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )
        )}
        {tab === 'liked' && isOwnProfile && (
          likedItems.length === 0 ? (
            <p className="text-center py-12 text-sm text-sib-muted">You haven't liked anything yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {likedItems.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )
        )}
      </div>


    </div>
  )
}
