import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

export default function ResetPasswordPage() {
  const { recoveryMode, updatePassword, session } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Recovery mode is set by auth-context when the URL hash contains type=recovery
  const isValidRecovery = recoveryMode && !!session?.access_token

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}

    if (!password) errs.password = 'Required'
    else if (password.length < 6) errs.password = 'Min. 6 characters'

    if (!confirmPassword) errs.confirm = 'Required'
    else if (password !== confirmPassword) errs.confirm = 'Passwords do not match'

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      await updatePassword(password)
      setSuccess(true)
      setTimeout(() => navigate('/auth'), 3000)
    } catch (err) {
      const msg = err?.message || 'Something went wrong'
      if (msg.toLowerCase().includes('same') || msg.toLowerCase().includes('different')) {
        setErrors({ password: 'New password must be different from your current password.' })
      } else if (msg.toLowerCase().includes('weak') || msg.toLowerCase().includes('short')) {
        setErrors({ password: 'Password is too weak. Use at least 6 characters.' })
      } else {
        setErrors({ general: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  // Invalid or expired token / no recovery session
  if (!isValidRecovery && !success) {
    return (
      <div className="flex flex-col items-center px-5 pt-3 pb-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-sib-text mb-2">Invalid or expired link</h2>
            <p className="text-sm text-sib-muted leading-relaxed mb-6">
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block w-full bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm text-center mb-3"
            >
              Request new link
            </Link>
            <Link
              to="/auth"
              className="block text-sm text-sib-muted hover:text-sib-secondary transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center px-5 pt-3 pb-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-sib-text mb-2">Password updated</h2>
            <p className="text-sm text-sib-muted leading-relaxed mb-6">
              Your password has been updated. You can now log in with your new password.
            </p>
            <Link
              to="/auth"
              className="inline-block w-full bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm text-center"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Reset form
  return (
    <div className="flex flex-col items-center px-5 pt-3 pb-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-sib-text">Set new password</h1>
          <p className="text-sm text-sib-muted mt-1">
            Choose a strong password for your account.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="bg-red-50 text-red-600 text-xs rounded-xl p-3">
                {errors.general}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-sib-muted mb-1.5 uppercase tracking-wide">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: null, general: null })) }}
                placeholder="Min. 6 characters"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${
                  errors.password ? 'border-red-400' : 'border-sib-stone'
                } focus:border-sib-secondary transition-colors`}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-sib-muted mb-1.5 uppercase tracking-wide">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirm: null, general: null })) }}
                placeholder="Re-enter your password"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${
                  errors.confirm ? 'border-red-400' : 'border-sib-stone'
                } focus:border-sib-secondary transition-colors`}
              />
              {errors.confirm && <p className="text-red-500 text-xs mt-1.5">{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-70 transition-opacity"
            >
              {loading ? 'Updating...' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
