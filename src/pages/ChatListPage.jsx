import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'

export default function ChatListPage() {
  const { currentUser, getUserConversations, getUserById, getListingById } = useApp()
  const navigate = useNavigate()

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const conversations = getUserConversations(currentUser.id)

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-8">
        <p className="text-5xl">💬</p>
        <p className="font-semibold text-sib-text">No messages yet</p>
        <p className="text-sm text-sib-muted text-center">Browse items and tap the message button to contact a seller.</p>
        <button onClick={() => navigate('/browse')} className="mt-2 bg-sib-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold">Browse</button>
      </div>
    )
  }

  return (
    <div className="divide-y divide-sib-stone">
      {conversations.map(conv => {
        const otherId = conv.participants.find(p => p !== currentUser.id)
        const other = getUserById(otherId)
        const listing = getListingById(conv.listingId)
        const lastMsg = conv.messages[conv.messages.length - 1]
        return (
          <div
            key={conv.id}
            onClick={() => navigate(`/messages/${conv.id}`)}
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-sib-warm"
          >
            <div className="relative flex-shrink-0">
              <UserAvatar user={other} size="md" />
              {listing?.images?.[0] && (
                <img
                  src={listing.images[0]}
                  alt=""
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md object-cover border border-white"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-sib-text">{other?.name}</p>
                {lastMsg && (
                  <span className="text-[10px] text-sib-muted">
                    {new Date(lastMsg.timestamp).toLocaleDateString('en-MT', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              <p className="text-xs text-sib-muted line-clamp-1 mt-0.5">
                {lastMsg ? lastMsg.text : `Re: ${listing?.title || 'item'}`}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
