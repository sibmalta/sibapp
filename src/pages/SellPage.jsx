import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, X, Info, Check, ChevronDown, Search, Package, Truck,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CATEGORY_TREE, getSubcategories, getCategoryAttributes, isDeliveryEligible } from '../data/categories'
import FeeBreakdown from '../components/FeeBreakdown'
import DeliveryGuidance from '../components/DeliveryGuidance'
import BrandInput from '../components/BrandInput'
import { normalizeBrand } from '../lib/brands'
import { moderateContent } from '../lib/moderation'
import { DELIVERY_TIERS, getDefaultDeliverySize, getAllowedTiers, getDeliveryFee, BULKY_DELIVERY_NOTES, isForceBulky, SIZE_ACCURACY_WARNING, titleSuggestsBulky } from '../lib/deliveryPricing'

/* ── Static data ────────────────────────────────────────────── */

const CONDITIONS = [
  { value: 'new', label: 'New', desc: 'Never worn / unused, with tags' },
  { value: 'likeNew', label: 'Like New', desc: 'Used once or twice' },
  { value: 'good', label: 'Good', desc: 'Some light wear' },
  { value: 'fair', label: 'Fair', desc: 'Noticeable wear' },
]

const COLOURS = [
  { label: 'Black', value: 'black', hex: '#1a1a1a' },
  { label: 'White', value: 'white', hex: '#FFFFFF', border: true },
  { label: 'Grey', value: 'grey', hex: '#9CA3AF' },
  { label: 'Blue', value: 'blue', hex: '#3B82F6' },
  { label: 'Red', value: 'red', hex: '#EF4444' },
  { label: 'Green', value: 'green', hex: '#22C55E' },
  { label: 'Beige', value: 'beige', hex: '#D4C5A9' },
  { label: 'Brown', value: 'brown', hex: '#92400E' },
  { label: 'Pink', value: 'pink', hex: '#EC4899' },
  { label: 'Orange', value: 'orange', hex: '#F97316' },
  { label: 'Yellow', value: 'yellow', hex: '#EAB308' },
  { label: 'Purple', value: 'purple', hex: '#A855F7' },
  { label: 'Multi', value: 'multi', hex: 'conic-gradient(red, yellow, green, blue, red)', isGradient: true },
]

const GENDERS = ['women', 'men', 'unisex']

const KIDS_GENDERS = ['boy', 'girl', 'unisex']

