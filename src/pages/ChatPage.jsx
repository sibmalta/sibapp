import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, ShieldCheck, AlertTriangle, EyeOff, Lock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import UserAvatar from '../components/UserAvatar'
import { analyseMessage } from '../utils/circumventionDetector'

// ─── Flagged message bubble ─────────────────────────────────────────────────
function FlaggedMessage({ msg, isMe, other }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isMe && <UserAvatar user={other} size="xs" className="flex-shrink-0 self-end" />}
      <div className="max-w-[80%] flex flex-col gap-1">
        <div className={`flex items-center gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <AlertTriangle size={11} className="text-amber-500" />
          <span className="text-[10px] text-amber-600 font-semibold">Off-platform content flagged</span>
        </div>
        <div className={`relative px-4 py-2.5 rounded-2xl text-sm overflow-hidden ${
          isMe ? 'bg-sib-primary/80 text-white rounded-br-sm' : 'bg-sib-sand text-sib-text rounded-bl-sm'
        }`}>
          {!revealed && (
            <div
              className="absolute inset-0 backdrop-blur-sm bg-black/10 flex flex-col items-center justify-center gap-1.5 z-10 cursor-pointer rounded-2xl"
              onClick={() => setRevealed(true)}
            >
              <EyeOff size={14} className={isMe ? 'text-white' : 'text-sib-muted'} />
              <span className={`text-[10px] font-semibold ${isMe ? 'text-white' : 'text-sib-muted'}`}>Tap to reveal</span>
            </div>
          )}
          <p className={revealed ? '' : 'select-none'}>{msg.text}</p>
          <div className="flex items-center justify-between mt-1">
            <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-sib-muted'}`}>
              {new Date(msg.timestamp).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {revealed && (
              <button onClick={() => setRevealed(false)} className={`text-[10px] underline ml-2 ${isMe ? 'text-white/70' : 'text-sib-muted'}`}>hide</button>
            )}
          </div>
        </div>
        <p className={`text-[10px] text-sib-muted leading-tight ${isMe ? 'text-right' : 'text-left'}`}>
          Use Sib delivery &amp; secure payment to stay protected
        </p>
      </div>
    </div>
  )
}

// ─── Confirmation modal ─────────────────────────────────────────────────────
function ConfirmModal({ reasons, severity, onSend, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className={`px-5 pt-5 pb-4 ${severity === 'block' ? 'bg-red-50' : 'bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${severity === 'block' ? 'bg-red-100' : 'bg-amber-100'}`}>
              <AlertTriangle size={18} className={severity === 'block' ? 'text-red-600' : 'text-amber-600'} />
            </div>
            <div>
              <p className={`text-sm font-bold ${severity === 'block' ? 'text-red-800' : 'text-amber-800'}`}>
                {severity === 'block' ? 'This message may violate our policy' : 'Heads up before you send'}
              </p>
              <p className={`text-xs mt-0.5 leading-snug ${severity === 'block' ? 'text-red-700' : 'text-amber-700'}`}>
                For your protection, keep all payments and communication on Sib.
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-b border-sib-stone">
          <p className="text-xs font-semibold text-sib-muted uppercase tracking-wide mb-2">Detected</p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                <span className="text-xs text-sib-text">{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-5 py-3 flex items-center gap-2 bg-green-50">
          <Lock size={13} className="text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-800 font-medium">Use Sib delivery and secure payment to stay protected</p>
        </div>
        <div className="px-5 py-4 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-sib-stone text-sm font-semibold text-sib-text">
            Edit message
          </button>
          {severity !== 'block' && (
            <button onClick={onSend} className="flex-1 py-3 rounded-2xl bg-amber-500 text-white text-sm font-bold">
              Send anyway
            </button>
          )}
        </div>
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
  const [pendingMsg, setPendingMsg] = useState(null)
  const bottomRef = useRef(null)

  if (!currentUser) { navigate('/auth'); return null }

  const conv = getConversation(id)
  if (!conv) return <div className="text-center py-20 text-sib-muted">Conversation not found.</div>

  const otherId = conv.participants.find(p => p !== currentUser.id)
  const other = getUserById(otherId)
  const listing = getListingById(conv.listingId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages?.length])

  const analysis = text.trim() ? analyseMessage(text) : null

  const attemptSend = () => {
    const msg = text.trim()
    if (!msg) return
    const result = analyseMessage(msg)
    if (result.flagged) {
      setPendingMsg(msg)
      setWarning(result)
    } else {
      sendMessage(conv.id, currentUser.id, msg, false)
      setText('')
    }
  }

  const commitSendFlagged = () => {
    sendMessage(conv.id, currentUser.id, pendingMsg, true)
    setText('')
    setPendingMsg(null)
    setWarning(null)
  }

  const cancelSend = () => {
    setPendingMsg(null)
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
      {warning && (
        <ConfirmModal
          reasons={warning.reasons}
          severity={warning.severity}
          onSend={commitSendFlagged}
          onCancel={cancelSend}
        />
      )}

      <div className="flex flex-col h-[calc(100vh-8.5rem)]">
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

        {/* Persistent safety banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
          <ShieldCheck size={13} className="text-amber-600 flex-shrink-0" />
          <p className="text-[11px] text-amber-800 font-medium">Payments made outside Sib are not protected</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {conv.messages.length === 0 && (
            <div className="text-center py-8">
              <UserAvatar user={other} size="lg" className="mx-auto mb-3" />
              <p className="text-sm font-semibold text-sib-text">{other?.name}</p>
              <p className="text-xs text-sib-muted mt-1">Say hi to start the conversation!</p>
            </div>
          )}
          {conv.messages.map(msg => {
            const isMe = msg.senderId === currentUser.id
            if (msg.flagged) {
              return <FlaggedMessage key={msg.id} msg={msg} isMe={isMe} other={other} />
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
        {analysis?.flagged && (
          <div className={`px-4 py-2 border-t flex items-start gap-2 ${
            analysis.severity === 'block' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
          }`}>
            <AlertTriangle size={13} className={`flex-shrink-0 mt-0.5 ${analysis.severity === 'block' ? 'text-red-500' : 'text-amber-500'}`} />
            <p className={`text-[11px] font-medium leading-snug ${analysis.severity === 'block' ? 'text-red-700' : 'text-amber-700'}`}>
              {analysis.severity === 'block'
                ? "This message may violate Sib's policy. Please keep all transactions on-platform."
                : "Looks like you're sharing contact details. Stay safe — keep all chats and payments on Sib."}
            </p>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-sib-stone bg-white px-4 py-3 flex items-end gap-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm text-sib-text placeholder-sib-muted outline-none resize-none max-h-24 transition-colors ${
              analysis?.flagged
                ? analysis.severity === 'block'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-amber-50 border border-amber-200'
                : 'bg-sib-sand border border-transparent'
            }`}
          />
          <button
            onClick={attemptSend}
            disabled={!text.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-all ${
              analysis?.flagged
                ? analysis.severity === 'block' ? 'bg-red-400' : 'bg-amber-400'
                : 'bg-sib-secondary'
            }`}
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </>
  )
}
