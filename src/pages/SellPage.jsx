import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, X, Info, ImagePlus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getSizesForCategory, MEN_SUB_TYPES, usesWaistLength, formatWL, WAIST_SIZES, LENGTH_SIZES } from '../utils/sizeConfig'
import FeeBreakdown from '../components/FeeBreakdown'

const CATEGORIES = ['women', 'men', 'kids', 'shoes', 'vintage', 'accessories']
const CONDITIONS = [
  { value: 'new', label: 'New', desc: 'Never worn, with tags' },
  { value: 'likeNew', label: 'Like New', desc: 'Worn once or twice' },
  { value: 'good', label: 'Good', desc: 'Some light wear' },
  { value: 'fair', label: 'Fair', desc: 'Noticeable wear' },
]

function resizeImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = (h * maxWidth) / w
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function SellPage() {
  const { currentUser, createListing, calculateFees, showToast } = useApp()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

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
  const [uploading, setUploading] = useState(false)
  const [menSubType, setMenSubType] = useState('')
  const [waist, setWaist] = useState('')
  const [length, setLength] = useState('')

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const remaining = 4 - form.images.length
    const toProcess = files.slice(0, remaining)

    setUploading(true)
    try {
      const results = await Promise.all(
        toProcess.map(file => {
          if (file.size > 10 * 1024 * 1024) {
            showToast('Image must be under 10 MB.', 'error')
            return null
          }
          return resizeImage(file)
        })
      )
      const valid = results.filter(Boolean)
      if (valid.length > 0) {
        set('images', [...form.images, ...valid])
      }
    } catch {
      showToast('Failed to process image.', 'error')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-sib-stone flex flex-col items-center justify-center gap-1 text-sib-muted disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="text-[10px]">Loading...</span>
                  ) : (
                    <>
                      <Camera size={20} />
                      <span className="text-[10px]">Add photo</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                capture="environment"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
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
                    setMenSubType('')
                    setWaist('')
                    setLength('')
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

          {/* Men's sub-type selector */}
          {form.category === 'men' && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {MEN_SUB_TYPES.map(st => (
                  <button
                    key={st.value}
                    onClick={() => {
                      setMenSubType(st.value)
                      setWaist('')
                      setLength('')
                      set('size', '')
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      menSubType === st.value ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size — driven by category */}
          {form.category && (
            <div className="mb-4">
              {/* Men + W/L sub-type: show waist & length pickers */}
              {form.category === 'men' && usesWaistLength(menSubType) ? (
                <>
                  <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                    Waist & Length
                  </label>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-sib-muted mb-1.5">Waist</p>
                      <div className="flex flex-wrap gap-2">
                        {WAIST_SIZES.map(w => (
                          <button
                            key={w}
                            onClick={() => {
                              setWaist(w)
                              const newSize = formatWL(w, length)
                              set('size', newSize)
                            }}
                            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                              waist === w ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
                            }`}
                          >
                            W{w}
                          </button>
                        ))}
                      </div>
                    </div>
                    {menSubType === 'trousers' && (
                      <div>
                        <p className="text-xs text-sib-muted mb-1.5">Length</p>
                        <div className="flex flex-wrap gap-2">
                          {LENGTH_SIZES.map(l => (
                            <button
                              key={l}
                              onClick={() => {
                                setLength(l)
                                const newSize = formatWL(waist, l)
                                set('size', newSize)
                              }}
                              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                                length === l ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
                              }`}
                            >
                              L{l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {form.size && (
                      <p className="text-xs text-sib-muted">Selected: <span className="font-semibold text-sib-text">{form.size}</span></p>
                    )}
                  </div>
                </>
              ) : (
                <>
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
                </>
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
