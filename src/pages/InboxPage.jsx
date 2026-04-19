import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Send } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function InboxPage() {
  const { currentUser, conversations, getUser, listings, sendMessage } = useApp()
  const navigate = useNavigate()
  const [selectedConv, setSelectedConv] = useState(null)
  const [replyText, setReplyText] = useState('')

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const myConvos = conversations.filter(c => c.participants.includes(currentUser.id))

  const handleReply = () => {
    if (!replyText.trim() || !selectedConv) return
    const otherUserId = selectedConv.participants.find(p => p !== currentUser.id)
    sendMessage(otherUserId, selectedConv.listingId, replyText)
    setReplyText('')
  }

  if (selectedConv) {
    const otherUserId = selectedConv.participants.find(p => p !== currentUser.id)
    const otherUser = getUser(otherUserId)
    const listing = listings.find(l => l.id === selectedConv.listingId)
    const updatedConv = conversations.find(c => c.id === selectedConv.id) || selectedConv

    return (
      <div className="md:max-w-lg md:mx-auto flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-6rem)] min-h-0">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-sib-stone bg-white">
          <button onClick={() => setSelectedConv(null)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-sib-text" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-sib-text">@{otherUser?.username || 'user'}</p>
            {listing && <p className="text-xs text-sib-muted truncate">{listing.title}</p>}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {updatedConv.messages.map(msg => {
            const isMe = msg.senderId === currentUser.id
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe ? 'bg-sib-primary text-white rounded-br-sm' : 'bg-white text-sib-text rounded-bl-sm border border-sib-stone'
                }`}>
                  {msg.text}
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-sib-stone bg-white">
          <div className="flex items-center gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReply()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-sib-sand rounded-xl text-sm outline-none text-sib-text placeholder-sib-muted"
            />
            <button
              onClick={handleReply}
              className="w-10 h-10 bg-sib-primary rounded-xl flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="md:max-w-lg md:mx-auto">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 md:pt-6">
        <button onClick={() => navigate(-1)} className="md:hidden p-1">
          <ArrowLeft className="w-5 h-5 text-sib-text" />
        </button>
        <h1 className="text-lg font-bold text-sib-text">Messages</h1>
      </div>

      <div className="px-4 mt-2">
        {myConvos.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-12 h-12 text-sib-stone mx-auto mb-3" />
            <p className="text-sib-muted text-sm font-medium">No messages yet</p>
            <p className="text-sib-muted text-xs mt-1">Start a conversation on any listing</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myConvos.map(conv => {
              const otherUserId = conv.participants.find(p => p !== currentUser.id)
              const otherUser = getUser(otherUserId)
              const listing = listings.find(l => l.id === conv.listingId)
              const lastMsg = conv.messages[conv.messages.length - 1]

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl hover:bg-sib-sand/50 transition-colors text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-sib-primary/10 flex items-center justify-center text-sib-primary font-bold text-sm shrink-0">
                    {otherUser?.username?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-sib-text">@{otherUser?.username || 'user'}</p>
                      <span className="text-[10px] text-sib-muted">{getTimeShort(conv.updatedAt)}</span>
                    </div>
                    {listing && <p className="text-xs text-sib-primary font-medium truncate">{listing.title}</p>}
                    <p className="text-xs text-sib-muted truncate mt-0.5">{lastMsg?.text}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function getTimeShort(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
