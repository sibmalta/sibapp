import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Heart, MessageCircle, Share2, ShieldCheck, Trash2, ChevronLeft, ChevronRight, Truck, Tag, PackagePlus, PackageCheck, Sparkles, ExternalLink } from 'lucide-react'
import DeliveryGuidance from '../components/DeliveryGuidance'
import { useApp } from '../context/AppContext'
import { getDetailSubtitle, getDetailTags } from '../lib/listingMeta'
import { resolveCategory, isDeliveryEligible } from '../data/categories'
import { FULFILMENT_PRICES } from '../lib/fulfilment'
import UserAvatar from '../components/UserAvatar'
import ListingCard from '../components/ListingCard'
import MakeOfferModal from '../components/MakeOfferModal'
import SellerTrustBadges from '../components/SellerTrustBadges'
import PageHeader from '../components/PageHeader'
import SmartBundlePrompt from '../components/SmartBundlePrompt'
import { trackView } from '../lib/browsingHistory'
import { useSupabase } from '../lib/useSupabase'
import { logActivity } from '../lib/activityTracker'
import { trackReferralClick, setActiveReferral, getActiveReferral, buildShareableLink } from '../lib/referral'

export default function ListingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const wasJustPublished = searchParams.get('published') === '1'
  const wasJustUpdated = searchParams.get('updated') === '1'

  // Referral tracking - ?ref=username
  const refParam = searchParams.get('ref')

  // Scroll to top when viewing a listing detail
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const {
    getListingById, getUserById, getUserByUsername, getUserListings,
    currentUser, likedListings, toggleLike,
    getOrCreateConversation, deleteListing, showToast,
    createOffer, getUserActiveOfferOnListing,
    addToBundle, isInBundle, bundle,
    listings, getUserSales, shipments,
  } = useApp()

  const { supabase: sbClient } = useSupabase()
  const [imgIndex, setImgIndex] = useState(0)
  const [showOfferModal, setShowOfferModal] = useState(false)

  const listing = getListingById(id)

  useEffect(() => {
    if (listing && listing.title) {
      document.title = listing.title + ' | Sib'
    } else {
      document.title = 'Sib - Malta’s Second-Hand Marketplace'
    }
  }, [listing])

  // Track this listing view for personalised recommendations (DB + local)
  useEffect(() => {
    if (!listing) return
    trackView(listing)
    if (currentUser?.id) {
      logActivity(sbClient, { userId: currentUser.id, itemId: listing.id, action: 'view' })
    }
  }, [id, listing?.id, currentUser?.id])

  // Track referral click when ?ref= is present
  useEffect(() => {
    if (!refParam || !listing) return
    // Store referral context so it survives navigation to checkout
    setActiveReferral({ listingId: listing.id, referrerUsername: refParam, clickId: null, ts: Date.now() })
    // Fire-and-forget DB insert
    trackReferralClick(sbClient, {
      listingId: listing.id,
      referrerUsername: refParam,
      visitorId: currentUser?.id || null,
    })
  }, [refParam, listing?.id])

  const seller = listing ? getUserById(listing.sellerId) : null
const liked = listing ? likedListings.includes(listing.id) : false
const isOwner = listing ? currentUser?.id === listing.sellerId : false

const sellerOtherListings = listing
  ? getUserListings(listing.sellerId)
      .filter(l => l.id !== listing.id && l.status === 'active')
      .slice(0, 4)
  : []

const sellerOrders = useMemo(() => {
  if (!listing) return []
  return getUserSales(listing.sellerId)
}, [listing?.sellerId, getUserSales])

// Similar Items - strict relevance only
const similarItems = useMemo(() => {
  if (!listing) return []

  const currentCategory = listing.category || ''
  const currentSubcategory = listing.subcategory || ''
  const currentResolved = resolveCategory(currentCategory)

  return listings
    .filter(l => {
      if (!l || l.id === listing.id) return false
      if (l.status !== 'active') return false

      const sameSubcategory =
        currentSubcategory &&
        (l.subcategory || '').toLowerCase() === currentSubcategory.toLowerCase()

      const sameExactCategory =
        currentCategory &&
        (l.category || '').toLowerCase() === currentCategory.toLowerCase()

      const sameResolvedCategory =
        currentResolved &&
        resolveCategory(l.category) === currentResolved

      return Boolean(sameSubcategory || sameExactCategory || sameResolvedCategory)
    })
    .slice(0, 8)
}, [listing, listings])

