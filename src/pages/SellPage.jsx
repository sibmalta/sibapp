import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, X, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getSizesForCategory } from '../utils/sizeConfig'
import FeeBreakdown from '../components/FeeBreakdown'

const CATEGORIES = ['women', 'men', 'kids', 'shoes', 'vintage', 'accessories']
const CONDITIONS = [
  { value: 'new', label: 'New', desc: 'Never worn, with tags' },
  { value: 'likeNew', label: 'Like New', desc: 'Worn once or twice' },
  { value: 'good', label: 'Good', desc: 'Some light wear' },
  { value: 'fair', label: 'Fair', desc: 'Noticeable wear' },
]

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80',
  'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=600&q=80',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80',
  'https://images.unsplash.com/photo-1566206091558-7f218b696731?w=600&q=80',
]

export default function SellPage() {
  const { currentUser, createListing, calculateFees, showToast } = useApp()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    gender: '',
    size: '',
    brand: '',
    condition: '',
    images: [],
  })
  const [errors, setErrors] = useState({})
  const [step, setStep] = useState(1)

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  const addImage = () => {
    if (form.images.length >= 4) return
    const url = PLACEHOLDER_IMAGES[form.images.length % PLACEHOLDER_IMAGES.length]
    set('images', [...form.images, url])
  }

  const removeImage = (i) => {
    set('images', form.images.filter((_, idx) => idx !== i))
  }

  const validateStep1 = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Required'
    if (form.images.length === 0) e.images = 'Add at least one photo'
    if (!form.category) e.category = 'Required'
    if (!form.condition) e.condition = 'Required'
    if (!form.brand.trim()) e.brand = 'Required'
    if (form.category && form.category !== 'accessories' && !form.size) e.size = 'Select a size'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e = {}
    if (!form.price || isNaN(form.price) || Number(form.price) < 1) e.price = 'Enter a valid price'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) setStep(2)
  }

  const handleSubmit = () => {
    if (!validateStep2()) return
    const listing = createListing({
      ...form,
      price: parseFloat(form.price),
    })
    showToast('Listing published!')
    navigate(`/listing/${listing.id}`)
  }

  const fees = form.price && !isNaN(form.price) ? calculateFees(parseFloat(form.price)) : null

  return (
    <div className="px-4 py-5">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1 rounded-full bg-sib-stone overflow-hidden">
          <div className={`h-full bg-sib-primary rounded-full transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>
        <span className="text-xs text-sib-muted font-medium">Step {step} of 2</span>
      </div>

      {step === 1 ? (
        <>
          <h2 className="text-xl font-bold text-sib-text mb-5">Photos & Details</h2>

          {/* Photos */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-2 block">Photos</label>
            <div className="flex gap-2 flex-wrap">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-sib-sand">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X size={11} className="text-white" />
                  </button>
                </div>
              ))}
              {form.images.length < 4 && (
                <button
                  onClick={addImage}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-sib-stone flex flex-col items-center justify-center gap-1 text-sib-muted"
                >
                  <Camera size={20} />
                  <span className="text-[10px]">Add photo</span>
                </button>
              )}
            </div>
            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Title</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Vintage Levi's Denim Jacket"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.title ? 'border-red-400' : 'border-sib-stone'}`}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the item — material, fit, any flaws..."
              rows={3}
              className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted resize-none"
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setForm(prev => ({ ...prev, category: c, size: '', gender: c === 'women' || c === 'men' || c === 'kids' ? c : prev.gender }))
                    setErrors(prev => ({ ...prev, category: null }))
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                    form.category === c ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Size — driven by category */}
          {form.category && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                Size
                <span className="ml-1.5 text-sib-muted font-normal normal-case capitalize">({form.category === 'shoes' ? 'EU' : form.category})</span>
              </label>
              {form.category === 'accessories' ? (
                <p className="text-xs text-sib-muted italic">One Size — automatically applied.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {getSizesForCategory(form.category).map(s => (
                    <button
                      key={s}
                      onClick={() => set('size', s)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                        form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
            </div>
          )}

          {/* Gender — only show for shoes/vintage/accessories where category doesn't imply it */}
          {['shoes', 'vintage', 'accessories'].includes(form.category) && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Gender</label>
              <div className="flex gap-2">
                {['women', 'men', 'unisex'].map(g => (
                  <button
                    key={g}
                    onClick={() => set('gender', g)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                      form.gender === g ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Condition */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Condition</label>
            <div className="flex flex-col gap-2">
              {CONDITIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => set('condition', c.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                    form.condition === c.value
                      ? 'border-sib-primary bg-sib-primary/5'
                      : 'border-sib-stone'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    form.condition === c.value ? 'border-sib-primary bg-sib-primary' : 'border-sib-stone'
                  }`} />
                  <div>
                    <p className="text-sm font-semibold text-sib-text">{c.label}</p>
                    <p className="text-xs text-sib-muted">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition}</p>}
          </div>

          {/* Brand */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Brand</label>
            <input
              value={form.brand}
              onChange={e => set('brand', e.target.value)}
              placeholder="e.g. Zara, Nike, Levi's, No Brand..."
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.brand ? 'border-red-400' : 'border-sib-stone'}`}
            />
            {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-sib-secondary text-white font-bold py-4 rounded-2xl text-sm"
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold text-sib-text mb-5">Price & Shipping</h2>

          {/* Price */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Listing price (€)</label>
            <div className={`flex items-center border rounded-xl overflow-hidden ${errors.price ? 'border-red-400' : 'border-sib-stone'}`}>
              <span className="px-4 text-sib-muted font-bold text-base">€</span>
              <input
                type="number"
                min={1}
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0.00"
                className="flex-1 py-3 text-sm outline-none text-sib-text"
              />
            </div>
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          {/* Fee breakdown */}
          {fees && (
            <div className="p-4 rounded-2xl bg-sib-warm mb-4 text-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <Info size={13} className="text-sib-muted" />
                <p className="text-xs font-semibold text-sib-muted">What the buyer pays</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sib-muted text-xs">
                  <span>Listing price</span>
                  <span>€{parseFloat(form.price).toFixed(2)}</span>
                </div>
                <FeeBreakdown
                  bundledFee={fees.bundledFee}
                  deliveryFee={fees.deliveryFee}
                  buyerProtectionFee={fees.buyerProtectionFee}
                  size="sm"
                  defaultOpen
                />
                <div className="flex justify-between text-sib-text font-bold pt-2 border-t border-sib-stone">
                  <span>Buyer pays total</span>
                  <span>€{fees.total.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-sib-muted leading-tight">Lower-priced items may feel more expensive to buyers once delivery is included.</p>
                <div className="flex justify-between text-sib-text font-bold pt-2 border-t border-sib-stone">
                  <span>You receive</span>
                  <span className="text-sib-primary">€{parseFloat(form.price).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Shipping note */}
          <div className="p-4 rounded-2xl bg-blue-50 mb-5">
            <p className="text-xs text-blue-800 font-medium">📦 All orders are shipped via Sib Tracked Delivery (MaltaPost/Courier). No meetups or cash deals.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-shrink-0 px-5 py-4 rounded-2xl border border-sib-stone text-sm font-medium text-sib-text"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-sib-secondary text-white font-bold py-4 rounded-2xl text-sm"
            >
              Publish Listing
            </button>
          </div>
        </>
      )}
    </div>
  )
}