const CLOTHING_SIZES = {
  women: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
  men: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  kids: ['2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '8-9Y', '9-10Y', '10-11Y', '11-12Y', '12-13Y', '13-14Y'],
  unisex: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
}

const KIDS_AGE_SIZES = [
  '0-3 months', '3-6 months', '6-9 months', '9-12 months',
  '1-2 years', '2-3 years', '3-4 years', '4-5 years',
  '5-6 years', '6-7 years', '7-8 years', '8-9 years',
  '9-10 years', '10-12 years', '12-14 years',
]

const SHOE_SIZES = Array.from({ length: 17 }, (_, i) => String(i + 34))

const WAIST_SIZES = ['W24', 'W25', 'W26', 'W27', 'W28', 'W29', 'W30', 'W31', 'W32', 'W33', 'W34', 'W36', 'W38', 'W40']

const BELT_SIZES = ['XS', 'S', 'M', 'L', 'XL']

const LENGTH_SIZES = ['L28', 'L29', 'L30', 'L31', 'L32', 'L33', 'L34', 'L36']

const WOMEN_EU_SIZES_SELL = ['34', '36', '38', '40', '42', '44', '46']

// Subcategories that use waist sizing (+ length)
const WAIST_SUBCATEGORIES = ['jeans', 'trousers']
// Subcategories that use shoe sizing
const SHOE_SUBCATEGORIES_SELL = ['shoes']
// Subcategories with NO size at all
const NO_SIZE_SUBCATEGORIES = ['bags', 'jewellery', 'sunglasses', 'wallets', 'scarves', 'hats']
// Belt has its own sizing (XS–XL)
const BELT_SUBCATEGORIES = ['belts']
// Watches keep "One Size" (they genuinely are)
const WATCH_SUBCATEGORIES = ['watches']

/**
 * Determine which size group to show for a fashion subcategory.
 * Returns: 'clothing' | 'shoe' | 'waist' | 'no_size' | 'belt' | 'watch'
 */
function getFashionSizeType(subcategory) {
  if (!subcategory) return 'clothing'
  if (SHOE_SUBCATEGORIES_SELL.includes(subcategory)) return 'shoe'
  if (WAIST_SUBCATEGORIES.includes(subcategory)) return 'waist'
  if (NO_SIZE_SUBCATEGORIES.includes(subcategory)) return 'no_size'
  if (BELT_SUBCATEGORIES.includes(subcategory)) return 'belt'
  if (WATCH_SUBCATEGORIES.includes(subcategory)) return 'watch'
  return 'clothing'
}

const SPORTS_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']

const AGE_GROUPS = ['0-2', '3-5', '6-8', '9-12', '13+', 'Adult']

const LANGUAGES = ['English', 'Maltese', 'Italian', 'French', 'German', 'Spanish', 'Other']

const BOOK_FORMATS = ['Paperback', 'Hardcover', 'E-book', 'Audiobook', 'Comic / Graphic', 'Other']


/* ── Category-aware placeholder & guidance text ─────────────── */

const TITLE_PLACEHOLDERS = {
  fashion: 'e.g. Vintage Levi\'s Denim Jacket',
  electronics: 'e.g. iPhone 14 Pro Max 256GB Space Black',
  books: 'e.g. "Sapiens" by Yuval Noah Harari — Paperback',
  sports: 'e.g. Wilson Tennis Racquet Pro Staff 97',
  home: 'e.g. Le Creuset Cast Iron Dutch Oven 24cm',
  furniture: 'e.g. IKEA KALLAX Shelving Unit — White',
  toys: 'e.g. LEGO Star Wars Millennium Falcon 75375',
  kids: 'e.g. Next Baby Sleepsuit Set 3-6 Months',
}

const DESCRIPTION_PLACEHOLDERS = {
  fashion: 'Describe the item — material, fit, any flaws, when purchased...',
  electronics: 'Describe the device — specs, battery health, any scratches or damage, included accessories...',
  books: 'Describe the book — condition of pages and spine, any highlighting or notes, edition...',
  sports: 'Describe the equipment — how long used, any wear or damage, what sport it suits...',
  home: 'Describe the item — material, dimensions if relevant, any marks or wear...',
  furniture: 'Describe the piece — material, dimensions, weight, any scratches or stains, assembly required...',
  toys: 'Describe the toy/game — completeness (all pieces included?), age suitability, any wear...',
  kids: 'Describe the item — age suitability, any stains or wear, whether from a pet-free / smoke-free home...',
}

const PHOTO_GUIDANCE = {
  fashion: 'Show front, back, label, and any flaws. Flat lay or hanger shots work best.',
  electronics: 'Show the screen, body, ports, and any scratches. Include charger/accessories if included.',
  books: 'Show the front cover, spine, and back. Photograph any damage, yellowing, or annotations.',
  sports: 'Show the full item, close-up of any wear, and brand/model markings.',
  home: 'Show the item from multiple angles. Include close-ups of material and any imperfections.',
  furniture: 'Show the full piece, close-ups of material/finish, and any scratches or damage. Include a size reference if possible.',
  toys: 'Show the item and all included pieces. Highlight the box if available and any wear.',
  kids: 'Show the full item, any labels with size/age, and close-ups of any stains or wear.',
}

const BRAND_PLACEHOLDERS = {
  fashion: "e.g. Zara, Nike, Levi's, No Brand...",
  electronics: 'e.g. Apple, Samsung, Sony, Dell...',
  sports: 'e.g. Nike, Adidas, Wilson, Decathlon...',
  home: 'e.g. IKEA, Villeroy & Boch, Le Creuset...',
  furniture: 'e.g. IKEA, Habitat, Maisons du Monde...',
  toys: 'e.g. LEGO, Playmobil, Fisher-Price, Hasbro...',
  kids: "e.g. Next, H&M, Zara Kids, Carter's...",
  books: 'e.g. Penguin, HarperCollins, Self-Published...',
}

/* ── Image resize helper ────────────────────────────────────── */

function resizeImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth }
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

/* ── Searchable inline dropdown ─────────────────────────────── */

