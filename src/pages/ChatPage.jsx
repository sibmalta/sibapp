import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Send, ShieldCheck, AlertTriangle, Lock, Ban, Tag, Check, X, ArrowLeftRight, ShoppingBag } from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import OfficialBadge from '../components/OfficialBadge'
import TrustedSellerBadge from '../components/TrustedSellerBadge'
import CounterOfferModal from '../components/CounterOfferModal'
import { analyseMessage, recordViolation, getRestriction, getViolationCount } from '../utils/circumventionDetector'
import { moderateContent } from '../lib/moderation'

function isSystemMessage(msg) {
  return msg?.type === 'system' || msg?.type === 'system_event' || msg?.type === 'order_event'
}

function formatMessageTime(ts) {
  return new Date(ts).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit' })
}

// ─── Blocked message bubble (no reveal, no blurred content — hard block) ────
function BlockedMessage({ msg, isMe, other }) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isMe && <UserAvatar user={other} size="xs" className="flex-shrink-0 self-end" />}
      <div className="max-w-[80%] flex flex-col gap-1">
        <div className={`px-4 py-3 rounded-2xl text-sm ${
          isMe ? 'bg-red-100 dark:bg-[#362322] rounded-br-sm' : 'bg-red-50 dark:bg-[#362322] rounded-bl-sm'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Ban size={13} className="text-red-500 flex-shrink-0" />
            <span className="text-xs font-bold text-red-700 dark:text-red-300">Message blocked</span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-300 leading-snug">
            Addresses, contact details, and off-platform deals are not allowed on Sib
          </p>
          <p className={`text-[10px] mt-2 text-red-400 dark:text-red-300/70`}>
            {formatMessageTime(msg.timestamp)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Sender block modal (no "send anyway" — all flagged messages are blocked) ─
function SendBlockedModal({ reasons, violationCount, onDismiss }) {
  const isRepeatOffender = violationCount >= 3
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6">
      <div className="bg-white dark:bg-[#202b28] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up border border-transparent dark:border-[rgba(242,238,231,0.10)] transition-colors">
        <div className="px-5 pt-5 pb-4 bg-red-50 dark:bg-[#362322] transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 dark:bg-red-500/15">
              <Ban size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">Message not sent</p>
              <p className="text-xs mt-0.5 leading-snug text-red-700 dark:text-red-300">
                For your safety and to keep Buyer Protection active, sharing addresses, contact details, or arranging off-platform deals isn't allowed in chat.
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-b border-sib-stone dark:border-[rgba(242,238,231,0.10)]">
          <p className="text-xs font-semibold text-sib-muted uppercase tracking-wide mb-2">Detected</p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-red-400" />
                <span className="text-xs text-sib-text dark:text-[#f4efe7]">{r}</span>
              </li>
            ))}
          </ul>
        </div>
        {isRepeatOffender && (
          <div className="px-5 py-3 flex items-center gap-2 bg-red-50 dark:bg-[#362322] border-b border-red-100 dark:border-[rgba(242,238,231,0.10)] transition-colors">
            <Ban size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">Repeated attempts will lead to a temporary messaging restriction</p>
          </div>
        )}
        <div className="px-5 py-3 flex items-center gap-2 bg-green-50 dark:bg-[#26322f] transition-colors">
          <Lock size={13} className="text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-800 dark:text-green-300 font-medium">Keep everything on Sib — your transactions are protected</p>
        </div>
        <div className="px-5 py-4">
          <button onClick={onDismiss} className="w-full py-3 rounded-2xl bg-sib-primary text-white text-sm font-bold">
            Edit message
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Restriction banner ─────────────────────────────────────────────────────
function RestrictionBanner({ restriction }) {
  const mins = Math.ceil(restriction.remainingMs / 60000)
  return (
    <div className="px-4 py-3 bg-red-50 dark:bg-[#362322] border-b border-red-100 dark:border-[rgba(242,238,231,0.10)] flex items-start gap-3 transition-colors">
      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Ban size={14} className="text-red-600" />
      </div>
      <div>
        <p className="text-xs font-bold text-red-800 dark:text-red-200">Messaging temporarily restricted</p>
        <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5 leading-snug">
          Multiple policy violations detected. You can send messages again in <span className="font-bold">{mins} min</span>.
        </p>
        <p className="text-[10px] text-red-600 dark:text-red-300/80 mt-1">Your account has been flagged for review.</p>
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const {
    currentUser, getConversation, getUserById, getListingById, sendMessage, markConversationRead,
    getOfferById, acceptOffer, declineOffer, counterOffer, recoverOfferConversationFromLink, ensureUserById, showToast,
  } = useApp()
  const [text, setText] = useState('')
  const [warning, setWarning] = useState(null)
  const [counterModal, setCounterModal] = useState(null)
  const [restriction, setRestriction] = useState(getRestriction())
  const bottomRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const restrictionTimerRef = useRef(null)

  const conv = currentUser ? getConversation(id) : null

  useEffect(() => {
    if (!currentUser) {
      const redirect = `${location.pathname}${location.search}`
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`, {
        replace: true,
        state: { from: redirect },
      })
    }
  }, [currentUser, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!currentUser || conv || !id) return

    recoverOfferConversationFromLink?.({
      conversationId: id,
      offerId: searchParams.get('offer') || searchParams.get('offerId'),
      listingId: searchParams.get('listing') || searchParams.get('listingId'),
      buyerId: searchParams.get('buyer') || searchParams.get('buyerId'),
      sellerId: searchParams.get('seller') || searchParams.get('sellerId'),
      price: searchParams.get('price'),
      buyerName: searchParams.get('buyerName'),
      itemTitle: searchParams.get('itemTitle'),
    })
  }, [currentUser, conv, id, searchParams, recoverOfferConversationFromLink])

  const otherId = conv?.participants?.find(p => p !== currentUser?.id)
  const other = otherId ? getUserById(otherId) : null
  const listing = conv?.listingId ? getListingById(conv.listingId) : null

  const offerMessageMeta = useMemo(() => {
    const latestByThread = new Map()
    const messages = conv?.messages || []

    messages.forEach((msg, index) => {
      if (msg.type !== 'offer') return
      const key = msg.offerId || `${msg.listingId || conv?.listingId || 'listing'}:${msg.buyerId || 'buyer'}:${msg.sellerId || 'seller'}`
      const ts = new Date(msg.timestamp || msg.createdAt || 0).getTime()
      const existing = latestByThread.get(key)
      if (!existing || ts > existing.ts || (ts === existing.ts && index > existing.index)) {
        latestByThread.set(key, { id: msg.id, ts, index })
      }
    })

    const meta = new Map()
    messages.forEach((msg) => {
      if (msg.type !== 'offer') return
      const key = msg.offerId || `${msg.listingId || conv?.listingId || 'listing'}:${msg.buyerId || 'buyer'}:${msg.sellerId || 'seller'}`
      meta.set(msg.id, { isLatest: latestByThread.get(key)?.id === msg.id })
    })
    return meta
  }, [conv?.listingId, conv?.messages])

  useEffect(() => {
    if (otherId && (!other?.username || !other?.email)) {
      ensureUserById?.(otherId)
    }
  }, [ensureUserById, other?.email, other?.username, otherId])

  // Refresh restriction timer
  useEffect(() => {
    if (restriction) {
      restrictionTimerRef.current = setInterval(() => {
        const r = getRestriction()
        setRestriction(r)
        if (!r && restrictionTimerRef.current) clearInterval(restrictionTimerRef.current)
      }, 15000)
      return () => clearInterval(restrictionTimerRef.current)
    }
  }, [restriction])

  // Mark conversation as read when opened and when new messages arrive
  useEffect(() => {
    if (conv?.id) markConversationRead(conv.id)
  }, [conv?.id, conv?.messages?.length, markConversationRead])

  // Scroll the messages container (not the page) to the bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = messagesContainerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])

  useEffect(() => {
    scrollToBottom('smooth')
  }, [conv?.messages?.length, scrollToBottom])

  const analysis = text.trim() ? analyseMessage(text) : null
  const isRestricted = !!restriction

  const attemptSend = useCallback(async () => {
    const msg = text.trim()
    if (!msg || isRestricted || !conv?.id || !currentUser?.id) return
    // Check for contact-sharing circumvention
    const result = analyseMessage(msg)
    if (result.flagged) {
      recordViolation()
      setRestriction(getRestriction())
      setWarning(result)
      return
    }
    // Check for profanity / inappropriate language
    const modCheck = moderateContent(msg, 'message')
    if (modCheck.blocked) {
      setWarning({ flagged: true, reasons: ['Message contains inappropriate language'] })
      return
    }
    try {
      const result = await sendMessage(conv.id, currentUser.id, msg, false)
      if (result?.error) {
        setWarning({
          flagged: true,
          reasons: [result.error.message || 'Message could not be sent. Please try again.'],
        })
        return
      }
    } catch (err) {
      setWarning(err.analysis || {
        flagged: true,
        reasons: [err.message || 'This message is not allowed in chat'],
      })
      return
    }
    setText('')
    // Re-focus input without letting the browser scroll the page
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
    })
  }, [text, isRestricted, conv?.id, currentUser?.id, sendMessage])

  const dismissWarning = () => {
    setWarning(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      attemptSend()
    }
  }

  const handleAcceptOffer = async (offer) => {
    const result = await acceptOffer(offer.id)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Offer accepted.')
    if (offer.buyerId === currentUser.id) {
      navigate(`/checkout/${offer.listingId}?offer=${offer.id}`)
    }
  }

  const handleDeclineOffer = async (offerId) => {
    const result = await declineOffer(offerId)
    if (result?.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Offer declined.')
  }

  const handleCounterOffer = async (offerId, counterPrice, idempotencyKey) => {
    const result = await counterOffer(offerId, counterPrice, { idempotencyKey })
    if (result?.error) {
      showToast(result.error, 'error')
      return result
    }
    setCounterModal(null)
    showToast('Counter offer sent.')
    return result
  }

  const getOfferAmount = (msg, offer, status) => {
    if (msg.eventType === 'offer_received') return msg.offerPrice || offer?.price
    if (msg.eventType === 'offer_countered') return msg.offerPrice || msg.counterPrice || offer?.counterPrice
    if (msg.eventType === 'offer_accepted') return msg.offerPrice || msg.acceptedPrice || offer?.acceptedPrice || offer?.counterPrice || offer?.price
    if (msg.eventType === 'offer_declined') return msg.offerPrice || msg.counterPrice || offer?.counterPrice || offer?.price
    if (status === 'countered') return offer?.counterPrice || msg.offerPrice
    if (status === 'accepted') return offer?.acceptedPrice || offer?.counterPrice || msg.offerPrice || offer?.price
    return msg.offerPrice || offer?.price
  }

  const getCompactOfferText = (msg, offer, status) => {
    const amount = Number(getOfferAmount(msg, offer, status) || 0)
    const price = amount > 0 ? `: €${amount.toFixed(2)}` : ''
    const buyerDeclinedCounter = msg.eventType === 'offer_declined' && offer?.status === 'declined' && offer?.counterPrice

    switch (msg.eventType) {
      case 'offer_received':
        return msg.senderId === currentUser.id ? `Offer sent${price}` : `Offer received${price}`
      case 'offer_countered':
        return `Counter offer sent${price}`
      case 'offer_accepted':
        return offer?.counterPrice ? `Counter offer accepted${price}` : `Offer accepted${price}`
      case 'offer_declined':
        return buyerDeclinedCounter ? 'Counter offer declined' : 'Offer declined'
      default:
        if (status === 'declined') return 'Offer declined'
        if (status === 'accepted') return `Offer accepted${price}`
        if (status === 'countered') return `Counter offer sent${price}`
        return `Offer update${price}`
    }
  }

  const renderCompactOfferEvent = (msg, offer, status) => (
    <div key={msg.id} className="flex justify-center">
      <div className="max-w-[85%] rounded-2xl bg-sib-sand dark:bg-[#26322f] px-3 py-2 text-center transition-colors">
        <p className="text-xs font-semibold text-sib-text dark:text-[#f4efe7]">
          {getCompactOfferText(msg, offer, status)}
        </p>
        {msg.itemTitle && (
          <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-0.5 line-clamp-1">
            {msg.itemTitle}
          </p>
        )}
      </div>
    </div>
  )

  const renderOfferMessage = (msg) => {
    const savedOffer = getOfferById?.(msg.offerId)
    const offerListing = getListingById(msg.listingId || savedOffer?.listingId)
    const buyerId = savedOffer?.buyerId || msg.buyerId || msg.metadata?.buyerId || msg.senderId || conv?.participants?.find(p => p !== offerListing?.sellerId)
    const sellerId = savedOffer?.sellerId || msg.sellerId || msg.metadata?.sellerId || offerListing?.sellerId || conv?.participants?.find(p => p !== buyerId)
    const offer = savedOffer || {
      id: msg.offerId,
      listingId: msg.listingId,
      buyerId,
      sellerId,
      price: msg.offerPrice,
      counterPrice: msg.counterPrice || null,
      acceptedPrice: msg.acceptedPrice || null,
      status: msg.status || 'pending',
    }
    const status = offer?.status || msg.status || 'pending'
    const displayPrice = offer?.counterPrice || offer?.acceptedPrice || msg.offerPrice || offer?.price
    const originalPrice = msg.originalPrice || offerListing?.price
    const isSeller = sellerId === currentUser.id
    const isBuyer = buyerId === currentUser.id
    const canSellerRespond = isSeller && status === 'pending'
    const canBuyerRespond = isBuyer && status === 'countered'
    const canCheckout = isBuyer && status === 'accepted'
    const isLatestOfferEvent = offerMessageMeta.get(msg.id)?.isLatest
    const shouldRenderFullCard = isLatestOfferEvent && (canSellerRespond || canBuyerRespond || canCheckout)

    if (!shouldRenderFullCard) {
      if (!isLatestOfferEvent) return null
      return renderCompactOfferEvent(msg, offer, status)
    }

    const statusStyles = {
      pending: 'bg-amber-50 text-amber-700 dark:bg-[#332d20] dark:text-amber-300',
      accepted: 'bg-green-50 text-green-700 dark:bg-[#20322b] dark:text-green-300',
      declined: 'bg-red-50 text-red-600 dark:bg-[#362322] dark:text-red-300',
      countered: 'bg-blue-50 text-blue-700 dark:bg-[#26322f] dark:text-blue-300',
      expired: 'bg-gray-100 text-gray-500 dark:bg-[#26322f] dark:text-[#aeb8b4]',
    }

    return (
      <div key={msg.id} className="flex justify-center">
        <div className="w-full max-w-[340px] rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] p-3 shadow-sm transition-colors">
          <div className="flex items-start gap-3">
            {msg.itemImage || offerListing?.images?.[0] ? (
              <img src={msg.itemImage || offerListing.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover bg-sib-sand dark:bg-[#26322f]" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-sib-sand dark:bg-[#26322f] flex items-center justify-center">
                <Tag size={18} className="text-sib-muted dark:text-[#aeb8b4]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-sib-primary uppercase tracking-wide">Offer</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusStyles[status] || statusStyles.pending}`}>
                  {status}
                </span>
              </div>
              <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7] line-clamp-1 mt-1">
                {msg.itemTitle || offerListing?.title || 'Item'}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-sib-text dark:text-[#f4efe7]">€{Number(displayPrice || 0).toFixed(2)}</span>
                {originalPrice && (
                  <span className="text-xs text-sib-muted dark:text-[#aeb8b4]">listed €{Number(originalPrice).toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-2 leading-relaxed">
            {msg.text}
          </p>

          {(canSellerRespond || canBuyerRespond || canCheckout) && (
            <div className="mt-3 flex gap-2">
              {(canSellerRespond || canBuyerRespond) && (
                <button
                  onClick={() => handleAcceptOffer(offer)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white"
                >
                  <Check size={13} /> {canSellerRespond ? 'Accept offer' : 'Accept'}
                </button>
              )}
              {canSellerRespond && (
                <button
                  onClick={() => setCounterModal(offer)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sib-primary/10 px-3 py-2 text-xs font-bold text-sib-primary"
                >
                  <ArrowLeftRight size={13} /> Counter
                </button>
              )}
              {(canSellerRespond || canBuyerRespond) && (
                <button
                  onClick={() => handleDeclineOffer(offer.id)}
                  className="inline-flex items-center justify-center rounded-xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] px-3 py-2 text-xs font-bold text-sib-muted dark:text-[#aeb8b4]"
                >
                  <X size={13} />
                </button>
              )}
              {canCheckout && (
                <button
                  onClick={() => navigate(`/checkout/${offer.listingId}?offer=${offer.id}`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sib-secondary px-3 py-2 text-xs font-bold text-white"
                >
                  <ShoppingBag size={13} /> Checkout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSystemEvent = (msg) => {
    const lines = Array.isArray(msg.lines) && msg.lines.length
      ? msg.lines
      : msg.text && msg.title && msg.text !== msg.title
        ? msg.text.split(/\n+/).filter(Boolean)
        : []

    return (
      <div key={msg.id} className="flex justify-center">
        <div className="w-full max-w-[360px] rounded-2xl border border-gray-200 dark:border-[rgba(242,238,231,0.10)] bg-gray-50 dark:bg-[#26322f] px-4 py-3 text-center shadow-sm transition-colors">
          <p className="text-[13px] font-bold text-sib-text dark:text-[#f4efe7]">{msg.title || msg.text}</p>
          {lines.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {lines.map((line, index) => (
                <p key={`${msg.id}_line_${index}`} className="text-[12px] leading-snug text-sib-muted dark:text-[#aeb8b4]">
                  {line}
                </p>
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] font-medium text-gray-400 dark:text-[#aeb8b4]">
            {formatMessageTime(msg.timestamp)}
          </p>
        </div>
      </div>
    )
  }

  if (!currentUser) return null
  if (!conv) return <div className="text-center py-20 text-sib-muted dark:text-[#aeb8b4]">Conversation not found.</div>

  return (
    <>
      {warning && !isRestricted && (
        <SendBlockedModal
          reasons={warning.reasons}
          violationCount={getViolationCount()}
          onDismiss={dismissWarning}
        />
      )}

      <div className="flex flex-col h-[calc(100vh-8.5rem)] overflow-hidden">
        {/* Listing preview */}
        {listing && (
          <div
            onClick={() => navigate(`/listing/${listing.id}`)}
            className="flex items-center gap-3 px-4 py-3 border-b border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-sib-warm dark:bg-[#202b28] cursor-pointer transition-colors"
          >
            <img src={listing.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover bg-sib-sand dark:bg-[#26322f]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sib-muted dark:text-[#aeb8b4]">Enquiring about</p>
              <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7] line-clamp-1">{listing.title}</p>
            </div>
            <span className="text-sm font-bold text-sib-primary">€{listing.price}</span>
          </div>
        )}

        {/* Restriction banner */}
        {isRestricted ? (
          <RestrictionBanner restriction={restriction} />
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-[#26322f] border-b border-amber-100 dark:border-[rgba(242,238,231,0.10)] transition-colors">
            <ShieldCheck size={13} className="text-amber-600 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">Payments made outside Sib are not protected</p>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {conv.messages.length === 0 && (
            <div className="text-center py-8">
              <UserAvatar user={other} size="lg" className="mx-auto mb-3" />
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">@{other?.username}</p>
                <OfficialBadge user={other} size="sm" />
                <TrustedSellerBadge user={other} />
              </div>
              <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-1">Say hi to start the conversation!</p>
            </div>
          )}
          {conv.messages.map(msg => {
            const isMe = msg.senderId === currentUser.id
            if (msg.type === 'offer') return renderOfferMessage(msg)
            if (isSystemMessage(msg)) return renderSystemEvent(msg)
            if (msg.flagged) {
              return <BlockedMessage key={msg.id} msg={msg} isMe={isMe} other={other} />
            }
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isMe && <UserAvatar user={other} size="xs" className="flex-shrink-0 self-end" />}
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe ? 'bg-sib-primary text-white rounded-br-sm' : 'bg-sib-sand dark:bg-[#26322f] text-sib-text dark:text-[#f4efe7] rounded-bl-sm'
                }`}>
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-sib-muted dark:text-[#aeb8b4]'}`}>
                    {formatMessageTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Live warning strip — shows while typing flagged content */}
        {analysis?.flagged && !isRestricted && (
          <div className="px-4 py-2 border-t flex items-start gap-2 bg-red-50 dark:bg-[#362322] border-red-100 dark:border-[rgba(242,238,231,0.10)] transition-colors">
            <Ban size={13} className="flex-shrink-0 mt-0.5 text-red-500" />
            <p className="text-[11px] font-medium leading-snug text-red-700 dark:text-red-300">
              For your safety and to keep Buyer Protection active, sharing addresses, contact details, or arranging off-platform deals isn't allowed in chat.
            </p>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] px-4 py-3 flex items-end gap-3 transition-colors">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => !isRestricted && setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRestricted ? 'Messaging restricted...' : 'Type a message...'}
            rows={1}
            disabled={isRestricted}
            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] outline-none resize-none max-h-24 transition-colors ${
              isRestricted
                ? 'bg-red-50 dark:bg-[#362322] border border-red-200 dark:border-red-500/20 opacity-60 cursor-not-allowed'
                : analysis?.flagged
                  ? 'bg-red-50 dark:bg-[#362322] border border-red-200 dark:border-red-500/20'
                  : 'bg-sib-sand dark:bg-[#26322f] border border-transparent'
            }`}
          />
          <button
            onClick={attemptSend}
            disabled={!text.trim() || isRestricted}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-all ${
              isRestricted
                ? 'bg-red-300'
                : analysis?.flagged
                  ? 'bg-red-400'
                  : 'bg-sib-secondary'
            }`}
          >
            {isRestricted ? <Ban size={16} className="text-white" /> : <Send size={16} className="text-white" />}
          </button>
        </div>
      </div>
      {counterModal && (
        <CounterOfferModal
          offer={counterModal}
          listing={getListingById(counterModal.listingId)}
          onSubmit={(counterPrice, idempotencyKey) => handleCounterOffer(counterModal.id, counterPrice, idempotencyKey)}
          onClose={() => setCounterModal(null)}
        />
      )}
    </>
  )
}
