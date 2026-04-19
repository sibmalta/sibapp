import React, { useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, MessageCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import OfficialBadge from '../components/OfficialBadge'

function formatTimestamp(ts) {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  // Today: show time
  if (date.toDateString() === now.toDateString()) {
    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    return `${diffHours}h`
  }

  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  // Within this week
  if (diffMs < 7 * 86400000) {
    return date.toLocaleDateString('en-MT', { weekday: 'short' })
  }

  // Older
  return date.toLocaleDateString('en-MT', { day: 'numeric', month: 'short' })
}

export default function ChatListPage() {
  const { currentUser, getUserConversations, getUserById, getListingById, getOrCreateConversation } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const handledNewRef = useRef(false)

  // Handle ?new=<userId> — find or create conversation, then redirect to it
  useEffect(() => {
    if (handledNewRef.current) return
    const newUserId = searchParams.get('new')
    if (!newUserId || !currentUser) return
    if (newUserId === currentUser.id) return

    handledNewRef.current = true

    const allConvs = getUserConversations(currentUser.id)
    const existing = allConvs.find(c => c.participants.includes(newUserId))

    if (existing) {
      navigate(`/messages/${existing.id}`, { replace: true })
    } else {
      const conv = getOrCreateConversation(newUserId, null)
      navigate(`/messages/${conv.id}`, { replace: true })
    }
  }, [searchParams, currentUser, getUserConversations, getOrCreateConversation, navigate])

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const conversations = getUserConversations(currentUser.id)

  // Sort by most recent message first
  const sorted = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]
      const bLast = b.messages[b.messages.length - 1]
      const aTime = aLast ? new Date(aLast.timestamp).getTime() : 0
      const bTime = bLast ? new Date(bLast.timestamp).getTime() : 0
      return bTime - aTime
    })
  }, [conversations])

  // Empty state — full height, centered
  if (sorted.length === 0) {
    return (
      <div className="flex flex-col h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-4rem)]">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-16 h-16 rounded-full bg-sib-sand flex items-center justify-center mb-4">
            <MessageCircle size={28} className="text-sib-muted" />
          </div>
          <p className="text-[17px] font-bold text-sib-text">No messages yet</p>
          <p className="text-[13px] text-sib-muted text-center mt-1.5 max-w-[260px] leading-snug">
            When you message a seller or receive a message, it will appear here.
          </p>
          <button
            onClick={() => navigate('/browse')}
            className="mt-5 bg-sib-primary text-white px-6 py-2.5 rounded-full text-[13px] font-bold hover:bg-sib-primary/90 active:scale-[0.97] transition-all"
          >
            Start browsing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-4rem)]">
      {/* Scrollable conversation list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.map((conv, i) => {
          const otherId = conv.participants.find(p => p !== currentUser.id)
          const other = getUserById(otherId)
          const listing = getListingById(conv.listingId)
          const lastMsg = conv.messages[conv.messages.length - 1]
          const isUnread = lastMsg && lastMsg.senderId !== currentUser.id && !lastMsg.read

          return (
            <div
              key={conv.id}
              onClick={() => navigate(`/messages/${conv.id}`)}
              className={`flex items-center gap-3.5 px-4 py-4 cursor-pointer transition-colors hover:bg-gray-50 active:bg-sib-sand ${
                i < sorted.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              {/* Avatar with listing thumbnail overlay */}
              <div className="relative flex-shrink-0">
                <UserAvatar user={other} size="md" />
                {listing?.images?.[0] && (
                  <img
                    src={listing.images[0]}
                    alt=""
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md object-cover border-2 border-white shadow-sm"
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`text-[14px] truncate ${isUnread ? 'font-bold text-sib-text' : 'font-semibold text-sib-text'}`}>
                      {other?.username || 'User'}
                    </p>
                    <OfficialBadge user={other} size="sm" />
                  </div>
                  {lastMsg && (
                    <span className={`text-[11px] flex-shrink-0 ${isUnread ? 'text-sib-primary font-semibold' : 'text-sib-muted'}`}>
                      {formatTimestamp(lastMsg.timestamp)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className={`text-[13px] line-clamp-1 flex-1 ${isUnread ? 'text-sib-text font-medium' : 'text-gray-500'}`}>
                    {lastMsg ? (
                      lastMsg.flagged ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <AlertTriangle size={11} className="flex-shrink-0" />
                          Message flagged
                        </span>
                      ) : (
                        <>
                          {lastMsg.senderId === currentUser.id && (
                            <span className="text-gray-400">You: </span>
                          )}
                          {lastMsg.text}
                        </>
                      )
                    ) : (
                      <span className="text-gray-400 italic">Re: {listing?.title || 'item'}</span>
                    )}
                  </p>
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-sib-primary flex-shrink-0" />
                  )}
                </div>
                {/* Listing context line */}
                {listing && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {listing.title} · €{listing.price}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
