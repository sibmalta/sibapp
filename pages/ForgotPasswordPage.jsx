import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      await resetPasswordForEmail(email.trim().toLowerCase())
      setSubmitted(true)
    } catch (err) {
      const msg = err?.message || 'Something went wrong'
      if (msg.toLowerCase().includes('wait') || msg.toLowerCase().includes('too many')) {
        setError(msg)
      } else {
        // Always show success to avoid email enumeration, but log error
        console.error('Reset request error:', msg)
        setSubmitted(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center px-5 pt-3 pb-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-sib-text">Reset your password</h1>
          <p className="text-sm text-sib-muted mt-1 leading-relaxed">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-sib-text mb-2">Check your email</h2>
              <p className="text-sm text-sib-muted leading-relaxed mb-6">
                If an account exists for <strong className="text-sib-text">{email}</strong>, a reset link has been sent. Please check your inbox and spam folder.
              </p>
              <Link
                to="/auth"
                className="inline-block w-full bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm text-center"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-sib-muted mb-1.5 uppercase tracking-wide">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${
                    error ? 'border-red-400' : 'border-sib-stone'
                  } focus:border-sib-secondary transition-colors`}
                />
                {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-70 transition-opacity"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <div className="text-center pt-1">
                <Link to="/auth" className="text-sm text-sib-muted hover:text-sib-secondary transition-colors">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
