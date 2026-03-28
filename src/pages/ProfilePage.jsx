import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Settings, Star, Package, ShoppingBag, Heart, ShieldCheck, Wallet } from 'lucide-react'
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


  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <UserAvatar user={profileUser} size="xl" />
          <div className="flex gap-2">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => navigate('/seller')}
                  className="w-9 h-9 rounded-full border border-sib-primary bg-sib-primary/5 flex items-center justify-center"
                >
                  <Wallet size={17} className="text-sib-primary" />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-9 h-9 rounded-full border border-sib-stone flex items-center justify-center"
                >
                  <Settings size={17} className="text-sib-text" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (!currentUser) { navigate('/auth'); return }
                  navigate(`/messages?new=${profileUser.id}`)
                }}
                className="px-4 py-2 rounded-full border border-sib-primary text-sib-primary text-sm font-semibold"
              >
                Message
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-sib-text">{profileUser.name}</h1>

          {profileUser.verified && (
            <ShieldCheck size={16} className="text-blue-500" />
          )}
        </div>
        <p className="text-sm text-sib-muted">@{profileUser.username}</p>
        {profileUser.bio && <p className="text-sm text-sib-text mt-2">{profileUser.bio}</p>}

        {/* Rating */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                size={14}
                className={i <= Math.round(profileUser.rating || 0) ? 'text-sib-primary fill-sib-primary' : 'text-sib-stone'}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-sib-text">{(profileUser.rating || 0).toFixed(1)}</span>
          <span className="text-xs text-sib-muted">
            ({profileUser.reviewCount || 0} review{(profileUser.reviewCount || 0) !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-4">
          <div className="text-center">
            <p className="text-base font-bold text-sib-text">{activeListings.length}</p>
            <p className="text-[11px] text-sib-muted">Listings</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-sib-text">{soldListings.length}</p>
            <p className="text-[11px] text-sib-muted">Sold</p>
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
                <button onClick={() => navigate('/sell')} className="mt-3 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold">
                  List something
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activeListings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )
        )}
        {tab === 'sold' && (
          soldListings.length === 0 ? (
            <p className="text-center py-12 text-sm text-sib-muted">No sold items yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {soldListings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )
        )}
        {tab === 'liked' && isOwnProfile && (
          likedItems.length === 0 ? (
            <p className="text-center py-12 text-sm text-sib-muted">You haven't liked anything yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {likedItems.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )
        )}
      </div>


    </div>
  )
}
