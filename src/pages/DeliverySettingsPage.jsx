import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Truck, Package, Trash2, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import useSavedAddress from '../hooks/useSavedAddress'
import { DELIVERY_METHODS } from '../data/deliveryConfig'

export default function DeliverySettingsPage() {
  const navigate = useNavigate()
  const { currentUser, showToast } = useApp()
  const { savedAddress, hasSavedAddress, saveAddress, clearAddress, loading } = useSavedAddress(currentUser?.id)

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    notes: '',
    deliveryMethod: 'home_delivery',
  })
  const [saving, setSaving] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    if (savedAddress && !prefilled) {
      setForm({
        fullName: savedAddress.fullName || '',
        phone: savedAddress.phone || '',
        address: savedAddress.address || '',
        city: savedAddress.city || '',
        postcode: savedAddress.postcode || '',
        notes: savedAddress.notes || '',
        deliveryMethod: savedAddress.deliveryMethod || 'home_delivery',
      })
      setPrefilled(true)
    }
  }, [savedAddress, prefilled])

  if (!currentUser) { navigate('/auth'); return null }

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.address.trim()) {
      showToast('Street address is required.', 'error')
      return
    }
    if (!form.city.trim()) {
      showToast('City / town is required.', 'error')
      return
    }
    if (!form.postcode.trim()) {
      showToast('Postcode is required.', 'error')
      return
    }
    setSaving(true)
    try {
      await saveAddress(form)
      showToast('Delivery details saved!')
      navigate(-1)
    } catch {
      showToast('Failed to save. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    await clearAddress()
    setForm({
      fullName: '',
      phone: '',
      address: '',
      city: '',
      postcode: '',
      notes: '',
      deliveryMethod: 'home_delivery',
    })
    showToast('Saved address removed.')
  }

  const deliveryOptions = DELIVERY_METHODS.filter(m => m.active)

  if (loading) {
    return (
      <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-200 dark:bg-[#26322f] rounded" />
          <div className="h-12 bg-gray-200 dark:bg-[#26322f] rounded-xl" />
          <div className="h-12 bg-gray-200 dark:bg-[#26322f] rounded-xl" />
          <div className="h-12 bg-gray-200 dark:bg-[#26322f] rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted dark:text-[#aeb8b4] text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2 mb-1">
        <MapPin size={20} className="text-sib-primary" />
        <h1 className="text-xl font-bold text-sib-text dark:text-[#f4efe7]">Delivery Details</h1>
      </div>
      <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mb-6">Your saved address will be pre-filled at checkout.</p>

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-1.5 block">Full Name</label>
          <input
            value={form.fullName}
            onChange={e => set('fullName', e.target.value)}
            placeholder="Your full name"
            className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl px-4 py-3 text-sm outline-none text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] bg-white dark:bg-[#26322f] focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 transition-colors"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-1.5 block">Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+356 9999 1234"
            inputMode="tel"
            className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl px-4 py-3 text-sm outline-none text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] bg-white dark:bg-[#26322f] focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 transition-colors"
          />
          <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-1">For delivery driver contact only</p>
        </div>

        {/* Street Address */}
        <div>
          <label className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-1.5 block">
            Street Address <span className="text-red-400">*</span>
          </label>
          <input
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="Street address"
            className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl px-4 py-3 text-sm outline-none text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] bg-white dark:bg-[#26322f] focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 transition-colors"
          />
        </div>

        {/* City + Postcode */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-1.5 block">
              City / Town <span className="text-red-400">*</span>
            </label>
            <input
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="City / Town"
              className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl px-4 py-3 text-sm outline-none text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] bg-white dark:bg-[#26322f] focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 transition-colors"
            />
          </div>
          <div className="w-28">
            <label className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-1.5 block">
              Postcode <span className="text-red-400">*</span>
            </label>
            <input
              value={form.postcode}
              onChange={e => set('postcode', e.target.value.toUpperCase())}
              placeholder="Postcode"
              maxLength={8}
              className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl px-4 py-3 text-sm outline-none text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] bg-white dark:bg-[#26322f] focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 transition-colors"
            />
          </div>
        </div>

        {/* Delivery Notes */}
        <div>
          <label className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-1.5 block">Delivery Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="e.g. Ring the bell, leave at the door..."
            className="w-full border border-sib-stone dark:border-[rgba(242,238,231,0.10)] rounded-xl px-4 py-3 text-sm outline-none text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] bg-white dark:bg-[#26322f] resize-none focus:border-sib-primary focus:ring-1 focus:ring-sib-primary/20 transition-colors"
          />
        </div>

        {/* Preferred Delivery Method */}
        <div>
          <label className="text-xs font-semibold text-sib-text dark:text-[#f4efe7] uppercase tracking-wide mb-2 block">Preferred Delivery Method</label>
          <div className="space-y-2">
            {deliveryOptions.map(method => (
              <button
                key={method.id}
                type="button"
                onClick={() => set('deliveryMethod', method.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  form.deliveryMethod === method.id
                    ? 'border-sib-primary bg-sib-primary/5 dark:bg-[#26322f] ring-1 ring-sib-primary/20'
                    : 'border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28]'
                }`}
              >
                {method.id === 'home_delivery' ? (
                  <Truck size={18} className={form.deliveryMethod === method.id ? 'text-sib-primary' : 'text-sib-muted dark:text-[#aeb8b4]'} />
                ) : (
                  <Package size={18} className={form.deliveryMethod === method.id ? 'text-sib-primary' : 'text-sib-muted dark:text-[#aeb8b4]'} />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${form.deliveryMethod === method.id ? 'text-sib-primary' : 'text-sib-text dark:text-[#f4efe7]'}`}>
                    {method.label || method.name}
                  </p>
                  {method.estimatedDays && (
                    <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4]">{method.estimatedDays}</p>
                  )}
                </div>
                {form.deliveryMethod === method.id && (
                  <Check size={16} className="text-sib-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        {hasSavedAddress && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl border border-red-200 dark:border-red-500/20 text-sm font-medium text-red-600 dark:text-red-300 bg-red-50 dark:bg-[#362322] active:bg-red-100 dark:active:bg-[#42302e] transition-colors"
          >
            <Trash2 size={14} /> Clear
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-sib-secondary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-70 active:scale-[0.98] transition-transform"
        >
          {saving ? 'Saving...' : 'Save Delivery Details'}
        </button>
      </div>
    </div>
  )
}
