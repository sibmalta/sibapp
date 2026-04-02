import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { user, loading, recoveryMode } = useAuth()
  const [error, setError] = useState(null)

  // Capture hash presence ONCE on initial mount, before auth-context strips it.
  // auth-context's init() calls replaceState to remove the hash after processing,
  // so we cannot re-read it later.
  const hadTokenRef = useRef(
    !!(window.location.hash && window.location.hash.includes('access_token='))
  )

  // Once auth finishes loading, decide where to redirect
  useEffect(() => {
    if (loading) return

    // No token was ever in the URL — stale visit to /auth/callback
    if (!hadTokenRef.current) {
      navigate('/auth', { replace: true })
      return
    }

    // Token was present and auth-context processed it
    if (recoveryMode) {
      navigate('/reset-password', { replace: true })
      return
    }

    if (user) {
      navigate('/browse', { replace: true })
      return
    }

    // auth-context finished but no user — token was invalid/expired
    setError('Verification link may have expired. Please try logging in or request a new link.')
  }, [loading, user, recoveryMode, navigate])

  // Timeout fallback: if auth takes longer than 10s, show error
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setError('Authentication is taking too long. Please try logging in manually.')
      }
    }, 10000)
    return () => clearTimeout(timeout)
  }, [loading])

  if (error) {
    return (
      <div className="min-h-screen bg-sib-warm flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <img
            src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
            alt="Sib"
            className="h-20 w-auto mx-auto mb-6"
          />
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-sib-text mb-2">Something went wrong</h2>
            <p className="text-sm text-sib-muted leading-relaxed mb-5">{error}</p>
            <button
              onClick={() => navigate('/auth', { replace: true })}
              className="w-full bg-sib-secondary text-white font-bold py-3 rounded-2xl text-sm"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Loading / processing state
  return (
    <div className="min-h-screen bg-sib-warm flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <img
          src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
          alt="Sib"
          className="h-20 w-auto mx-auto mb-6"
        />
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="w-10 h-10 border-4 border-sib-sand border-t-sib-secondary rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-sib-text mb-1">Verifying your account</h2>
          <p className="text-sm text-sib-muted">Please wait a moment...</p>
        </div>
      </div>
    </div>
  )
}
