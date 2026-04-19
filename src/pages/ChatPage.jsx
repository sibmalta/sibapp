import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, ShieldCheck, AlertTriangle, Lock, Ban } from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import { analyseMessage, recordViolation, getRestriction, getViolationCount } from '../utils/circumventionDetector'
import { moderateContent } from '../lib/moderation'

// ─── Blocked message bubble (no reveal, no blurred content — hard block) ────
function BlockedMessage({ msg, isMe, other }) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isMe && <UserAvatar user={other} size="xs" className="flex-shrink-0 self-end" />}
      <div className="max-w-[80%] flex flex-col gap-1">
        <div className={`px-4 py-3 rounded-2xl text-sm ${
          isMe ? 'bg-red-100 rounded-br-sm' : 'bg-red-50 rounded-bl-sm'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Ban size={13} className="text-red-500 flex-shrink-0" />
            <span className="text-xs font-bold text-red-700">Message blocked</span>
          </div>
          <p className="text-xs text-red-600 leading-snug">
            Sharing contact details is not allowed on Sib
          </p>
          <p className={`text-[10px] mt-2 text-red-400`}>
            {new Date(msg.timestamp).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit' })}
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
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up">
        <div className="px-5 pt-5 pb-4 bg-red-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
              <Ban size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">Message not sent</p>
              <p className="text-xs mt-0.5 leading-snug text-red-700">
                Sharing contact details is not allowed on Sib. Please keep all communication on-platform to stay protected.
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-b border-sib-stone">
          <p className="text-xs font-semibold text-sib-muted uppercase tracking-wide mb-2">Detected</p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-red-400" />
                <span className="text-xs text-sib-text">{r}</span>
              </li>
            ))}
          </ul>
        </div>
        {isRepeatOffender && (
          <div className="px-5 py-3 flex items-center gap-2 bg-red-50 border-b border-red-100">
            <Ban size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700 font-medium">Repeated attempts will lead to a temporary messaging restriction</p>
          </div>
        )}
        <div className="px-5 py-3 flex items-center gap-2 bg-green-50">
          <Lock size={13} className="text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-800 font-medium">Keep everything on Sib — your transactions are protected</p>
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
    <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Ban size={14} className="text-red-600" />
      </div>
      <div>
        <p className="text-xs font-bold text-red-800">Messaging temporarily restricted</p>
        <p className="text-[11px] text-red-700 mt-0.5 leading-snug">
          Multiple policy violations detected. You can send messages again in <span className="font-bold">{mins} min</span>.
        </p>
        <p className="text-[10px] text-red-600 mt-1">Your account has been flagged for review.</p>
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser, getConversation, getUserById, getListingById, sendMessage } = useApp()
  const [text, setText] = useState('')
  const [warning, setWarning] = useState(null)
  const [restriction, setRestriction] = useState(getRestriction())
  const bottomRef = useRef(null)
  const restrictionTimerRef = useRef(null)

  if (!currentUser) { navigate('/auth'); return null }

  const conv = getConversation(id)
  if (!conv) return <div className="text-center py-20 text-sib-muted">Conversation not found.</div>

  const otherId = conv.participants.find(p => p !== currentUser.id)
  const other = getUserById(otherId)
  const listing = getListingById(conv.listingId)

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages?.length])

  const analysis = text.trim() ? analyseMessage(text) : null
  const isRestricted = !!restriction

  const attemptSend = useCallback(() => {
    const msg = text.trim()
    if (!msg || isRestricted) return
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
    sendMessage(conv.id, currentUser.id, msg, false)
    setText('')
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

  return (
    <>
      {warning && !isRestricted && (
        <SendBlockedModal
          reasons={warning.reasons}
          violationCount={getViolationCount()}
          onDismiss={dismissWarning}
        />
      )}

      <div className="flex flex-col h-[calc(100dvh-8.5rem)] min-h-0">
        {/* Listing preview */}
        {listing && (
          <div
            onClick={() => navigate(`/listing/${listing.id}`)}
            className="flex items-center gap-3 px-4 py-3 border-b border-sib-stone bg-sib-warm cursor-pointer"
          >
            <img src={listing.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover bg-sib-sand" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sib-muted">Enquiring about</p>
              <p className="text-sm font-semibold text-sib-text line-clamp-1">{listing.title}</p>
            </div>
            <span className="text-sm font-bold text-sib-primary">€{listing.price}</span>
          </div>
        )}

        {/* Restriction banner */}
        {isRestricted ? (
          <RestrictionBanner restriction={restriction} />
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
            <ShieldCheck size={13} className="text-amber-600 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 font-medium">Payments made outside Sib are not protected</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {conv.messages.length === 0 && (
            <div className="text-center py-8">
              <UserAvatar user={other} size="lg" className="mx-auto mb-3" />
              <p className="text-sm font-semibold text-sib-text">@{other?.username}</p>
              <p className="text-xs text-sib-muted mt-1">Say hi to start the conversation!</p>
            </div>
          )}
          {conv.messages.map(msg => {
            const isMe = msg.senderId === currentUser.id
            if (msg.flagged) {
              return <BlockedMessage key={msg.id} msg={msg} isMe={isMe} other={other} />
            }
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isMe && <UserAvatar user={other} size="xs" className="flex-shrink-0 self-end" />}
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe ? 'bg-sib-primary text-white rounded-br-sm' : 'bg-sib-sand text-sib-text rounded-bl-sm'
                }`}>
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-sib-muted'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Live warning strip — shows while typing flagged content */}
        {analysis?.flagged && !isRestricted && (
          <div className="px-4 py-2 border-t flex items-start gap-2 bg-red-50 border-red-100">
            <Ban size={13} className="flex-shrink-0 mt-0.5 text-red-500" />
            <p className="text-[11px] font-medium leading-snug text-red-700">
              Sharing contact details is not allowed. Please keep communication on Sib to stay protected.
            </p>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-sib-stone bg-white px-4 py-3 flex items-end gap-3">
          <textarea
            value={text}
            onChange={e => !isRestricted && setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRestricted ? 'Messaging restricted...' : 'Type a message...'}
            rows={1}
            disabled={isRestricted}
            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm text-sib-text placeholder-sib-muted outline-none resize-none max-h-24 transition-colors ${
              isRestricted
                ? 'bg-red-50 border border-red-200 opacity-60 cursor-not-allowed'
                : analysis?.flagged
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-sib-sand border border-transparent'
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
    </>
  )
}
