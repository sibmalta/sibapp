import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, CheckCircle, AlertCircle, Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const BANK_SUGGESTIONS = [
  'Bank of Valletta',
  'HSBC Malta',
  'APS Bank',
  'BNF Bank',
  'Lombard Bank',
  'MeDirect',
  'Revolut',
  'Wise',
  'Other',
]

function BankAutocomplete({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? BANK_SUGGESTIONS.filter(b => b.toLowerCase().includes(query.toLowerCase()))
    : BANK_SUGGESTIONS

  const handleSelect = (bank) => {
    setQuery(bank)
    onChange(bank)
    setOpen(false)
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    if (!open) setOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sib-muted pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={handleInputChange}
        placeholder="Start typing your bank..."
        autoComplete="off"
        className="w-full pl-10 pr-9 py-3 rounded-2xl border border-sib-stone text-sm text-sib-text placeholder:text-sib-muted/50 focus:outline-none focus:border-sib-primary"
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(''); onChange(''); inputRef.current?.focus() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-sib-stone/60 text-sib-muted"
        >
          <X size={12} />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-sib-stone rounded-2xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {filtered.map((bank) => (
            <button
              key={bank}
              type="button"
              onClick={() => handleSelect(bank)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                bank === query
                  ? 'bg-sib-primary/10 text-sib-primary font-semibold'
                  : 'text-sib-text active:bg-sib-sand'
              }`}
            >
              {bank}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PayoutSettingsPage() {
  const navigate = useNavigate()
  const { currentUser, savePayoutProfile, getPayoutProfile, showToast } = useApp()

  const existing = currentUser ? getPayoutProfile(currentUser.id) : null

  const [form, setForm] = useState({
    accountName: '',
    iban: '',
    bank: '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (existing) {
      setForm({
        accountName: existing.accountName || '',
        iban: existing.iban || '',
        bank: existing.bank || '',
      })
      setSaved(true)
    }
  }, [existing])

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const formatIBAN = (val) => {
    const clean = val.replace(/\s/g, '').toUpperCase()
    return clean.replace(/(.{4})/g, '$1 ').trim()
  }

  const isValid = form.accountName.trim().length > 0 && form.iban.replace(/\s/g, '').length >= 15

  const handleSave = () => {
    if (!form.accountName.trim()) {
      showToast('Please enter the account holder name.', 'error')
      return
    }
    const cleanIBAN = form.iban.replace(/\s/g, '')
    if (cleanIBAN.length < 15) {
      showToast('Please enter a valid IBAN.', 'error')
      return
    }
    savePayoutProfile(currentUser.id, {
      accountName: form.accountName.trim(),
      iban: cleanIBAN,
      bank: form.bank.trim() || '',
      bic: '',
    })
    setSaved(true)
    showToast('Payout details saved.')
  }

  const maskedIBAN = (iban) => {
    if (!iban || iban.length < 8) return iban
    return iban.slice(0, 4) + ' •••• •••• ' + iban.slice(-4)
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-sib-stone">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-sib-sand flex items-center justify-center">
          <ArrowLeft size={18} className="text-sib-text" />
        </button>
        <h1 className="text-base font-bold text-sib-text">Payout Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Info */}
        <div className="p-3 rounded-2xl bg-sib-primary/5 border border-sib-primary/10 flex items-start gap-2.5">
          <Banknote size={16} className="text-sib-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-sib-muted leading-relaxed">
            Your payout is the item price you set. Sib charges buyers a separate service fee — you always receive the full listing price. Payouts are sent every <strong>Tuesday</strong> and <strong>Friday</strong> after delivery is confirmed.
          </p>
        </div>

        {/* Current profile (if saved) */}
        {saved && existing && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-green-600" />
              <p className="text-sm font-semibold text-green-800">Payout method active</p>
            </div>
            <div className="space-y-1 text-sm text-green-700">
              <p>{existing.accountName}</p>
              <p className="font-mono text-xs">{maskedIBAN(existing.iban)}</p>
              {existing.bank && <p className="text-xs text-green-600">{existing.bank}</p>}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sib-text mb-1.5">
              Account holder name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.accountName}
              onChange={e => { setForm(f => ({ ...f, accountName: e.target.value })); setSaved(false) }}
              placeholder="John Doe"
              autoComplete="name"
              className="w-full px-4 py-3 rounded-2xl border border-sib-stone text-sm text-sib-text placeholder:text-sib-muted/50 focus:outline-none focus:border-sib-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sib-text mb-1.5">
              IBAN <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formatIBAN(form.iban)}
              onChange={e => { setForm(f => ({ ...f, iban: e.target.value.replace(/\s/g, '') })); setSaved(false) }}
              placeholder="MT84 MALT 0110 0001 2345 MTLC AST0 01S"
              autoComplete="off"
              inputMode="text"
              className="w-full px-4 py-3 rounded-2xl border border-sib-stone text-sm text-sib-text placeholder:text-sib-muted/50 focus:outline-none focus:border-sib-primary font-mono"
            />
            <p className="text-[11px] text-sib-muted mt-1">Malta IBANs start with MT and have 31 characters</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sib-text mb-1.5">
              Bank <span className="text-sib-muted font-normal">(optional)</span>
            </label>
            <BankAutocomplete
              value={form.bank}
              onChange={(val) => { setForm(f => ({ ...f, bank: val })); setSaved(false) }}
            />
            <p className="text-[11px] text-sib-muted mt-1">Your IBAN already identifies your bank — this is just for your reference</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saved || !isValid}
          className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-colors ${
            saved
              ? 'bg-green-100 text-green-700 cursor-not-allowed'
              : !isValid
                ? 'bg-sib-stone text-sib-muted cursor-not-allowed'
                : 'bg-sib-primary text-white active:bg-sib-primaryDark'
          }`}
        >
          {saved ? '✓ Saved' : 'Save Payout Details'}
        </button>

        {/* Security note */}
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-sib-sand">
          <AlertCircle size={14} className="text-sib-muted flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-sib-muted leading-relaxed">
            Your banking details are stored securely and only used to process payouts for confirmed deliveries. Sib never shares your financial information with buyers.
          </p>
        </div>
      </div>
    </div>
  )
}
