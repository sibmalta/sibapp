import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Send, Clock, HelpCircle, CheckCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

const TOPICS = [
  'Order issue',
  'Payment issue',
  'Delivery issue',
  'Account issue',
  'General question',
]

export default function ContactPage() {
  const navigate = useNavigate()
  const { currentUser, showToast } = useApp()

  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    topic: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.topic || !form.message.trim()) {
      showToast('Please fill in all fields', 'error')
      return
    }
    setSending(true)
    // Simulate sending
    setTimeout(() => {
      setSending(false)
      setSubmitted(true)
      showToast('Message sent successfully', 'success')
    }, 800)
  }

  if (submitted) {
    return (
      <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex flex-col items-center text-center py-12">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-sib-text mb-2">Message Sent</h1>
          <p className="text-sm text-sib-muted max-w-xs mb-1">
            Thanks for reaching out. We've received your message and will get back to you within 1–2 working days.
          </p>
          <p className="text-xs text-sib-muted mb-6">
            We'll reply to <span className="font-semibold text-sib-text">{form.email}</span>
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => { setSubmitted(false); setForm({ name: currentUser?.name || '', email: currentUser?.email || '', topic: '', message: '' }) }}
              className="px-5 py-2.5 text-sm font-semibold text-sib-primary border border-sib-stone rounded-full active:bg-sib-sand transition-colors"
            >
              Send Another
            </button>
            <Link
              to="/faq"
              className="px-5 py-2.5 text-sm font-semibold text-sib-primary border border-sib-stone rounded-full active:bg-sib-sand transition-colors"
            >
              View FAQ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2.5 mb-2">
        <Mail size={22} className="text-sib-primary flex-shrink-0" />
        <h1 className="text-xl font-bold text-sib-text">Need help?</h1>
      </div>
      <p className="text-sm text-sib-muted mb-6">
        We're here to help with orders, payments, delivery, and account issues.
      </p>

      {/* Quick links */}
      <div className="p-4 rounded-2xl bg-sib-warm border border-sib-stone mb-6">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle size={15} className="text-sib-primary" />
          <p className="text-xs font-semibold text-sib-muted uppercase tracking-wide">Before you write</p>
        </div>
        <p className="text-xs text-sib-muted leading-relaxed mb-2">
          Many questions are already answered in our FAQ. Check there first — it might save you time.
        </p>
        <Link to="/faq" className="text-sm font-semibold text-sib-primary">
          Browse FAQ →
        </Link>
      </div>

      {/* Contact form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-sib-muted uppercase tracking-wide mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 text-sm text-sib-text bg-white border border-sib-stone rounded-xl focus:outline-none focus:ring-2 focus:ring-sib-primary/30 focus:border-sib-primary placeholder:text-sib-stone transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-sib-muted uppercase tracking-wide mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 text-sm text-sib-text bg-white border border-sib-stone rounded-xl focus:outline-none focus:ring-2 focus:ring-sib-primary/30 focus:border-sib-primary placeholder:text-sib-stone transition-colors"
          />
        </div>

        {/* Topic */}
        <div>
          <label className="block text-xs font-semibold text-sib-muted uppercase tracking-wide mb-1.5">
            Topic
          </label>
          <select
            value={form.topic}
            onChange={(e) => handleChange('topic', e.target.value)}
            className="w-full px-4 py-3 text-sm text-sib-text bg-white border border-sib-stone rounded-xl focus:outline-none focus:ring-2 focus:ring-sib-primary/30 focus:border-sib-primary appearance-none transition-colors"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23697073\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
          >
            <option value="" disabled>Select a topic</option>
            {TOPICS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-sib-muted uppercase tracking-wide mb-1.5">
            Message
          </label>
          <textarea
            value={form.message}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="Describe your issue or question..."
            rows={5}
            className="w-full px-4 py-3 text-sm text-sib-text bg-white border border-sib-stone rounded-xl focus:outline-none focus:ring-2 focus:ring-sib-primary/30 focus:border-sib-primary placeholder:text-sib-stone resize-none transition-colors"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-sib-primary text-white text-sm font-bold active:bg-sib-primaryDark disabled:opacity-60 transition-colors"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send size={15} />
              Send Message
            </>
          )}
        </button>
      </form>

      {/* Response time note */}
      <div className="flex items-center gap-2 mt-5 px-1">
        <Clock size={13} className="text-sib-muted flex-shrink-0" />
        <p className="text-xs text-sib-muted">
          We aim to respond within 1–2 working days.
        </p>
      </div>

      {/* Email fallback */}
      <div className="mt-6 p-4 rounded-2xl border border-sib-stone">
        <p className="text-xs font-semibold text-sib-muted uppercase tracking-wide mb-1.5">Email us directly</p>
        <a href="mailto:info@sibmalta.com" className="text-sm font-semibold text-sib-primary">
          info@sibmalta.com
        </a>
        <p className="text-xs text-sib-muted mt-1">
          For urgent issues or if the form isn't working.
        </p>
      </div>
    </div>
  )
}