if (!listing) return (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <p className="text-4xl">😕</p>
    <p className="text-sib-text font-semibold">Listing not found</p>
    <button onClick={() => navigate('/browse')} className="text-sib-primary text-sm font-medium">Browse all items</button>
  </div>
)



  const handleLike = () => {
    if (!currentUser) { navigate('/auth'); return }
    toggleLike(listing.id)
  }

  const handleMessage = () => {
    if (!currentUser) { navigate('/auth'); return }
    const conv = getOrCreateConversation(listing.sellerId, listing.id)
    navigate(`/messages/${conv.id}`)
  }

  const handleViewOfferThread = () => {
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

  const activeOffer = currentUser ? getUserActiveOfferOnListing(currentUser.id, listing.id) : null

  const handleMakeOffer = () => {
    if (!currentUser) { navigate('/auth'); return }
    setShowOfferModal(true)
  }

  const handleSubmitOffer = async (price) => {
    const result = await createOffer(listing.id, price)
    if (result.error) {
      showToast(result.error, 'error')
    } else {
      showToast('Offer sent!')
      setShowOfferModal(false)
    }
  }

  const handleAddToBundle = () => {
    if (!currentUser) { navigate('/auth'); return }
    const result = addToBundle(listing.id)
    if (result?.error) {
      showToast(result.error, 'error')
    } else {
      showToast('Added to bundle')
    }
  }

  const handleShare = async () => {
    // Build shareable link - includes ?ref=username when user is logged in
    const listingUrl = buildShareableLink(listing.id, currentUser?.username || null)
    const shareData = { title: listing.title, text: `${listing.title} - €${listing.price} on Sib`, url: listingUrl }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        if (err.name !== 'AbortError') {
          try { await navigator.clipboard.writeText(listingUrl); showToast('Link copied!') } catch { showToast('Could not share', 'error') }
        }
      }
    } else {
      try { await navigator.clipboard.writeText(listingUrl); showToast('Link copied!') } catch { showToast('Could not copy link', 'error') }
    }
  }

  // Active referral context - either from URL param or session
  const activeRef = refParam || getActiveReferral()?.referrerUsername
  const referrerUser = activeRef ? getUserByUsername(activeRef) : null
  const referrerDisplayName = referrerUser?.username || activeRef

  const nextImg = () => setImgIndex(i => (i + 1) % listing.images.length)
  const prevImg = () => setImgIndex(i => (i - 1 + listing.images.length) % listing.images.length)
  const handleEditListing = () => navigate(`/sell/edit/${listing.id}`)
  const handleViewListing = () => navigate(`/listing/${listing.id}`, { replace: true })

  return (
    <div className="dark:bg-[#18211f] transition-colors">
      <PageHeader
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className="w-8 h-8 rounded-full flex items-center justify-center active:bg-sib-sand transition-colors"
            >
              <Heart size={18} className={liked ? 'text-sib-primary fill-sib-primary' : 'text-sib-text'} />
            </button>
            <button onClick={handleShare} className="w-8 h-8 rounded-full flex items-center justify-center active:bg-sib-sand transition-colors">
              <Share2 size={18} className="text-sib-text" />
            </button>
          </div>
        }
      />
      <div className="lg:max-w-6xl lg:mx-auto lg:px-8 lg:py-8">
      {/* Desktop: side-by-side layout */}
      <div className="lg:flex lg:gap-10">
        {/* Image carousel */}
        <div className="lg:flex-1 lg:max-w-[560px]">
          <div className="relative bg-sib-sand dark:bg-[#26322f] aspect-[4/5] overflow-hidden lg:rounded-2xl transition-colors">
            <img
              src={listing.images[imgIndex]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.images.length > 1 && (
              <>
                <button onClick={prevImg} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-[#26322f]/90 dark:text-[#f4efe7] flex items-center justify-center shadow">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={nextImg} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-[#26322f]/90 dark:text-[#f4efe7] flex items-center justify-center shadow">
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
          </div>
          {/* Desktop thumbnail strip */}
          {listing.images.length > 1 && (
            <div className="hidden lg:flex gap-2 mt-3">
              {listing.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIndex(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${i === imgIndex ? 'border-sib-primary' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details column */}
        <div className="px-4 pt-4 pb-6 lg:flex-1 lg:px-0 lg:pt-0">
          {/* Referral badge shown when arrived via shared link */}
          {activeRef && activeRef !== seller?.username && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-sib-primary/5 border border-sib-primary/15 mb-3">
              <ExternalLink size={13} className="text-sib-primary flex-shrink-0" />
              <p className="text-xs text-sib-text">
                Shared by{' '}
                <button
                  onClick={() => navigate(`/profile/${referrerDisplayName}`)}
                  className="font-semibold text-sib-primary hover:underline"
                >
                  @{referrerDisplayName}
                </button>
              </p>
            </div>
          )}
          {(wasJustPublished || wasJustUpdated) && isOwner && (
            <div className="rounded-2xl border border-sib-primary/20 bg-sib-primary/5 px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-sib-text">
                {wasJustPublished ? 'Listing published' : 'Listing updated'}
              </p>
              <p className="text-xs text-sib-muted mt-1">
                {wasJustPublished ? 'Your item is now live on Sib.' : 'Your latest changes are now live.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={handleViewListing}
                  className="px-3 py-2 rounded-xl border border-sib-stone text-xs font-semibold text-sib-text hover:bg-sib-sand transition-colors"
                >
                  View listing
                </button>
                <button
                  onClick={handleEditListing}
                  className="px-3 py-2 rounded-xl border border-sib-stone text-xs font-semibold text-sib-text hover:bg-sib-sand transition-colors"
                >
                  Edit listing
                </button>
                <button
                  onClick={handleShare}
                  className="px-3 py-2 rounded-xl bg-sib-secondary text-white text-xs font-semibold hover:bg-sib-secondary/90 transition-colors"
                >
                  Share listing
                </button>
              </div>
            </div>
          )}
          {/* Title & price */}
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-lg font-bold text-sib-text flex-1 pr-2 lg:text-2xl">{listing.title}</h1>
            <span className="text-xl font-bold text-sib-primary flex-shrink-0 lg:text-2xl">€{listing.price}</span>
          </div>
          {/* Category-aware subtitle */}
          {(() => {
            const sub = getDetailSubtitle(listing)
            return sub ? <p className="text-sm text-sib-muted mb-3">{sub}</p> : null
          })()}

          {/* Detail tags driven by category */}
          {(() => {
            const tags = getDetailTags(listing)
            if (!tags.length) return null
            const TAG_VARIANT = {
              category: 'bg-sib-sand dark:bg-[#26322f] text-sib-muted dark:text-[#aeb8b4]',
              condition: 'bg-blue-50 text-blue-700',
              default: 'bg-sib-sand dark:bg-[#26322f] text-sib-muted dark:text-[#aeb8b4] capitalize',
            }
            return (
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((t, i) => (
                  <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${TAG_VARIANT[t.variant] || TAG_VARIANT.default}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            )
          })()}

          {/* Description */}
          <div className="mb-5">
            <h2 className="text-sm font-bold text-sib-text mb-1.5">Description</h2>
            <p className="text-sm text-sib-text leading-relaxed">{listing.description}</p>
          </div>

          {/* Delivery & Protection - category-aware, with actual fee */}
          {isDeliveryEligible(resolveCategory(listing.category)) ? (
            <>
              {(() => {
                const deliveryLabel = `locker €${FULFILMENT_PRICES.locker.toFixed(2)} / delivery €${FULFILMENT_PRICES.delivery.toFixed(2)}`
                const deliveryNote = 'MaltaPost fulfilment. API integration will be added later.'
                return (
                  <>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-sib-warm dark:bg-[#202b28] mb-3 transition-colors">
                      <Truck size={16} className="text-sib-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-sib-text">
                          MaltaPost fulfilment - <span className="text-sib-primary">{deliveryLabel}</span>
                        </p>
                        <p className="text-xs text-sib-muted mt-0.5">{deliveryNote}</p>
                      </div>
                    </div>
                  </>
                )
              })()}
              <Link to="/buyer-protection" className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl bg-green-50 mb-5 active:opacity-80 hover:bg-green-100/70 transition-colors">
                <ShieldCheck size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">Buyer Protection included</p>
                  <p className="text-[11px] text-green-700 leading-snug mt-0.5">Your payment is held securely until delivery is confirmed. You have 48 hours after delivery to report any issue.</p>
                </div>
                <ChevronRight size={14} className="text-green-600 flex-shrink-0 mt-0.5 ml-auto" />
              </Link>
            </>
          ) : (
            <>
              <DeliveryGuidance variant="compact" />
              <Link to="/buyer-protection" className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl bg-green-50 mb-5 active:opacity-80 hover:bg-green-100/70 transition-colors">
                <ShieldCheck size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">Buyer Protection included</p>
                  <p className="text-[11px] text-green-700 leading-snug mt-0.5">Your payment is held securely until delivery is confirmed. You have 48 hours after delivery to report any issue.</p>
                </div>
                <ChevronRight size={14} className="text-green-600 flex-shrink-0 mt-0.5 ml-auto" />
              </Link>
            </>
          )}

          {/* Seller */}
          <div
            onClick={() => navigate(`/profile/${seller?.username}`)}
            className="flex items-center gap-3 p-3 rounded-2xl bg-sib-sand dark:bg-[#26322f] mb-5 cursor-pointer active:opacity-80 hover:bg-sib-stone/40 dark:hover:bg-[#30403c] transition-colors"
          >
            <UserAvatar user={seller} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-sib-text">@{seller?.username}</p>
              </div>
              {/* Rating & review count */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {seller?.reviewCount > 0 ? (
                  <p className="text-xs text-sib-muted">
                    <span className="text-amber-500">★</span>{' '}
                    <span className="font-semibold text-sib-text">{Number(seller.rating).toFixed(1)}</span>
                    {' · '}
                    {seller.reviewCount} {seller.reviewCount === 1 ? 'review' : 'reviews'}
                  </p>
                ) : (
                  <p className="text-xs text-sib-muted">No reviews yet</p>
                )}
                {seller?.sales > 0 && (
                  <>
                    <span className="text-xs text-sib-muted">·</span>
                    <p className="text-xs text-sib-muted">{seller.sales} sold</p>
                  </>
                )}
              </div>
              <SellerTrustBadges seller={seller} sellerOrders={sellerOrders} shipments={shipments} />
            </div>
          </div>

          {/* Active offer banner */}
          {activeOffer && activeOffer.status === 'pending' && (
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-amber-50 border border-amber-200 mb-3">
              <Tag size={14} className="text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium flex-1">Your offer of <span className="font-bold">€{activeOffer.price}</span> is pending</p>
              <button onClick={handleViewOfferThread} className="text-xs font-semibold text-amber-700 underline">View</button>
            </div>
          )}
          {activeOffer && activeOffer.status === 'countered' && (
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-blue-50 border border-blue-200 mb-3">
              <Tag size={14} className="text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800 font-medium flex-1">Counter offer: <span className="font-bold">€{activeOffer.counterPrice}</span></p>
              <button onClick={handleViewOfferThread} className="text-xs font-semibold text-blue-700 underline">Respond</button>
            </div>
          )}
          {activeOffer && activeOffer.status === 'accepted' && (
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-green-50 border border-green-200 mb-3">
              <Tag size={14} className="text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 font-medium flex-1">Offer accepted: <span className="font-bold">€{activeOffer.acceptedPrice || activeOffer.counterPrice || activeOffer.price}</span></p>
              <button onClick={() => navigate(`/checkout/${listing.id}?offer=${activeOffer.id}`)} className="text-xs font-semibold text-green-700 underline">Checkout</button>
            </div>
          )}

          {/* Actions */}
          {isOwner ? (
            <div className="space-y-2.5">
              <button
                onClick={handleEditListing}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-sib-stone text-sib-text font-semibold text-sm hover:bg-sib-sand transition-colors"
              >
                Edit listing
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} /> Remove listing
              </button>
            </div>
          ) : listing.status === 'active' ? (
            <div className="space-y-2.5">
              <div className="flex gap-3">
                <button
                  onClick={handleMessage}
                  className="flex-shrink-0 w-14 h-14 rounded-2xl border border-sib-stone flex items-center justify-center hover:bg-sib-sand transition-colors"
                >
                  <MessageCircle size={20} className="text-sib-text" />
                </button>
                <button
                  onClick={handleBuy}
                  className="flex-1 bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-sib-secondary/90 transition-colors"
                >
                  Buy - €{listing.price}
                </button>
              </div>
              {!activeOffer && (
                <button
                  onClick={handleMakeOffer}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-sib-primary/30 text-sib-primary font-semibold text-sm hover:bg-sib-primary/5 transition-colors"
                >
                  <Tag size={15} /> Make an offer
                </button>
              )}
              {isInBundle(listing.id) ? (
                <button
                  onClick={() => navigate('/bundle')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-sm"
                >
                  <PackageCheck size={15} /> In your bundle - view
                </button>
              ) : (
                <button
                  onClick={handleAddToBundle}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-sib-stone text-sib-muted font-semibold text-sm hover:bg-sib-sand transition-colors"
                >
                  <PackagePlus size={15} /> {bundle && bundle.sellerId === listing.sellerId ? 'Add to bundle' : 'Start bundle'}
                </button>
              )}
            </div>
          ) : (
            <div className="w-full py-3.5 rounded-2xl bg-sib-stone text-center font-bold text-sib-muted text-sm">
              This item has been sold
            </div>
          )}
        </div>
      </div>

      {/* Offer modal */}
      {showOfferModal && (
        <MakeOfferModal
          listing={listing}
          onSubmit={handleSubmitOffer}
          onClose={() => setShowOfferModal(false)}
        />
      )}

      <SmartBundlePrompt listing={listing} />

      {/* More from seller */}
      {sellerOtherListings.length > 0 && (
        <div className="px-4 pb-6 lg:px-0 lg:pt-8">
          <h2 className="text-sm font-bold text-sib-text mb-3 lg:text-base">More from @{seller?.username}</h2>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 lg:gap-4">
            {sellerOtherListings.map(l => (
              <ListingCard key={l.id} listing={l} size="small" />
            ))}
          </div>
        </div>
      )}

      {/* Similar Items */}
      {similarItems.length >= 2 && (
        <div className="px-4 pb-8 lg:px-0 lg:pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={15} className="text-sib-primary" />
            <h2 className="text-sm font-bold text-sib-text lg:text-base">Similar items</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {similarItems.map(l => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

