import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, Send, ShieldAlert, UserRound, LifeBuoy } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { askSibSupport } from '../lib/supportAi'

function quickPrompt(mode, orderId) {
  if (mode === 'evidence') return 'Help me provide the right evidence for this dispute.'
  if (orderId) return 'Can you explain what is happening with this order?'
  return 'How can Sib Support help?'
}

export default function SupportAssistantPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, showToast } = useApp()
  const orderId = searchParams.get('orderId') || ''
  const mode = searchParams.get('mode') || ''
  const endRef = useRef(null)
  const [input, setInput] = useState(quickPrompt(mode, orderId))
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState(() => ([
    {
      id: 'welcome',
      role: 'assistant',
      text: orderId
        ? 'Ask me about this order. I can explain status, drop-off, delivery, payout, refunds, or dispute next steps.'
        : 'Ask me about orders, MYConvenience drop-off, delivery, payouts, refunds, or disputes.',
    },
  ]))

  const contextLabel = useMemo(() => {
    if (mode === 'evidence') return 'Dispute evidence help'
    if (orderId) return 'Order support'
    return 'General support'
  }, [mode, orderId])

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth?redirect=/support', { replace: true })
    }
  }, [currentUser, navigate])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  if (!currentUser) return null

  const submitMessage = async (textOverride) => {
    const text = String(textOverride ?? input).trim()
    if (!text || loading) return
    const userMessage = { id: `user-${Date.now()}`, role: 'user', text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    try {
      const result = await askSibSupport({
        message: text,
        orderId,
        context: contextLabel,
      })
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.answer || 'I could not answer that. You can escalate this to Sib Support.',
      }])
    } catch (error) {
      showToast(error.message || 'Sib Support is unavailable right now.', 'error')
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: 'I could not reach Sib Support AI right now. You can try again or escalate to a human admin.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const escalate = () => {
    submitMessage(orderId
      ? 'Please escalate this order to a human support admin.'
      : 'Please escalate this to a human support admin.')
  }

  return (
    <div className="pb-28">
      <PageHeader title="Ask Sib" />

      <div className="px-4 py-4 max-w-2xl mx-auto">
        <div className="mb-3 rounded-2xl border border-sib-stone bg-sib-sand/60 px-4 py-3 dark:bg-[#26322f] dark:border-[rgba(242,238,231,0.10)]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-sib-primary/10 flex items-center justify-center">
              <ShieldAlert size={16} className="text-sib-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-sib-text dark:text-[#f4efe7]">{contextLabel}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
                Sib AI can explain statuses and next steps. Refunds, payouts, dispute closure, and order changes always require human review.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {messages.map(message => {
            const isUser = message.role === 'user'
            const Icon = isUser ? UserRound : Bot
            return (
              <div key={message.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="h-8 w-8 rounded-full bg-sib-primary text-white flex items-center justify-center shrink-0">
                    <Icon size={15} />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-sib-primary text-white'
                    : 'bg-white border border-sib-stone text-sib-text dark:bg-[#26322f] dark:border-[rgba(242,238,231,0.10)] dark:text-[#f4efe7]'
                }`}>
                  {message.text}
                </div>
              </div>
            )
          })}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="h-8 w-8 rounded-full bg-sib-primary text-white flex items-center justify-center shrink-0">
                <Bot size={15} />
              </div>
              <div className="rounded-2xl border border-sib-stone bg-white px-3.5 py-2.5 text-sm text-sib-muted dark:bg-[#26322f] dark:border-[rgba(242,238,231,0.10)]">
                Checking...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-sib-stone bg-white/95 p-3 backdrop-blur-xl dark:bg-[#131918]/95 dark:border-[#2d3635] lg:max-w-2xl">
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={escalate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sib-stone px-3 py-2 text-xs font-bold text-sib-text disabled:opacity-50 dark:text-[#f4efe7] dark:border-[#2d3635]"
          >
            <LifeBuoy size={14} /> Escalate to support
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submitMessage()
              }
            }}
            placeholder="Ask about an order, payout, refund, or dispute..."
            className="min-w-0 flex-1 rounded-2xl border border-sib-stone bg-white px-4 py-3 text-sm outline-none focus:border-sib-primary dark:bg-[#26322f] dark:border-[#2d3635] dark:text-[#f4efe7]"
          />
          <button
            type="button"
            onClick={() => submitMessage()}
            disabled={!input.trim() || loading}
            className="h-12 w-12 rounded-2xl bg-sib-primary text-white flex items-center justify-center disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
