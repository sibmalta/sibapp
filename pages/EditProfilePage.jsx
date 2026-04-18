import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ChevronDown, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../lib/auth-context'
import UserAvatar from '../components/UserAvatar'
import { moderateContent, moderateUsername } from '../lib/moderation'

const CALLING_CODES = [
  { code: '+356', country: 'MT', label: 'Malta' },
  { code: '+44', country: 'GB', label: 'UK' },
  { code: '+39', country: 'IT', label: 'Italy' },
  { code: '+33', country: 'FR', label: 'France' },
  { code: '+49', country: 'DE', label: 'Germany' },
  { code: '+34', country: 'ES', label: 'Spain' },
  { code: '+1', country: 'US', label: 'US/Canada' },
  { code: '+61', country: 'AU', label: 'Australia' },
  { code: '+91', country: 'IN', label: 'India' },
  { code: '+971', country: 'AE', label: 'UAE' },
]

function parsePhone(fullPhone) {
  if (!fullPhone) return { callingCode: '+356', number: '' }
  for (const c of CALLING_CODES) {
    if (fullPhone.startsWith(c.code)) {
      return { callingCode: c.code, number: fullPhone.slice(c.code.length).trim() }
    }
  }
  return { callingCode: '+356', number: fullPhone }
}

export default function EditProfilePage() {
  const { currentUser, updateProfile, showToast } = useApp()
  const { updateUserMetadata } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [saving, setSaving] = useState(false)

  const parsed = parsePhone(currentUser?.phone)

  const [form, setForm] = useState({
    name: currentUser?.name || '',
    bio: currentUser?.bio || '',
    email: currentUser?.email || '',
    callingCode: parsed.callingCode,
    phoneNumber: parsed.number,
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [showCodes, setShowCodes] = useState(false)

  if (!currentUser) { navigate('/auth'); return null }

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5 MB.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast('Name is required.', 'error')
      return
    }
    // Moderation: check name and bio
    const nameCheck = moderateContent(form.name, 'bio')
    if (nameCheck.blocked) {
      showToast('Your name contains inappropriate language.', 'error')
      return
    }
    if (form.bio.trim()) {
      const bioCheck = moderateContent(form.bio, 'bio')
      if (bioCheck.blocked) {
        showToast('Your bio contains inappropriate language.', 'error')
        return
      }
    }
    const updates = {
      name: form.name.trim(),
      bio: form.bio.trim(),
      phone: form.phoneNumber ? `${form.callingCode}${form.phoneNumber.replace(/\s/g, '')}` : '',
    }
    if (avatarPreview) {
      updates.avatar = avatarPreview
    }

    setSaving(true)
    try {
      // Persist to Supabase Auth user_metadata (survives session restores)
      await updateUserMetadata(updates)
      // Also update local users array for marketplace display
      updateProfile(updates)
      showToast('Profile updated!')
      navigate('/profile')
    } catch (err) {
      showToast(err?.message || 'Failed to save profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const selectedCode = CALLING_CODES.find(c => c.code === form.callingCode) || CALLING_CODES[0]
  const displayAvatar = avatarPreview || currentUser?.avatar

  return (
    <div className="px-4 py-5 pb-10">
      <h2 className="text-xl font-bold text-sib-text mb-5">Edit Profile</h2>

      <div className="space-y-5">
        {/* Profile picture */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={currentUser.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-sib-stone"
              />
            ) : (
              <UserAvatar user={currentUser} size="xl" />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-sib-primary text-white flex items-center justify-center shadow-md border-2 border-white"
            >
              <Camera size={14} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
          {avatarPreview && (
            <button
              type="button"
              onClick={removeAvatar}
              className="text-xs text-red-500 font-medium flex items-center gap-1"
            >
              <X size={12} /> Remove new photo
            </button>
          )}
          <p className="text-[11px] text-sib-muted">Tap the camera icon to change your photo</p>
        </div>

        {/* Full Name */}
        <div>
          <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text focus:border-sib-primary"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Bio</label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            rows={3}
            placeholder="Tell buyers about your style..."
            className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted resize-none focus:border-sib-primary"
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
            Email Address
          </label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="your@email.com"
            className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted focus:border-sib-primary"
          />
        </div>

        {/* Phone with calling code */}
        <div>
          <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
            Telephone Number
          </label>
          <div className="flex gap-2">
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCodes(!showCodes)}
                className="flex items-center gap-1.5 border border-sib-stone rounded-xl px-3 py-3 text-sm text-sib-text bg-white min-w-[100px] focus:border-sib-primary"
              >
                <span className="font-medium">{selectedCode.country}</span>
                <span className="text-sib-muted">{selectedCode.code}</span>
                <ChevronDown size={13} className="text-sib-muted ml-auto" />
              </button>
              {showCodes && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowCodes(false)} />
                  <div className="absolute z-30 left-0 top-full mt-1 bg-white border border-sib-stone rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto w-52">
                    {CALLING_CODES.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { set('callingCode', c.code); setShowCodes(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                          c.code === form.callingCode
                            ? 'bg-sib-primary/10 text-sib-primary font-semibold'
                            : 'text-sib-text active:bg-sib-sand'
                        }`}
                      >
                        <span className="font-medium w-7">{c.country}</span>
                        <span className="text-sib-muted">{c.code}</span>
                        <span className="text-xs text-sib-muted ml-auto">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={e => set('phoneNumber', e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder="9999 1234"
              inputMode="tel"
              className="flex-1 border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted focus:border-sib-primary"
            />
          </div>
          <p className="text-[11px] text-sib-muted mt-1">Your phone number and email are only visible to Sib admins for verification purposes. They are never shared with buyers or sellers.</p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex-shrink-0 px-5 py-3.5 rounded-2xl border border-sib-stone text-sm font-medium text-sib-text"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
