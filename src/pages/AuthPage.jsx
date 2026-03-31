import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function AuthPage() {
  const { login, register, showToast } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', location: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const e = {}
    if (mode === 'register' && !form.name.trim()) e.name = 'Required'
    if (mode === 'register' && !form.username.trim()) e.username = 'Required'
    if (mode === 'register' && form.username && !/^[a-z0-9._]+$/.test(form.username)) e.username = 'Only lowercase letters, numbers, . and _'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Required'
    if (mode === 'register' && form.password && form.password.length < 6) e.password = 'Min. 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))

    if (mode === 'login') {
      const success = login(form.email, form.password)
      if (!success) {
        setErrors({ email: 'Invalid email or password' })
        setLoading(false)
        return
      }
      showToast('Welcome back!')
    } else {
      const result = register(form)
      if (!result) {
        setErrors({ email: 'Email already registered' })
        setLoading(false)
        return
      }
      if (result === 'username_taken') {
        setErrors({ username: 'Username already taken' })
        setLoading(false)
        return
      }
      showToast('Account created!')
    }
    setLoading(false)
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-sib-warm flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
            alt="Sib"
            className="h-24 w-auto mx-auto mb-4"
          />
          <h1 className="text-xl font-bold text-sib-text">
            {mode === 'login' ? 'Welcome back' : 'Join Sib'}
          </h1>
          <p className="text-sm text-sib-muted mt-1">Malta's second-hand marketplace</p>
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
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="Email address"
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
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-5 bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-70"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>

          {/* Demo accounts */}
          <div className="mt-5 pt-4 border-t border-sib-stone">
            <p className="text-xs text-sib-muted text-center mb-3 font-medium">Demo accounts (any password)</p>
            {[
              { label: 'Maria', email: 'maria@example.com' },
              { label: 'Gozo Vintage', email: 'gozo@example.com' },
              { label: 'Admin', email: 'admin@sib.mt' },
            ].map(demo => (
              <button
                key={demo.email}
                onClick={() => {
                  setForm({ ...form, email: demo.email, password: 'demo' })
                  setMode('login')
                }}
                className="w-full mb-2 py-2.5 border border-sib-stone rounded-xl text-xs font-medium text-sib-text"
              >
                Use {demo.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
