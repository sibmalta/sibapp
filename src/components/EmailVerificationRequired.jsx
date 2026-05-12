import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { isEmailVerified, EMAIL_VERIFICATION_REQUIRED_MESSAGE } from '../lib/emailVerification'

export default function EmailVerificationRequired({ children }) {
  const { user, loading, resendVerification } = useAuth()
  const location = useLocation()
  const [status, setStatus] = useState('')
  const [resending, setResending] = useState(false)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-5">
        <div className="w-10 h-10 border-4 border-sib-sand border-t-sib-secondary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />
  }

  if (isEmailVerified(user)) {
    return children
  }

  const handleResend = async () => {
    if (!user?.email || resending) return
    setResending(true)
    setStatus('')
    try {
      await resendVerification(user.email)
      setStatus('Verification email sent. Check your inbox and spam folder.')
    } catch (error) {
      setStatus(error?.message || 'Could not resend verification email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm bg-white dark:bg-[#202b28] rounded-3xl p-6 shadow-sm dark:border dark:border-[rgba(242,238,231,0.10)] text-center">
        <div className="w-14 h-14 rounded-full bg-orange-50 text-sib-secondary flex items-center justify-center mx-auto mb-4">
          <MailCheck size={28} />
        </div>
        <h1 className="text-lg font-black text-sib-text dark:text-[#f4efe7] mb-2">Verify your email</h1>
        <p className="text-sm text-sib-muted dark:text-[#aeb8b4] leading-relaxed mb-5">
          {EMAIL_VERIFICATION_REQUIRED_MESSAGE}
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !user?.email}
          className="w-full bg-sib-secondary text-white font-bold py-3 rounded-2xl text-sm disabled:opacity-60"
        >
          {resending ? 'Sending...' : 'Resend verification email'}
        </button>
        {status && (
          <p className="mt-3 text-xs font-semibold text-sib-muted dark:text-[#aeb8b4] leading-relaxed">
            {status}
          </p>
        )}
      </div>
    </div>
  )
}
