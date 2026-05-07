import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, Send, ShieldAlert, UserRound, LifeBuoy, Sparkles } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { askSibSupport } from '../lib/supportAi'

function quickPrompt(mode, orderId) {
  if (mode === 'evidence') return 'Help me provide the right evidence for this dispute.'
  if (orderId) return 'Can you explain what is happening with this order?'
  return ''
}

const STARTER_PROMPTS = [
  'Where is my order?',
  'Track my delivery',
  'I need help with a dispute',
  'When will I get paid?',
  'Report a problem',
]

export default function SupportAssistantPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, showToast } = useApp()
  const orderId = searchParams.get('orderId') || ''
  const mode = searchParams.get('mode') || ''
  const endRef = useRef(null)
  const [input, setInput] = useState(quickPrompt(mode, orderId))
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [hasInteracted, setHasInteracted] = useState(false)
  const [assistantReplyCount, setAssistantReplyCount] = useState(0)

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
    setHasInteracted(true)
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
      setAssistantReplyCount(count => count + 1)
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
    <div className="pb-8">
      <PageHeader title="Ask Sib" />

      <div className="mx-auto flex min-h-[calc(100vh-150px)] max-w-3xl flex-col px-4 py-4">
        <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-3xl border border-sib-stone bg-white shadow-sm dark:border-[rgba(242,238,231,0.10)] dark:bg-[#1d2624]">
          <div className="border-b border-sib-stone bg-sib-sand/50 px-4 py-3 dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sib-primary text-white">
                <Bot size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-sib-text dark:text-[#f4efe7]">Hi, I&apos;m Sib Support.</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-sib-primary dark:bg-[#1d2624]">
                    {contextLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
                  I can help with orders, delivery, payouts, refunds, disputes, and account questions. If something needs human review, I&apos;ll help escalate it to Sib support.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="space-y-4">
              {!hasInteracted && (
                <div className="rounded-2xl border border-sib-stone bg-sib-sand/40 p-4 dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]/70">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sib-primary dark:bg-[#1d2624]">
                      <Sparkles size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-sib-text dark:text-[#f4efe7]">What can I help with?</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {STARTER_PROMPTS.map(prompt => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => submitMessage(prompt)}
                            disabled={loading}
                            className="rounded-full border border-sib-stone bg-white px-3 py-2 text-xs font-bold text-sib-text transition-colors hover:border-sib-primary hover:text-sib-primary disabled:opacity-50 dark:border-[#2d3635] dark:bg-[#1d2624] dark:text-[#f4efe7]"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {messages.map(message => {
                const isUser = message.role === 'user'
                const Icon = isUser ? UserRound : Bot
                return (
                  <div key={message.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sib-primary text-white">
                        <Icon size={15} />
                      </div>
                    )}
                    <div className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[78%] ${
                      isUser
                        ? 'rounded-br-md bg-sib-primary text-white'
                        : 'rounded-bl-md border border-sib-stone bg-white text-sib-text dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f] dark:text-[#f4efe7]'
                    }`}>
                      {message.text}
                    </div>
                  </div>
                )
              })}
              {loading && (
                <div className="flex justify-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sib-primary text-white">
                    <Bot size={15} />
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-sib-stone bg-white px-3.5 py-2.5 text-sm text-sib-muted shadow-sm dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]">
                    Checking your Sib account...
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <div className="border-t border-sib-stone bg-white p-3 dark:border-[#2d3635] dark:bg-[#1d2624]">
            {assistantReplyCount > 0 && (
              <button
                type="button"
                onClick={escalate}
                disabled={loading}
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-sib-muted transition-colors hover:text-sib-primary disabled:opacity-50 dark:text-[#aeb8b4]"
              >
                <LifeBuoy size={14} /> Need more help? Escalate to human support.
              </button>
            )}
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
                placeholder="Ask about an order, payout, delivery, or dispute..."
                className="min-w-0 flex-1 rounded-2xl border border-sib-stone bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-sib-primary dark:border-[#2d3635] dark:bg-[#26322f] dark:text-[#f4efe7]"
              />
              <button
                type="button"
                onClick={() => submitMessage()}
                disabled={!input.trim() || loading}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sib-primary text-white transition-opacity disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
              <ShieldAlert size={13} className="mt-0.5 shrink-0 text-sib-primary" />
              <p>Refunds, payouts, disputes, and account changes are always reviewed by a human.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
