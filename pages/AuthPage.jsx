import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import { supabase } from '../lib/supabase'
import { moderateUsername, moderateContent } from '../lib/moderation'

export default function AuthPage() {
  const { showToast, currentUser } = useApp()
  const { signIn, signUp, resendVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', location: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isOver18, setIsOver18] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [verificationPending, setVerificationPending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(false)

  // Determine where to redirect after login
  const getRedirectPath = () => {
    const redirectParam = searchParams.get('redirect')
    if (redirectParam && redirectParam !== '/auth') return redirectParam
    const stateFrom = location.state?.from
    if (stateFrom && stateFrom !== '/auth') return stateFrom
    return '/browse'
  }

  // If already logged in, redirect away immediately
  useEffect(() => {
    if (currentUser) {
      navigate(getRedirectPath(), { replace: true })
    }
  }, [currentUser])

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const e = {}
    if (mode === 'register' && !form.name.trim()) e.name = 'Required'
    if (mode === 'register' && !form.username.trim()) e.username = 'Required'
    if (mode === 'register' && form.username && !/^[a-z0-9._]+$/.test(form.username)) e.username = 'Only lowercase letters, numbers, . and _'
    // Moderation: check username for profanity / impersonation
    if (mode === 'register' && form.username && !e.username) {
      const usernameCheck = moderateUsername(form.username)
      if (usernameCheck.blocked) e.username = usernameCheck.reason
    }
    // Moderation: check display name
    if (mode === 'register' && form.name.trim() && !e.name) {
      const nameCheck = moderateContent(form.name, 'bio')
      if (nameCheck.blocked) e.name = 'This name is not allowed'
    }
    if (mode === 'register' && (!form.email.trim() || !form.email.includes('@'))) e.email = 'Enter a valid email'
    if (mode === 'login' && !form.email.trim()) e.email = 'Enter your email or username'
    if (!form.password) e.password = 'Required'
    if (mode === 'register' && form.password && form.password.length < 6) e.password = 'Min. 6 characters'
    if (mode === 'register' && !acceptedTerms) e.terms = 'You must accept the Terms & Privacy Policy'
    if (mode === 'register' && !isOver18) e.age = 'You must confirm you are 18 or older'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Resolve a username to an email via the profiles table (public read policy)
  const resolveEmailFromUsername = async (username) => {
    const cleaned = username.trim().toLowerCase().replace(/^@/, '')
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', cleaned)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Username lookup error:', error)
      return null
    }
    return data?.email || null
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setErrors({})

    try {
      if (mode === 'login') {
        const input = form.email.trim()
        let loginEmail = input

        // If input does not contain "@", treat it as a username
        if (!input.includes('@')) {
          const resolved = await resolveEmailFromUsername(input)
          if (!resolved) {
            setErrors({ email: 'Username not found' })
            setLoading(false)
            return
          }
          loginEmail = resolved
        }

        await signIn(loginEmail, form.password)
        setSuccess(true)
        showToast('Welcome back!')
      } else {
        const result = await signUp(form.email.trim(), form.password, {
          name: form.name.trim(),
          username: form.username.trim().toLowerCase(),
          location: form.location.trim() || 'Malta',
          accepted_terms: true,
          is_over_18: true,
        })
        if (!result?.access_token) {
          setVerificationPending(true)
        } else {
          setSuccess(true)
          showToast('Account created!')
        }
      }
    } catch (err) {
      const msg = err?.message || 'Something went wrong'
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setErrors({ email: 'Invalid email/username or password' })
      } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        setErrors({ email: 'Email already registered' })
      } else if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many')) {
        setErrors({ email: 'Too many attempts. Please wait a moment.' })
      } else {
        setErrors({ email: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (resendCooldown) return
    try {
      await resendVerification(form.email.trim())
      showToast('Verification email sent!')
      setResendCooldown(true)
      setTimeout(() => setResendCooldown(false), 60000)
    } catch (err) {
      showToast(err?.message || 'Could not resend email', 'error')
    }
  }

  // Verification pending state
  if (verificationPending) {
    return (
      <div className="flex flex-col items-center px-5 pt-3 pb-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-sib-text mb-2">Check your email</h2>
            <p className="text-sm text-sib-muted leading-relaxed mb-4">
              We've sent a confirmation link to <strong className="text-sib-text">{form.email}</strong>. Please click the link to verify your account.
            </p>
            <button
              onClick={handleResendVerification}
              disabled={resendCooldown}
              className="text-sm text-sib-secondary font-medium disabled:text-sib-muted disabled:cursor-not-allowed"
            >
              {resendCooldown ? 'Email sent — check your inbox' : 'Resend verification email'}
            </button>
            <div className="mt-5 pt-4 border-t border-sib-sand">
              <button
                onClick={() => { setVerificationPending(false); setMode('login') }}
                className="text-sm text-sib-muted hover:text-sib-secondary transition-colors"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state — brief confirmation before redirect
  if (success && currentUser) {
    return (
      <div className="flex flex-col items-center px-5 pt-3 pb-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sib-text font-semibold">
              {mode === 'login' ? 'Welcome back!' : 'Account created!'}
            </p>
          </div>
          <p className="text-sm text-sib-muted animate-pulse">Redirecting you now...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-5 pt-3 pb-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-sib-text">
            {mode === 'login' ? 'Welcome back' : 'Join Sib'}
          </h1>
          <p className="text-sm text-sib-muted mt-0.5">Malta's easiest second-hand marketplace</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Mode toggle */}
          <div className="flex bg-sib-sand rounded-xl p-1 mb-5">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}) }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                  mode === m ? 'bg-white text-sib-text shadow-sm' : 'text-sib-muted'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === 'register' && (
              <>
                <div>
                  <input
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Full name"
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.name ? 'border-red-400' : 'border-sib-stone'}`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <div className={`flex items-center border rounded-xl overflow-hidden ${errors.username ? 'border-red-400' : 'border-sib-stone'}`}>
                    <span className="pl-4 pr-1 text-sm text-sib-muted select-none">@</span>
                    <input
                      value={form.username}
                      onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="flex-1 pr-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted bg-transparent"
                    />
                  </div>
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>
              </>
            )}
            <div>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder={mode === 'login' ? 'Email or username' : 'Email address'}
                autoCapitalize="none"
                autoCorrect="off"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.email ? 'border-red-400' : 'border-sib-stone'}`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <input
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Password"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.password ? 'border-red-400' : 'border-sib-stone'}`}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-sib-secondary font-medium mt-1.5 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
          </div>

          {mode === 'register' && (
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => { setAcceptedTerms(e.target.checked); setErrors(prev => ({ ...prev, terms: null })) }}
                  className="mt-0.5 w-4 h-4 rounded border-sib-stone text-sib-secondary focus:ring-sib-secondary flex-shrink-0"
                />
                <span className="text-xs text-sib-muted leading-relaxed">
                  I agree to Sib's{' '}
                  <Link to="/terms" className="text-sib-secondary font-semibold underline underline-offset-2">Terms & Conditions</Link>,{' '}
                  <Link to="/privacy" className="text-sib-secondary font-semibold underline underline-offset-2">Privacy Policy</Link>,{' '}
                  <Link to="/buyer-protection" className="text-sib-secondary font-semibold underline underline-offset-2">Buyer Protection Policy</Link>
                  {' '}&{' '}
                  <Link to="/cookies" className="text-sib-secondary font-semibold underline underline-offset-2">Cookie Policy</Link>
                </span>
              </label>
              {errors.terms && <p className="text-red-500 text-xs ml-6.5">{errors.terms}</p>}

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOver18}
                  onChange={e => { setIsOver18(e.target.checked); setErrors(prev => ({ ...prev, age: null })) }}
                  className="mt-0.5 w-4 h-4 rounded border-sib-stone text-sib-secondary focus:ring-sib-secondary flex-shrink-0"
                />
                <span className="text-xs text-sib-muted leading-relaxed">
                  I confirm that I am 18 years of age or older
                </span>
              </label>
              {errors.age && <p className="text-red-500 text-xs ml-6.5">{errors.age}</p>}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-5 bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-70"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>


        </div>
      </div>
    </div>
  )
}
