import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, Send, ShieldAlert, UserRound, LifeBuoy, Sparkles } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { askSibSupport } from '../lib/supportAi'
import { createSupportTicket, uploadSupportAttachments } from '../lib/supportTickets'

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

const SUPPORT_CATEGORIES = [
  'Order issue',
  'Delivery issue',
  'Refund request',
  'Payout issue',
  'Dispute',
  'Account issue',
  'Other',
]

export default function SupportAssistantPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, orders, showToast } = useApp()
  const orderId = searchParams.get('orderId') || ''
  const mode = searchParams.get('mode') || ''
  const endRef = useRef(null)
  const [input, setInput] = useState(quickPrompt(mode, orderId))
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [hasInteracted, setHasInteracted] = useState(false)
  const [assistantReplyCount, setAssistantReplyCount] = useState(0)
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const [supportSubmitting, setSupportSubmitting] = useState(false)
  const [supportFiles, setSupportFiles] = useState([])
  const [supportForm, setSupportForm] = useState(() => ({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    category: mode === 'evidence' ? 'Dispute' : 'Order issue',
    orderId: orderId || '',
    subject: mode === 'evidence' ? 'Help with dispute evidence' : '',
    message: '',
  }))

  const contextLabel = useMemo(() => {
    if (mode === 'evidence') return 'Dispute evidence help'
    if (orderId) return 'Order support'
    return 'General support'
  }, [mode, orderId])

  const relatedOrders = useMemo(() => {
    if (!currentUser) return []
    return (orders || [])
      .filter(order => order.buyerId === currentUser.id || order.sellerId === currentUser.id)
      .slice(0, 20)
  }, [orders, currentUser])

  const showSupportCta = assistantReplyCount > 0

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth?redirect=/support', { replace: true })
    }
  }, [currentUser, navigate])

  useEffect(() => {
    setSupportForm(prev => ({
      ...prev,
      name: prev.name || currentUser?.name || '',
      email: prev.email || currentUser?.email || '',
      orderId: prev.orderId || orderId || '',
    }))
  }, [currentUser?.name, currentUser?.email, orderId])

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
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
      if (import.meta.env.VITE_DEBUG_SUPPORT_AI === 'true') {
        console.debug('[Ask Sib]', {
          message: text,
          detectedIntent: result.detectedIntent,
          contextCounts: result.contextCounts,
          sectionErrors: result.sectionErrors,
          usedTools: result.usedTools,
          action: result.action,
        })
      }
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.answer || 'I could not answer that. You can escalate this to Sib Support.',
      }])
      setAssistantReplyCount(count => count + 1)
      if (result.action === 'open_support_ticket') {
        setSupportSent(false)
        setSupportOpen(true)
      }
    } catch (error) {
      showToast(error.message || 'Sib Support is unavailable right now.', 'error')
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: "I'm having trouble checking that right now. You can try again, or I can escalate this to Sib support.",
      }])
    } finally {
      setLoading(false)
    }
  }

  const escalate = () => {
    setSupportSent(false)
    setSupportOpen(true)
  }

  const updateSupportForm = (field, value) => {
    setSupportForm(prev => ({ ...prev, [field]: value }))
  }

  const submitSupportTicket = async (event) => {
    event.preventDefault()
    if (supportSubmitting) return
    setSupportSubmitting(true)
    try {
      const attachments = await uploadSupportAttachments(supportFiles, currentUser.id)
      await createSupportTicket({
        ...supportForm,
        orderId: supportForm.orderId || null,
        attachmentUrls: attachments,
        aiConversation: messages.slice(-12).map(message => ({
          role: message.role,
          text: message.text,
        })),
      })
      setSupportSent(true)
      setSupportFiles([])
      showToast('Support request sent.')
    } catch (error) {
      showToast(error.message || 'Could not send support request.', 'error')
    } finally {
      setSupportSubmitting(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-88px)] flex-col overflow-hidden lg:h-[calc(100dvh-96px)]">
      <PageHeader title="Ask Sib" />

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-4 lg:pb-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-sib-stone bg-white shadow-sm dark:border-[rgba(242,238,231,0.10)] dark:bg-[#1d2624]">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-5 sm:px-5">
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

          <div className="shrink-0 border-t border-sib-stone bg-white p-3 dark:border-[#2d3635] dark:bg-[#1d2624]">
            {showSupportCta && (
              <button
                type="button"
                onClick={escalate}
                disabled={loading}
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-sib-muted transition-colors hover:text-sib-primary disabled:opacity-50 dark:text-[#aeb8b4]"
              >
                <LifeBuoy size={14} /> Contact Sib Support
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

      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Contact Sib Support" onClick={() => !supportSubmitting && setSupportOpen(false)}>
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-sib-stone bg-white shadow-2xl dark:border-[#2d3635] dark:bg-[#202b28] sm:rounded-3xl" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-sib-stone bg-white px-4 py-3 dark:border-[#2d3635] dark:bg-[#202b28]">
              <div>
                <p className="text-base font-bold text-sib-text dark:text-[#f4efe7]">Contact Sib Support</p>
                <p className="mt-0.5 text-xs text-sib-muted dark:text-[#aeb8b4]">Sib support usually replies within 1-2 business days.</p>
              </div>
              <button type="button" onClick={() => setSupportOpen(false)} disabled={supportSubmitting} className="rounded-full p-2 text-sib-muted">
                ×
              </button>
            </div>

            {supportSent ? (
              <div className="p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <LifeBuoy size={22} />
                </div>
                <p className="text-base font-bold text-sib-text dark:text-[#f4efe7]">Your support request has been sent to Sib support.</p>
                <p className="mt-2 text-sm text-sib-muted dark:text-[#aeb8b4]">We&apos;ll usually respond within 1-2 business days.</p>
                <button type="button" onClick={() => setSupportOpen(false)} className="mt-5 w-full rounded-2xl bg-sib-primary py-3 text-sm font-bold text-white">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitSupportTicket} className="space-y-3 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold text-sib-muted">Full name</span>
                    <input required value={supportForm.name} onChange={e => updateSupportForm('name', e.target.value)} className="mt-1 w-full rounded-xl border border-sib-stone px-3 py-2 text-sm outline-none focus:border-sib-primary dark:border-[#2d3635] dark:bg-[#26322f] dark:text-[#f4efe7]" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-sib-muted">Email</span>
                    <input required type="email" value={supportForm.email} onChange={e => updateSupportForm('email', e.target.value)} className="mt-1 w-full rounded-xl border border-sib-stone px-3 py-2 text-sm outline-none focus:border-sib-primary dark:border-[#2d3635] dark:bg-[#26322f] dark:text-[#f4efe7]" />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-bold text-sib-muted">Category</span>
                  <select value={supportForm.category} onChange={e => updateSupportForm('category', e.target.value)} className="mt-1 w-full rounded-xl border border-sib-stone px-3 py-2 text-sm outline-none focus:border-sib-primary dark:border-[#2d3635] dark:bg-[#26322f] dark:text-[#f4efe7]">
                    {SUPPORT_CATEGORIES.map(category => <option key={category}>{category}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-sib-muted">Related order optional</span>
                  <select value={supportForm.orderId} onChange={e => updateSupportForm('orderId', e.target.value)} className="mt-1 w-full rounded-xl border border-sib-stone px-3 py-2 text-sm outline-none focus:border-sib-primary dark:border-[#2d3635] dark:bg-[#26322f] dark:text-[#f4efe7]">
                    <option value="">No specific order</option>
                    {relatedOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        {(order.orderRef || order.orderCode || order.id)} - {order.itemTitle || order.listingTitle || 'Order'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-sib-muted">Subject</span>
                  <input required value={supportForm.subject} onChange={e => updateSupportForm('subject', e.target.value)} className="mt-1 w-full rounded-xl border border-sib-stone px-3 py-2 text-sm outline-none focus:border-sib-primary dark:border-[#2d3635] dark:bg-[#26322f] dark:text-[#f4efe7]" />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-sib-muted">Message</span>
                  <textarea required value={supportForm.message} onChange={e => updateSupportForm('message', e.target.value)} rows={7} className="mt-1 w-full rounded-xl border border-sib-stone px-3 py-2 text-sm outline-none focus:border-sib-primary dark:border-[#2d3635] dark:bg-[#26322f] dark:text-[#f4efe7]" />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-sib-muted">Attachments optional</span>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={e => setSupportFiles(Array.from(e.target.files || []))} className="mt-1 w-full rounded-xl border border-dashed border-sib-stone px-3 py-3 text-sm text-sib-muted dark:border-[#2d3635]" />
                  {supportFiles.length > 0 && <p className="mt-1 text-[11px] text-sib-muted">{supportFiles.length} file{supportFiles.length === 1 ? '' : 's'} selected</p>}
                </label>

                <div className="rounded-2xl bg-sib-sand/70 p-3 text-xs leading-relaxed text-sib-muted dark:bg-[#26322f] dark:text-[#aeb8b4]">
                  Recent Ask Sib messages will be attached so support can see the context.
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setSupportOpen(false)} disabled={supportSubmitting} className="flex-1 rounded-2xl border border-sib-stone py-3 text-sm font-bold text-sib-muted disabled:opacity-60">
                    Cancel
                  </button>
                  <button type="submit" disabled={supportSubmitting} className="flex-1 rounded-2xl bg-sib-primary py-3 text-sm font-bold text-white disabled:opacity-60">
                    {supportSubmitting ? 'Sending...' : 'Send request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