function InlineDropdown({ label, placeholder, value, options, onChange, error, searchable = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && searchable && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50)
    if (!open) setQuery('')
  }, [open, searchable])

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  const selectedLabel = options.find(o => o.value === value)?.label

  return (
    <div className="mb-4" ref={ref}>
      <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-sm text-left transition-colors ${
          error ? 'border-red-400' : open ? 'border-sib-primary' : 'border-sib-stone'
        } ${selectedLabel ? 'text-sib-text' : 'text-sib-muted'}`}
      >
        <span className={selectedLabel ? 'font-medium' : ''}>{selectedLabel || placeholder}</span>
        <ChevronDown size={16} className={`text-sib-muted transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-1 border border-sib-stone rounded-xl bg-white shadow-lg overflow-hidden z-30 relative max-h-60 overflow-y-auto">
          {searchable && (
            <div className="sticky top-0 bg-white border-b border-sib-stone/50 px-3 py-2 flex items-center gap-2">
              <Search size={14} className="text-sib-muted flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 text-sm outline-none text-sib-text placeholder-sib-muted bg-transparent"
              />
            </div>
          )}
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-xs text-sib-muted">No results</p>
          )}
          {filtered.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                value === o.value
                  ? 'bg-sib-primary/10 text-sib-primary font-semibold'
                  : 'text-sib-text hover:bg-sib-sand/50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────── */

export default function SellPage() {
  const { currentUser, createListing, calculateFees, showToast } = useApp()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // 2-step flow: 0 = Photos & Details (with inline category), 1 = Price & Delivery
  const [step, setStep] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    title: '', description: '', price: '',
    category: '', subcategory: '',
    gender: '', size: '', trouser_length: '', brand: '', condition: '',
    colors: [], images: [],
    model: '', material: '', author: '',
    isbn: '', language: '', sport: '', age_group: '', dimensions: '',
    format: '', power_info: '', assembly_required: '',
    deliverySize: '',
    onePersonCarry: null, // null = unanswered, true/false = answered
  })

  useEffect(() => {
    if (!currentUser) navigate('/auth')
  }, [currentUser, navigate])

  if (!currentUser) return null

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleCategoryChange = (catId) => {
    const forceBulky = isForceBulky(catId, '')
    setForm(prev => ({
      ...prev, category: catId, subcategory: '', size: '', trouser_length: '', gender: '',
      brand: '', model: '', material: '', author: '',
      isbn: '', language: '', sport: '', age_group: '', dimensions: '',
      format: '', power_info: '', assembly_required: '', colors: [],
      deliverySize: getDefaultDeliverySize(catId, ''),
      onePersonCarry: forceBulky ? false : null,
    }))
    setErrors(prev => ({ ...prev, category: null, subcategory: null, images: null }))
  }

  const handleTypeChange = (subId) => {
    set('subcategory', subId)
    set('size', '')
    set('trouser_length', '')
    const forceBulky = isForceBulky(form.category, subId)
    const newDefault = getDefaultDeliverySize(form.category, subId)
    setForm(prev => ({
      ...prev,
      subcategory: subId,
      size: '',
      trouser_length: '',
      deliverySize: newDefault,
      onePersonCarry: forceBulky ? false : prev.onePersonCarry,
    }))
  }

  const subcategories = form.category ? getSubcategories(form.category) : []
  const attributes = form.category ? getCategoryAttributes(form.category) : []
  const deliveryEligible = form.category ? isDeliveryEligible(form.category) : true

  const isKidsCategory = form.category === 'kids'
  const isFashionCategory = form.category === 'fashion'
  const fashionSizeType = isFashionCategory ? getFashionSizeType(form.subcategory) : null
  const needsFashionSize = isFashionCategory && attributes.includes('size') && !!form.subcategory
  const needsShoeSize = !isFashionCategory && attributes.includes('shoe_size') && form.subcategory === 'shoes'
  const needsClothingSize = !isFashionCategory && attributes.includes('size') && !needsShoeSize && form.category !== 'sports'
  const needsKidsSize = attributes.includes('kids_size')
  const needsKidsGender = attributes.includes('kids_gender')

  const categoryOptions = useMemo(() => CATEGORY_TREE.map(c => ({ value: c.id, label: c.label })), [])
  const typeOptions = useMemo(() => subcategories.map(s => ({ value: s.id, label: s.label })), [subcategories])

  /* ── Image handling ────────────────────────────────────────── */

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const toProcess = files.slice(0, 4 - form.images.length)
    setUploading(true)
    try {
      const results = await Promise.all(
        toProcess.map(file => {
          if (file.size > 10 * 1024 * 1024) { showToast('Image must be under 10 MB.', 'error'); return null }
          return resizeImage(file)
        })
      )
      const valid = results.filter(Boolean)
      if (valid.length > 0) set('images', [...form.images, ...valid])
    } catch { showToast('Failed to process image.', 'error') }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (i) => set('images', form.images.filter((_, idx) => idx !== i))

  /* ── Validation ────────────────────────────────────────────── */

  const validateStep0 = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Required'
    if (form.title.trim() && !e.title) {
      const tc = moderateContent(form.title, 'title')
      if (tc.blocked) e.title = 'This title contains inappropriate language'
    }
    if (form.description.trim()) {
      const dc = moderateContent(form.description, 'description')
      if (dc.blocked) e.description = 'Your description contains inappropriate language'
    }
    if (form.images.length === 0) e.images = 'Add at least one photo'
    if (!form.condition) e.condition = 'Required'
    if (attributes.includes('brand') && !form.brand.trim()) e.brand = 'Required'
    if (needsFashionSize && !form.size) {
      const sizeType = getFashionSizeType(form.subcategory)
      if (sizeType === 'no_size' || sizeType === 'watch') {
        // no_size subcategories don't require size; watch auto-sets to 'One Size'
      } else if (sizeType === 'shoe') e.size = 'Select a shoe size'
      else if (sizeType === 'waist') e.size = 'Select a waist size'
      else if (sizeType === 'belt') e.size = 'Select a belt size'
      else e.size = 'Select a size'
    }
    if (needsClothingSize && !form.size) e.size = 'Select a size'
    if (needsKidsSize && !form.size) e.size = 'Select an age/size'
    if (needsShoeSize && !form.size) e.size = 'Select a shoe size'
    if ((attributes.includes('gender') || needsKidsGender) && !form.gender) e.gender = 'Select a gender'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep1 = () => {
    const e = {}
    if (!form.price || isNaN(form.price) || Number(form.price) < 1) e.price = 'Enter a valid price'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Submit — build structured payload ─────────────────────── */

  const handleSubmit = async () => {
    if (!validateStep1()) return
    setUploading(true)
    try {
      const ATTR_KEYS = ['model', 'material', 'author', 'isbn', 'language', 'sport', 'age_group', 'dimensions', 'format', 'power_info', 'assembly_required']
      const attrs = {}
      for (const key of ATTR_KEYS) {
        if (form[key]) attrs[key] = form[key]
      }
      if (form.trouser_length) attrs.trouser_length = form.trouser_length

      // Determine final size — watches auto 'One Size', no_size items get empty
      const sizeType = isFashionCategory ? getFashionSizeType(form.subcategory) : null
      const finalSize = sizeType === 'watch' ? 'One Size' : form.size

      const listing = await createListing({
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        subcategory: form.subcategory,
        attributes: attrs,
        gender: form.gender,
        size: finalSize,
        brand: normalizeBrand(form.brand) || form.brand,
        condition: form.condition,
        colors: form.colors,
        images: form.images,
        deliverySize: form.deliverySize || getDefaultDeliverySize(form.category, form.subcategory),
      })
      if (!listing || !listing.id) {
        showToast('Failed to create listing — no data returned.', 'error')
        setUploading(false)
        return
      }
      showToast('Listing published!')
      navigate(`/listing/${listing.id}`)
    } catch (err) {
      console.error('[SellPage] createListing error:', err)
      showToast(`Error creating listing: ${err.message || 'Unknown error'}`, 'error')
    } finally { setUploading(false) }
  }

  const fees = form.price && !isNaN(form.price) ? calculateFees(parseFloat(form.price)) : null
  const progressWidth = step === 0 ? 'w-1/2' : 'w-full'

  return (
    <div className="px-4 py-5">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1 rounded-full bg-sib-stone overflow-hidden">
          <div className={`h-full bg-sib-primary rounded-full transition-all duration-300 ${progressWidth}`} />
        </div>
        <span className="text-xs text-sib-muted font-medium">Step {step + 1} of 2</span>
      </div>

      {/* ═══════ STEP 0 — Photos & Details (with inline category) ═══════ */}
      {step === 0 && (
        <>
          <h2 className="text-xl font-bold text-sib-text mb-1">Add your item</h2>
          <p className="text-xs text-sib-muted mb-5">Photos, details, and a few quick picks.</p>

          {/* Photos */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-2 block">Photos</label>
            <div className="flex gap-2 flex-wrap">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-sib-sand">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                    <X size={11} className="text-white" />
                  </button>
                </div>
              ))}
              {form.images.length < 4 && (
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-sib-stone flex flex-col items-center justify-center gap-1 text-sib-muted disabled:opacity-50">
                  {uploading ? <span className="text-[10px]">Loading...</span> : <><Camera size={20} /><span className="text-[10px]">Add photo</span></>}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" multiple onChange={handleImageSelect} className="hidden" />
            </div>
            {PHOTO_GUIDANCE[form.category] && (
              <p className="text-[11px] text-sib-muted mt-1.5 leading-relaxed">{PHOTO_GUIDANCE[form.category]}</p>
            )}
            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder={TITLE_PLACEHOLDERS[form.category] || 'Give your item a clear title'}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted ${errors.title ? 'border-red-400' : 'border-sib-stone'}`} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder={DESCRIPTION_PLACEHOLDERS[form.category] || 'Describe the item — condition, any flaws...'} rows={3}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted resize-none ${errors.description ? 'border-red-400' : 'border-sib-stone'}`} />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* ── Inline Category dropdown ──────────────────── */}
          <InlineDropdown
            label="Category"
            placeholder="Select a category"
            value={form.category}
            options={categoryOptions}
            onChange={handleCategoryChange}
            error={errors.category}
            searchable
          />

          {/* ── Inline Type dropdown (appears after category) ── */}
          {form.category && typeOptions.length > 0 && (
            <InlineDropdown
              label="Type"
              placeholder="Select a type"
              value={form.subcategory}
              options={typeOptions}
              onChange={handleTypeChange}
              error={errors.subcategory}
              searchable={typeOptions.length > 8}
            />
          )}

          {/* ── Dynamic attribute fields ──────────────────── */}

          {attributes.includes('brand') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Brand</label>
              <BrandInput value={form.brand} onChange={val => set('brand', val)} error={errors.brand} placeholder={BRAND_PLACEHOLDERS[form.category] || "e.g. Zara, Nike, Levi's, No Brand..."} />
              {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
            </div>
          )}

          {attributes.includes('model') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Model</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. iPhone 15 Pro, Galaxy S24"
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted" />
            </div>
          )}

          {/* Adult gender (fashion only, NOT kids) */}
          {attributes.includes('gender') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Gender</label>
              <div className="flex gap-2">
                {GENDERS.map(g => (
                  <button key={g} onClick={() => { set('gender', g); set('size', '') }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${form.gender === g ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{g}</button>
                ))}
              </div>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
            </div>
          )}

          {/* Kids gender (boy / girl / unisex) */}
          {needsKidsGender && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Gender</label>
              <div className="flex gap-2">
                {KIDS_GENDERS.map(g => (
                  <button key={g} onClick={() => { set('gender', g); set('size', '') }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${form.gender === g ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{g}</button>
                ))}
              </div>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
            </div>
          )}

          {/* ── Fashion Size — clothing (tops, dresses, coats, etc.) ── */}
          {needsFashionSize && fashionSizeType === 'clothing' && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                Size {form.gender ? <span className="ml-1.5 text-sib-muted font-normal normal-case capitalize">({form.gender})</span> : <span className="ml-1.5 text-sib-muted font-normal normal-case">(select gender above for specific sizing)</span>}
              </label>
              {/* Letter sizes */}
              <div className="flex flex-wrap gap-2">
                {(CLOTHING_SIZES[form.gender] || CLOTHING_SIZES.unisex).map(s => (
                  <button key={s} type="button" onClick={() => set('size', s)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                ))}
              </div>
              {/* EU numeric sizes for women */}
              {form.gender === 'women' && (
                <>
                  <p className="text-[11px] text-sib-muted mt-2 mb-1.5">Or pick an EU numeric size</p>
                  <div className="flex flex-wrap gap-2">
                    {WOMEN_EU_SIZES_SELL.map(s => (
                      <button key={s} type="button" onClick={() => set('size', `EU ${s}`)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.size === `EU ${s}` ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>EU {s}</button>
                    ))}
                  </div>
                </>
              )}
              {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
            </div>
          )}

          {/* ── Fashion Size — shoes ── */}
          {needsFashionSize && fashionSizeType === 'shoe' && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                Shoe Size <span className="text-sib-muted font-normal normal-case">(EU)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SHOE_SIZES.map(s => (
                  <button key={s} type="button" onClick={() => set('size', s)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                ))}
              </div>
              {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
            </div>
          )}

          {/* ── Fashion Size — waist + length (jeans, trousers) ── */}
          {needsFashionSize && fashionSizeType === 'waist' && (
            <>
              <div className="mb-4">
                <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                  Waist Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {WAIST_SIZES.map(s => (
                    <button key={s} type="button" onClick={() => set('size', s)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                  ))}
                </div>
                <p className="text-[11px] text-sib-muted mt-1.5">If your exact waist size isn't listed, pick the nearest match.</p>
                {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                  Length <span className="font-normal normal-case text-sib-muted">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {LENGTH_SIZES.map(s => (
                    <button key={s} type="button" onClick={() => set('trouser_length', form.trouser_length === s ? '' : s)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.trouser_length === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                  ))}
                </div>
                <p className="text-[11px] text-sib-muted mt-1.5">Tap again to deselect if you don't know the length.</p>
              </div>
            </>
          )}

          {/* ── Fashion Size — belts (XS–XL) ── */}
          {needsFashionSize && fashionSizeType === 'belt' && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                Belt Size
              </label>
              <div className="flex flex-wrap gap-2">
                {BELT_SIZES.map(s => (
                  <button key={s} type="button" onClick={() => set('size', s)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                ))}
              </div>
              {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
            </div>
          )}

          {/* ── Fashion — no_size subcategories (bags, jewellery, etc.) — no size field shown ── */}

          {/* ── Fashion — watches (auto One Size) ── */}
          {needsFashionSize && fashionSizeType === 'watch' && (
            <div className="mb-4">
              <p className="text-[11px] text-sib-muted italic">Size: One Size (watches don't require a size selection)</p>
            </div>
          )}

          {/* Non-fashion adult clothing sizes */}
          {needsClothingSize && (attributes.includes('gender') ? form.gender : true) && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                Size {form.gender && <span className="ml-1.5 text-sib-muted font-normal normal-case capitalize">({form.gender})</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {(CLOTHING_SIZES[form.gender] || CLOTHING_SIZES.unisex).map(s => (
                  <button key={s} onClick={() => set('size', s)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                ))}
              </div>
              {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
            </div>
          )}

          {/* Kids age-based sizes */}
          {needsKidsSize && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                Size <span className="ml-1 text-sib-muted font-normal normal-case">(age-based)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {KIDS_AGE_SIZES.map(s => (
                  <button key={s} onClick={() => set('size', s)}
                    className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                ))}
              </div>
              {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
            </div>
          )}

          {/* Non-fashion shoe sizes */}
          {needsShoeSize && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                Shoe Size <span className="text-sib-muted font-normal normal-case">(EU)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SHOE_SIZES.map(s => (
                  <button key={s} onClick={() => set('size', s)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                ))}
              </div>
              {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size}</p>}
            </div>
          )}

          {/* Condition — always shown */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Condition</label>
            <div className="flex flex-col gap-2">
              {CONDITIONS.map(c => (
                <button key={c.value} onClick={() => set('condition', c.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${form.condition === c.value ? 'border-sib-primary bg-sib-primary/5' : 'border-sib-stone'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${form.condition === c.value ? 'border-sib-primary bg-sib-primary' : 'border-sib-stone'}`} />
                  <div><p className="text-sm font-semibold text-sib-text">{c.label}</p><p className="text-xs text-sib-muted">{c.desc}</p></div>
                </button>
              ))}
            </div>
            {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition}</p>}
          </div>

          {attributes.includes('colour') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">
                Colour <span className="font-normal normal-case text-sib-muted">(up to 3)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOURS.map(c => {
                  const selected = form.colors.includes(c.value)
                  const atMax = form.colors.length >= 3 && !selected
                  return (
                    <button key={c.value} disabled={atMax} title={c.label}
                      onClick={() => selected ? set('colors', form.colors.filter(v => v !== c.value)) : !atMax && set('colors', [...form.colors, c.value])}
                      className={`flex flex-col items-center gap-1 ${atMax ? 'opacity-40' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${selected ? 'ring-2 ring-sib-primary ring-offset-2' : ''} ${c.border ? 'border border-sib-stone' : ''}`}
                        style={{ background: c.hex }}>
                        {selected && <Check size={14} className={c.value === 'white' || c.value === 'yellow' || c.value === 'beige' ? 'text-sib-text' : 'text-white'} />}
                      </div>
                      <span className="text-[10px] text-sib-muted">{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {attributes.includes('material') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Material</label>
              <input value={form.material} onChange={e => set('material', e.target.value)} placeholder="e.g. Cotton, Leather, Wood, Metal"
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted" />
            </div>
          )}

          {attributes.includes('author') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Author</label>
              <input value={form.author} onChange={e => set('author', e.target.value)} placeholder="Author name"
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted" />
            </div>
          )}

          {attributes.includes('isbn') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">ISBN <span className="font-normal normal-case text-sib-muted">(optional)</span></label>
              <input value={form.isbn} onChange={e => set('isbn', e.target.value)} placeholder="e.g. 978-3-16-148410-0"
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted" />
            </div>
          )}

          {attributes.includes('language') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Language</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => set('language', l)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${form.language === l ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {attributes.includes('sport') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Sport</label>
              <input value={form.sport} onChange={e => set('sport', e.target.value)} placeholder="e.g. Football, Tennis, Swimming"
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted" />
            </div>
          )}

          {attributes.includes('age_group') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Age Group</label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map(a => (
                  <button key={a} onClick={() => set('age_group', a)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${form.age_group === a ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{a}</button>
                ))}
              </div>
            </div>
          )}

          {attributes.includes('dimensions') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Dimensions <span className="font-normal normal-case text-sib-muted">(optional)</span></label>
              <input value={form.dimensions} onChange={e => set('dimensions', e.target.value)} placeholder="e.g. 120cm x 60cm x 75cm"
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted" />
            </div>
          )}

          {attributes.includes('format') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Format</label>
              <div className="flex flex-wrap gap-2">
                {BOOK_FORMATS.map(f => (
                  <button key={f} onClick={() => set('format', f)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${form.format === f ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{f}</button>
                ))}
              </div>
            </div>
          )}

          {attributes.includes('power_info') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Power / Charging <span className="font-normal normal-case text-sib-muted">(optional)</span></label>
              <input value={form.power_info} onChange={e => set('power_info', e.target.value)} placeholder="e.g. USB-C, includes original charger, battery 85%"
                className="w-full border border-sib-stone rounded-xl px-4 py-3 text-sm outline-none text-sib-text placeholder-sib-muted" />
            </div>
          )}

          {attributes.includes('assembly_required') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Assembly Required?</label>
              <div className="flex gap-2">
                {['Yes', 'No', 'Partially'].map(opt => (
                  <button key={opt} onClick={() => set('assembly_required', opt)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${form.assembly_required === opt ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{opt}</button>
                ))}
              </div>
            </div>
          )}

          {form.category === 'sports' && attributes.includes('size') && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Size <span className="font-normal normal-case text-sib-muted">(if applicable)</span></label>
              <div className="flex flex-wrap gap-2">
                {SPORTS_SIZES.map(s => (
                  <button key={s} onClick={() => set('size', s)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${form.size === s ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { if (validateStep0()) setStep(1) }}
            className="w-full bg-sib-secondary text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform">Continue</button>
        </>
      )}

      {/* ═══════ STEP 1 — Price & Delivery ═══════ */}
      {step === 1 && (
        <>
          <h2 className="text-xl font-bold text-sib-text mb-1">Price & Delivery</h2>
          <p className="text-xs text-sib-muted mb-5">Set your price and confirm the delivery size.</p>

          {/* ── Delivery Size Picker — with 1-person-carry toggle ── */}
          {deliveryEligible && (() => {
            const forceBulky = isForceBulky(form.category, form.subcategory)
            const allowed = getAllowedTiers(form.category, form.subcategory, form.onePersonCarry)
            const onlyBulky = allowed.length === 1 && allowed[0] === 'bulky'
            const selectedSize = form.deliverySize || getDefaultDeliverySize(form.category, form.subcategory)
            const TIER_ICONS = { small: Package, medium: Package, heavy: Package, bulky: Truck }
            const showCarryToggle = !forceBulky
            const bulkyHint = titleSuggestsBulky(form.title) && form.onePersonCarry === null

            return (
              <div className="mb-5">
                <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1 block">
                  Delivery size
                </label>

                {/* 1-person-carry toggle — not shown for force-bulky categories */}
                {showCarryToggle && (
                  <div className="mb-3">
                    <p className="text-[11px] text-sib-muted mb-2 leading-relaxed">
                      Can this item be safely carried by 1 person?
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => {
                        set('onePersonCarry', true)
                        // If currently bulky, switch to heavy
                        if (form.deliverySize === 'bulky') set('deliverySize', 'heavy')
                      }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          form.onePersonCarry === true ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
                        }`}>Yes</button>
                      <button type="button" onClick={() => {
                        set('onePersonCarry', false)
                        set('deliverySize', 'bulky')
                      }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          form.onePersonCarry === false ? 'bg-sib-primary text-white' : 'bg-sib-sand text-sib-muted'
                        }`}>No</button>
                    </div>
                    {bulkyHint && (
                      <p className="text-[11px] text-amber-700 mt-1.5 flex items-start gap-1">
                        <Info size={11} className="flex-shrink-0 mt-0.5" />
                        <span>This looks like it might be a bulky item. If it cannot be carried by 1 person, select "No".</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Guidance text */}
                <p className="text-[11px] text-sib-muted mb-2 leading-relaxed">
                  {onlyBulky
                    ? 'This item requires 2-person delivery by Sib drivers.'
                    : 'Choose the size that best fits your item. The buyer pays delivery.'}
                </p>

                {/* Tier buttons */}
                <div className="flex flex-col gap-2">
                  {DELIVERY_TIERS.filter(t => allowed.includes(t.id)).map(tier => {
                    const TierIcon = TIER_ICONS[tier.id] || Package
                    const isSelected = selectedSize === tier.id
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => set('deliverySize', tier.id)}
                        disabled={onlyBulky}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                          isSelected ? 'border-sib-primary bg-sib-primary/5' : 'border-sib-stone'
                        } ${onlyBulky ? 'cursor-default' : ''}`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-sib-primary bg-sib-primary' : 'border-sib-stone'
                        }`}>
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <TierIcon size={14} className={isSelected ? 'text-sib-primary' : 'text-sib-muted'} />
                            <span className="text-sm font-semibold text-sib-text">{tier.label}</span>
                            <span className={`ml-auto text-sm font-bold ${isSelected ? 'text-sib-primary' : 'text-sib-text/60'}`}>{tier.priceLabel}</span>
                          </div>
                          <p className="text-xs text-sib-muted mt-0.5">{tier.description}</p>
                          {tier.weight && <p className="text-[11px] text-sib-muted/70 mt-0.5">{tier.weight}</p>}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Bulky delivery notes */}
                {selectedSize === 'bulky' && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Bulky delivery — please note</p>
                    <ul className="space-y-0.5">
                      {BULKY_DELIVERY_NOTES.map((note, i) => (
                        <li key={i} className="text-[11px] text-amber-700 flex items-start gap-1.5">
                          <span className="mt-0.5">•</span><span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Size accuracy warning */}
                <p className="text-[11px] text-sib-muted/80 mt-2 flex items-start gap-1">
                  <Info size={10} className="flex-shrink-0 mt-0.5" />
                  <span>{SIZE_ACCURACY_WARNING}</span>
                </p>
              </div>
            )
          })()}

          {/* ── Price input ────────────────────────────── */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-sib-text uppercase tracking-wide mb-1.5 block">Listing price (EUR)</label>
            <div className={`flex items-center border rounded-xl overflow-hidden ${errors.price ? 'border-red-400' : 'border-sib-stone'}`}>
              <span className="px-4 text-sib-muted font-bold text-base">EUR</span>
              <input type="number" min={1} value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00"
                className="flex-1 py-3 text-sm outline-none text-sib-text" />
            </div>
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          {/* ── Fee preview (shown only when price is entered) ── */}
          {fees && (
            <div className="p-4 rounded-2xl bg-sib-warm mb-5 text-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <Info size={13} className="text-sib-muted" />
                <p className="text-xs font-semibold text-sib-muted">What the buyer pays</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sib-muted text-xs">
                  <span>Listing price</span><span>EUR {parseFloat(form.price).toFixed(2)}</span>
                </div>
                <FeeBreakdown buyerProtectionFee={fees.buyerProtectionFee} deliveryFee={getDeliveryFee(form.deliverySize || getDefaultDeliverySize(form.category, form.subcategory))} size="sm" />
                <div className="flex justify-between text-sib-text font-bold pt-2 border-t border-sib-stone">
                  <span>You receive</span><span className="text-sib-primary">EUR {parseFloat(form.price).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {deliveryEligible ? (
            <div className="p-4 rounded-2xl bg-blue-50 mb-5">
              <p className="text-xs text-blue-800 font-medium">All orders are shipped via Sib Tracked Delivery. No meetups or cash deals.</p>
            </div>
          ) : (
            <DeliveryGuidance variant="full" />
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-shrink-0 px-5 py-4 rounded-2xl border border-sib-stone text-sm font-medium text-sib-text">Back</button>
            <button onClick={handleSubmit} disabled={uploading}
              className="flex-1 bg-sib-secondary text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
              {uploading ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
