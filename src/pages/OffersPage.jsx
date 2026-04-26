import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, ArrowUpRight, ArrowDownLeft, Clock, Check, X, ArrowLeftRight, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import CounterOfferModal from '../components/CounterOfferModal'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 dark:bg-[#26322f] dark:text-amber-300', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-50 text-green-700 dark:bg-[#26322f] dark:text-green-300', icon: Check },
  declined: { label: 'Declined', color: 'bg-red-50 text-red-600 dark:bg-[#26322f] dark:text-red-300', icon: X },
  countered: { label: 'Countered', color: 'bg-blue-50 text-blue-700 dark:bg-[#26322f] dark:text-[#aeb8b4]', icon: ArrowLeftRight },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-500 dark:bg-[#26322f] dark:text-[#aeb8b4]', icon: Clock },
}

export default function OffersPage() {
  const navigate = useNavigate()
  const {
    currentUser, offers, getListingById, getUserById,
    acceptOffer, declineOffer, counterOffer, showToast,
  } = useApp()

  const [tab, setTab] = useState('received')
  const [counterModal, setCounterModal] = useState(null)

  if (!currentUser) { navigate('/auth'); return null }

  const received = offers.filter(o => o.sellerId === currentUser.id && ['pending', 'countered'].includes(o.status) === false ? o.sellerId === currentUser.id : o.sellerId === currentUser.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  const sent = offers.filter(o => o.buyerId === currentUser.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  const activeReceived = received.filter(o => o.status === 'pending')
  const activeSent = sent.filter(o => o.status === 'countered')

  const handleAccept = async (offer) => {
    const result = await acceptOffer(offer.id)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Offer accepted!')
    // Redirect buyer to checkout at accepted price
    navigate(`/checkout/${offer.listingId}?offer=${offer.id}`)
  }

  const handleDecline = async (offerId) => {
    const result = await declineOffer(offerId)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Offer declined.')
  }

  const handleCounter = async (offerId, counterPrice, idempotencyKey) => {
    const result = await counterOffer(offerId, counterPrice, { idempotencyKey })
    if (result?.error) {
      showToast(result.error, 'error')
      return result
    }
    setCounterModal(null)
    showToast('Counter offer sent!')
    return result
  }

  const handleAcceptCounter = async (offer) => {
    const result = await acceptOffer(offer.id)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Counter accepted!')
    navigate(`/checkout/${offer.listingId}?offer=${offer.id}`)
  }

  const handleDeclineCounter = async (offerId) => {
    const result = await declineOffer(offerId)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Counter declined.')
  }

  const renderOffer = (offer, isSeller) => {
    const listing = getListingById(offer.listingId)
    const otherUser = getUserById(isSeller ? offer.buyerId : offer.sellerId)
    if (!listing) return null

    const config = STATUS_CONFIG[offer.status] || STATUS_CONFIG.pending
    const StatusIcon = config.icon
    const isExpired = offer.status === 'expired'
    const isPending = offer.status === 'pending'
    const isCountered = offer.status === 'countered'
    const isAccepted = offer.status === 'accepted'

    const timeLeft = offer.expiresAt ? Math.max(0, new Date(offer.expiresAt) - Date.now()) : 0
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60))
    const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

    return (
      <div key={offer.id} className="sib-card rounded-2xl border overflow-hidden transition-colors">
        {/* Item row */}
        <div
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-sib-sand/30 dark:hover:bg-[#30403c] transition-colors"
          onClick={() => navigate(`/listing/${listing.id}`)}
        >
          <img src={listing.images[0]} alt={listing.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7] truncate">{listing.title}</p>
            <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-0.5">
              {isSeller ? 'From' : 'To'} @{otherUser?.username || 'user'} · Listed at €{listing.price}
            </p>
          </div>
        </div>

        {/* Offer details */}
        <div className="px-3 pb-3 space-y-2">
          {/* Price + status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSeller ? (
                <ArrowDownLeft size={14} className="text-sib-primary" />
              ) : (
                <ArrowUpRight size={14} className="text-sib-muted dark:text-[#aeb8b4]" />
              )}
              <span className="text-lg font-bold text-sib-text dark:text-[#f4efe7]">
                €{isCountered && offer.counterPrice ? offer.counterPrice : offer.price}
              </span>
              {isCountered && offer.counterPrice && !isSeller && (
                <span className="text-xs text-sib-muted dark:text-[#aeb8b4] line-through">€{offer.price}</span>
              )}
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${config.color}`}>
              <StatusIcon size={11} />
              {config.label}
            </span>
          </div>

          {/* Time left for pending/countered */}
          {(isPending || isCountered) && timeLeft > 0 && (
            <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] flex items-center gap-1">
              <Clock size={10} />
              Expires in {hoursLeft}h {minsLeft}m
            </p>
          )}

          {/* Seller actions: pending offers */}
          {isSeller && isPending && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleAccept(offer)}
                className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-green-700 transition-colors"
              >
                Accept €{offer.price}
              </button>
              <button
                onClick={() => setCounterModal(offer)}
                className="flex-1 bg-sib-primary/10 text-sib-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-sib-primary/20 transition-colors"
              >
                Counter
              </button>
              <button
                onClick={() => handleDecline(offer.id)}
                className="w-11 h-11 flex items-center justify-center rounded-xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] hover:bg-red-50 dark:hover:bg-[#362322] hover:border-red-200 dark:hover:border-red-500/20 transition-colors flex-shrink-0"
              >
                <X size={16} className="text-sib-muted dark:text-[#aeb8b4]" />
              </button>
            </div>
          )}

          {/* Buyer actions: countered offers */}
          {!isSeller && isCountered && offer.counterPrice && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleAcceptCounter(offer)}
                className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-green-700 transition-colors"
              >
                Accept €{offer.counterPrice}
              </button>
              <button
                onClick={() => handleDeclineCounter(offer.id)}
                className="flex-1 border border-sib-stone dark:border-[rgba(242,238,231,0.10)] text-sib-muted dark:text-[#aeb8b4] font-semibold py-2.5 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-[#362322] hover:text-red-600 dark:hover:text-red-300 transition-colors"
              >
                Decline
              </button>
            </div>
          )}

          {/* Accepted: go to checkout */}
          {isAccepted && !isSeller && (
            <button
              onClick={() => navigate(`/checkout/${offer.listingId}?offer=${offer.id}`)}
              className="w-full bg-sib-secondary text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-sib-secondary/90 transition-colors"
            >
              Go to Checkout — €{offer.acceptedPrice || offer.counterPrice || offer.price}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 pb-8 lg:max-w-2xl lg:mx-auto lg:px-8 lg:py-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-sib-sand dark:bg-[#26322f] flex items-center justify-center flex-shrink-0 hover:bg-sib-stone dark:hover:bg-[#30403c] transition-colors">
          <ArrowLeft size={18} className="text-sib-text dark:text-[#f4efe7]" />
        </button>
        <h1 className="text-xl font-bold text-sib-text dark:text-[#f4efe7] lg:text-2xl">Offers</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 bg-sib-sand dark:bg-[#26322f] rounded-xl p-1 mb-5 transition-colors">
        <button
          onClick={() => setTab('received')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'received' ? 'bg-white dark:bg-[#30403c] text-sib-text dark:text-[#f4efe7] shadow-sm' : 'text-sib-muted dark:text-[#aeb8b4]'}`}
        >
          Received {activeReceived.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-sib-secondary text-white text-[10px] font-bold">{activeReceived.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'sent' ? 'bg-white dark:bg-[#30403c] text-sib-text dark:text-[#f4efe7] shadow-sm' : 'text-sib-muted dark:text-[#aeb8b4]'}`}
        >
          Sent {activeSent.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold">{activeSent.length}</span>
          )}
        </button>
      </div>

      {/* Offer lists */}
      <div className="space-y-3">
        {tab === 'received' && (
          received.length === 0 ? (
            <div className="text-center py-16">
              <Tag size={32} className="mx-auto mb-3 text-sib-stone dark:text-[#aeb8b4]" />
              <p className="text-sib-muted dark:text-[#aeb8b4] text-sm font-medium">No offers received yet</p>
              <p className="text-sib-muted dark:text-[#aeb8b4] text-xs mt-1">Offers from buyers will appear here</p>
            </div>
          ) : received.map(o => renderOffer(o, true))
        )}
        {tab === 'sent' && (
          sent.length === 0 ? (
            <div className="text-center py-16">
              <Tag size={32} className="mx-auto mb-3 text-sib-stone dark:text-[#aeb8b4]" />
              <p className="text-sib-muted dark:text-[#aeb8b4] text-sm font-medium">No offers sent yet</p>
              <p className="text-sib-muted dark:text-[#aeb8b4] text-xs mt-1">Make an offer on any listing</p>
            </div>
          ) : sent.map(o => renderOffer(o, false))
        )}
      </div>

      {/* Counter modal */}
      {counterModal && (
        <CounterOfferModal
          offer={counterModal}
          listing={getListingById(counterModal.listingId)}
          onSubmit={(counterPrice, idempotencyKey) => handleCounter(counterModal.id, counterPrice, idempotencyKey)}
          onClose={() => setCounterModal(null)}
        />
      )}
    </div>
  )
}
