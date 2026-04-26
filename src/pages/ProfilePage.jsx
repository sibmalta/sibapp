import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Settings, Package, Heart, ShieldCheck, Wallet, Clock, Truck, MessageCircle, ChevronRight, ArrowLeft, Shield, Mail, MapPin, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import useAuthNav from '../hooks/useAuthNav'
import UserAvatar from '../components/UserAvatar'
import UserRating from '../components/UserRating'
import ListingCard from '../components/ListingCard'
import { SELLER_BADGE_DEFS, getSellerBadgeDef } from '../components/SellerTrustBadges'
import TrustedSellerBadge from '../components/TrustedSellerBadge'

function AdminProfileCard({ profileUser, isOwnProfile, navigate, currentUser }) {
  return (
    <div className="lg:max-w-5xl lg:mx-auto lg:px-8">
      {/* Admin gradient header — distinct purple/indigo tone */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/80 via-purple-50/60 to-sib-warm" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        {/* Action buttons */}
        <div className="relative flex items-center justify-between px-4 pt-4 lg:pt-6">
          {!isOwnProfile ? (
            <button
              onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full border border-white/60 dark:border-[rgba(242,238,231,0.10)] bg-white/70 dark:bg-[#26322f]/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white dark:hover:bg-[#30403c] transition-colors"
            >
              <ArrowLeft size={16} className="text-sib-text dark:text-[#f4efe7]" />
            </button>
          ) : <div />}
          <div className="flex gap-2">
            {isOwnProfile && (
              <button
                onClick={() => navigate('/settings')}
                className="w-9 h-9 rounded-full border border-white/60 dark:border-[rgba(242,238,231,0.10)] bg-white/70 dark:bg-[#26322f]/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white dark:hover:bg-[#30403c] transition-colors"
              >
                <Settings size={16} className="text-sib-text dark:text-[#f4efe7]" />
              </button>
            )}
          </div>
        </div>

        {/* Admin profile card */}
        <div className="relative px-4 pb-5 pt-1 lg:pb-6">
          <div className="bg-white dark:bg-[#202b28] rounded-2xl shadow-sm border border-indigo-100 dark:border-[rgba(242,238,231,0.10)] p-5 lg:p-6 transition-colors">
            {/* Avatar + identity */}
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                {/* Use the Sib logo instead of initials for the admin account */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center ring-[3px] ring-white shadow-md overflow-hidden">
                  <img
                    src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
                    alt="Sib"
                    className="w-12 h-12 object-contain"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-sib-text dark:text-[#f4efe7] truncate">@{profileUser.username}</h1>
                  {/* Admin badge — indigo/purple, distinct from blue "Verified Seller" */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 border border-indigo-600">
                    <Shield size={11} className="text-white" />
                    <span className="text-[10px] font-bold text-white tracking-wide">Admin</span>
                  </span>
                </div>
                <p className="text-sm text-sib-muted dark:text-[#aeb8b4] mt-1.5 leading-relaxed">
                  {profileUser.bio || 'Official Sib account — support, moderation and platform updates.'}
                </p>
              </div>
            </div>

            {/* Platform info instead of seller stats */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-[#26322f] dark:to-[#30403c] border border-indigo-100/80 dark:border-[rgba(242,238,231,0.10)] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Info size={12} className="text-white" />
                </div>
                <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Official Platform Account</p>
              </div>
              <p className="text-sm text-indigo-800/80 dark:text-[#f4efe7] leading-relaxed">
                This is the official Sib account. It is used for platform support, content moderation and community updates. It is not a buyer or seller.
              </p>
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-4 border-t border-indigo-100/60 dark:border-[rgba(242,238,231,0.10)]">
              <span className="inline-flex items-center gap-1.5 text-[12px] text-indigo-700/80 dark:text-[#aeb8b4]">
                <Mail size={12} className="text-indigo-500" />
                <a href="mailto:info@sibmalta.com" className="hover:underline">info@sibmalta.com</a>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-indigo-700/80 dark:text-[#aeb8b4]">
                <MapPin size={12} className="text-indigo-500" />
                <span>Malta</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* No tabs, no listings — just an informational footer */}
      <div className="px-4 py-8 text-center">
          <p className="text-sm text-sib-muted dark:text-[#aeb8b4]">
          Need help? <a href="mailto:info@sibmalta.com" className="text-indigo-600 font-semibold hover:underline">Contact us</a> or visit the <button onClick={() => navigate('/contact')} className="text-indigo-600 font-semibold hover:underline">Help Centre</button>.
        </p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const authNav = useAuthNav()
  const { currentUser, getUserByUsername, getUserListings, likedListings, getListingById } = useApp()

  const isOwnProfile = !username || (currentUser && currentUser.username === username)
  const profileUser = isOwnProfile ? currentUser : getUserByUsername(username)

  const [tab, setTab] = useState('listings')

  useEffect(() => {
    if (!isOwnProfile && tab === 'liked') setTab('listings')
  }, [isOwnProfile, tab])

  if (!profileUser) {
    if (isOwnProfile && !currentUser) {
      navigate('/auth')
      return null
    }
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-4xl">👤</p>
        <p className="font-semibold text-sib-text dark:text-[#f4efe7]">User not found</p>
      </div>
    )
  }

  // Admin accounts get a completely different profile layout
  if (profileUser.isAdmin) {
    return <AdminProfileCard profileUser={profileUser} isOwnProfile={isOwnProfile} navigate={navigate} currentUser={currentUser} />
  }

  const userListings = getUserListings(profileUser.id)
const activeListings = userListings.filter(l => l.status === 'active')

  const likedItems = isOwnProfile
      ? likedListings.map(id => getListingById(id)).filter(Boolean)
      : []

  const rating = profileUser.rating || 0
  const reviewCount = profileUser.reviewCount || 0
  const memberSince = profileUser.joinedAt ? new Date(profileUser.joinedAt) : new Date('2024-06-01')
  const daysSinceJoin = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24))

  const trustBadges = []
  // Admin-assigned seller badges first
  if (Array.isArray(profileUser.sellerBadges)) {
    profileUser.sellerBadges.forEach(badgeId => {
      const def = getSellerBadgeDef(badgeId)
      if (def) trustBadges.push({ label: def.label, icon: def.icon, color: `${def.color} ${def.bg} border-transparent` })
    })
  }
  // Auto-computed badges
  if (profileUser.verified) trustBadges.push({ label: 'Verified Seller', icon: ShieldCheck, color: 'text-blue-600 dark:text-[#e8751a] bg-blue-50 dark:bg-[#26322f] border-blue-100 dark:border-[rgba(242,238,231,0.10)]' })
  if (reviewCount >= 3 && rating >= 4) trustBadges.push({ label: 'Buyer Trusted', icon: Heart, color: 'text-rose-600 dark:text-[#e8751a] bg-rose-50 dark:bg-[#26322f] border-rose-100 dark:border-[rgba(242,238,231,0.10)]' })

  return (
    <div className="lg:max-w-5xl lg:mx-auto lg:px-8">
      {/* Gradient header background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sib-primary/10 via-sib-secondary/5 to-sib-warm" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        {/* Action buttons - top row */}
        <div className="relative flex items-center justify-between px-4 pt-4 lg:pt-6">
          {!isOwnProfile ? (
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full border border-white/60 dark:border-[rgba(242,238,231,0.10)] bg-white/70 dark:bg-[#26322f]/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white dark:hover:bg-[#30403c] transition-colors"
            >
              <ArrowLeft size={16} className="text-sib-text dark:text-[#f4efe7]" />
            </button>
          ) : <div />}
          <div className="flex gap-2">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => navigate('/seller')}
                  className="w-9 h-9 rounded-full border border-white/60 dark:border-[rgba(242,238,231,0.10)] bg-white/70 dark:bg-[#26322f]/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white dark:hover:bg-[#30403c] transition-colors"
                >
                  <Wallet size={16} className="text-sib-primary" />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-9 h-9 rounded-full border border-white/60 dark:border-[rgba(242,238,231,0.10)] bg-white/70 dark:bg-[#26322f]/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white dark:hover:bg-[#30403c] transition-colors"
                >
                  <Settings size={16} className="text-sib-text dark:text-[#f4efe7]" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (!currentUser) { navigate('/auth'); return }
                  navigate(`/messages?new=${profileUser.id}`)
                }}
                className="px-4 py-2 rounded-full bg-white/80 dark:bg-[#26322f]/90 backdrop-blur-sm border border-white/60 dark:border-[rgba(242,238,231,0.10)] text-sib-primary text-sm font-semibold shadow-sm hover:bg-white dark:hover:bg-[#30403c] transition-colors"
              >
                Message
              </button>
            )}
          </div>
        </div>

        {/* Profile card */}
        <div className="relative px-4 pb-5 pt-1 lg:pb-6">
          <div className="bg-white dark:bg-[#202b28] rounded-2xl shadow-sm border border-sib-stone/50 dark:border-[rgba(242,238,231,0.10)] p-5 lg:p-6 transition-colors">
            {/* Avatar + Username + Badges row */}
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <UserAvatar user={profileUser} size="xl" className="ring-[3px] ring-white dark:ring-[#202b28] shadow-md" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#202b28]" title="Online" />
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-sib-text dark:text-[#f4efe7] truncate">@{profileUser.username}</h1>
                  {profileUser.verified && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-[#26322f] border border-blue-100 dark:border-[rgba(242,238,231,0.10)]">
                      <ShieldCheck size={12} className="text-blue-600 dark:text-[#e8751a]" />
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-[#e8751a]">Verified</span>
                    </span>
                  )}
                  <TrustedSellerBadge user={profileUser} />
                </div>

                {/* Rating - prominent, clickable */}
                <button
                  onClick={() => navigate(`/reviews/${profileUser.username}`)}
                  className="flex items-center gap-2 mt-2 group"
                >
                  <div className="bg-sib-primary/5 dark:bg-[#26322f] rounded-lg px-2.5 py-1.5 group-hover:bg-sib-primary/10 dark:group-hover:bg-[#30403c] transition-colors">
                    <UserRating rating={rating} reviewCount={reviewCount} size="lg" showStars={false} />
                  </div>
                  {reviewCount > 0 && (
                    <ChevronRight size={14} className="text-sib-muted group-hover:text-sib-primary transition-colors" />
                  )}
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
            <div className="flex gap-0 mt-4 border border-sib-stone/60 dark:border-[rgba(242,238,231,0.10)] rounded-xl overflow-hidden">
              <div className="flex-1 text-center py-3 bg-sib-sand/50 dark:bg-[#26322f] transition-colors">
                <p className="text-lg font-extrabold text-sib-text dark:text-[#f4efe7] leading-none">{activeListings.length}</p>
                <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-1 font-medium">Listings</p>
              </div>
              <div className="w-px bg-sib-stone/60 dark:bg-[rgba(242,238,231,0.10)]" />
              <div className="flex-1 text-center py-3 bg-sib-sand/50 dark:bg-[#26322f] transition-colors">
                <p className="text-lg font-extrabold text-sib-text dark:text-[#f4efe7] leading-none">{reviewCount}</p>
                <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-1 font-medium">Reviews</p>
              </div>
              <div className="w-px bg-sib-stone/60 dark:bg-[rgba(242,238,231,0.10)]" />
              <div className="flex-1 text-center py-3 bg-sib-sand/50 dark:bg-[#26322f] transition-colors">
                <p className="text-lg font-extrabold text-sib-text dark:text-[#f4efe7] leading-none">{daysSinceJoin < 365 ? `${Math.ceil(daysSinceJoin / 30)}mo` : `${Math.floor(daysSinceJoin / 365)}y`}</p>
                <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-1 font-medium">Member</p>
              </div>
            </div>

            {/* Bio - compact */}
            {profileUser.bio && (
              <p className="text-sm text-sib-muted dark:text-[#aeb8b4] mt-3 leading-relaxed line-clamp-2">{profileUser.bio}</p>
            )}

            {isOwnProfile && (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="flex items-center gap-3 rounded-2xl border border-sib-stone/60 dark:border-[rgba(242,238,231,0.10)] bg-sib-sand/50 dark:bg-[#26322f] px-3 py-3 text-left hover:bg-sib-sand dark:hover:bg-[#30403c] transition-colors"
                >
                  <Package size={17} className="text-sib-primary flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-sib-text dark:text-[#f4efe7]">Orders</span>
                    <span className="block text-[11px] text-sib-muted dark:text-[#aeb8b4]">Purchases and sales</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/seller')}
                  className="flex items-center gap-3 rounded-2xl border border-sib-stone/60 dark:border-[rgba(242,238,231,0.10)] bg-sib-sand/50 dark:bg-[#26322f] px-3 py-3 text-left hover:bg-sib-sand dark:hover:bg-[#30403c] transition-colors"
                >
                  <Wallet size={17} className="text-sib-primary flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-sib-text dark:text-[#f4efe7]">Seller dashboard</span>
                    <span className="block text-[11px] text-sib-muted dark:text-[#aeb8b4]">Payouts and selling</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-3 rounded-2xl border border-sib-stone/60 dark:border-[rgba(242,238,231,0.10)] bg-sib-sand/50 dark:bg-[#26322f] px-3 py-3 text-left hover:bg-sib-sand dark:hover:bg-[#30403c] transition-colors"
                >
                  <Settings size={17} className="text-sib-primary flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-sib-text dark:text-[#f4efe7]">Settings</span>
                    <span className="block text-[11px] text-sib-muted dark:text-[#aeb8b4]">Account preferences</span>
                  </span>
                </button>
              </div>
            )}

            {/* Seller activity indicators */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-sib-stone/40 dark:border-[rgba(242,238,231,0.10)]">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-sib-muted dark:text-[#aeb8b4]">
                <Clock size={11} className="text-emerald-500" />
                <span>Active today</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-sib-muted dark:text-[#aeb8b4]">
                <Truck size={11} className="text-sib-primary" />
                <span>Collected within 1–2 days</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-sib-muted dark:text-[#aeb8b4]">
                <MessageCircle size={11} className="text-sib-primary" />
                <span>Replies within hours</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-b border-sib-stone dark:border-[rgba(242,238,231,0.10)]">
        {[
          { id: 'listings', label: 'Listings', icon: Package },
          ...(isOwnProfile ? [{ id: 'liked', label: 'Liked', icon: Heart }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.id ? 'border-sib-primary text-sib-primary dark:text-[#e8751a]' : 'border-transparent text-sib-muted dark:text-[#aeb8b4]'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-6 dark:bg-[#202b28] dark:border dark:border-[rgba(242,238,231,0.10)] dark:rounded-2xl transition-colors">
        {tab === 'listings' && (
          activeListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sib-muted dark:text-[#aeb8b4] text-sm">No active listings.</p>
              {isOwnProfile && (
                <button onClick={() => authNav('/sell')} className="mt-3 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-sib-secondary/90">
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
        {tab === 'liked' && isOwnProfile && (
          likedItems.length === 0 ? (
            <p className="text-center py-12 text-sm text-sib-muted dark:text-[#aeb8b4]">You haven't liked anything yet.</p>
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
