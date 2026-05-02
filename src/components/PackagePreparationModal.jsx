import React, { useState } from 'react'
import { AlertTriangle, CheckCircle2, PackageCheck, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const CHECKLIST = [
  'Package the item securely',
  'Remove old shipping labels/barcodes',
  'Attach the Sib delivery label when provided',
  'Keep the package ready at the pickup address',
  'Hand it only to an approved drop-off partner or courier',
]

export default function PackagePreparationModal() {
  const {
    pendingPackagePreparationOffer,
    dismissPackagePreparationPrompt,
    markOfferPackagePrepared,
    getListingById,
    showToast,
  } = useApp()
  const [saving, setSaving] = useState(false)

  if (!pendingPackagePreparationOffer) return null

  const listing = getListingById?.(pendingPackagePreparationOffer.listingId)

  const handlePrepared = async () => {
    if (saving) return
    setSaving(true)
    const result = await markOfferPackagePrepared(pendingPackagePreparationOffer.id)
    setSaving(false)

    if (result?.error) {
      showToast?.(result.error, 'error')
      return
    }

    showToast?.('Package marked ready for pickup.')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-sib-primary/25 bg-white shadow-2xl dark:border-sib-primary/30 dark:bg-[#202b28]">
        <div className="relative bg-gradient-to-br from-sib-primary/15 via-[#fff7ed] to-white p-5 dark:from-sib-primary/20 dark:via-[#26322f] dark:to-[#202b28] sm:p-6">
          <button
            type="button"
            onClick={() => dismissPackagePreparationPrompt(pendingPackagePreparationOffer.id)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-sib-muted transition hover:bg-white dark:bg-[#26322f]/80 dark:text-[#aeb8b4] dark:hover:bg-[#30403c]"
            aria-label="Remind me later"
          >
            <X size={18} />
          </button>

          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sib-primary text-white shadow-lg shadow-sib-primary/25">
            <PackageCheck size={24} />
          </div>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            <AlertTriangle size={13} />
            Action required
          </p>
          <h2 className="pr-8 text-2xl font-black leading-tight text-sib-text dark:text-[#f4efe7]">
            Prepare your package for pickup
          </h2>
          {listing?.title && (
            <p className="mt-2 text-sm font-semibold text-sib-muted dark:text-[#aeb8b4]">
              {listing.title}
            </p>
          )}
          <p className="mt-4 text-sm leading-6 text-sib-muted dark:text-[#aeb8b4]">
            Your offer has been accepted. Please package the item securely and keep it ready for pickup.
            Delays in preparing the package may delay delivery and payment.
          </p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-2xl border border-sib-stone bg-sib-sand/40 p-4 dark:border-[rgba(242,238,231,0.10)] dark:bg-[#26322f]">
            <p className="mb-3 text-sm font-bold text-sib-text dark:text-[#f4efe7]">Before pickup, make sure you:</p>
            <ul className="space-y-2.5">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-sib-text dark:text-[#f4efe7]">
                  <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-sib-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={handlePrepared}
            disabled={saving}
            className="w-full rounded-2xl bg-sib-primary px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sib-primary/20 transition hover:bg-sib-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving...' : "I’ve prepared the package"}
          </button>
          <button
            type="button"
            onClick={() => dismissPackagePreparationPrompt(pendingPackagePreparationOffer.id)}
            className="w-full rounded-2xl border border-sib-stone px-4 py-3 text-sm font-semibold text-sib-muted transition hover:bg-sib-sand dark:border-[rgba(242,238,231,0.10)] dark:text-[#aeb8b4] dark:hover:bg-[#30403c]"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  )
}
