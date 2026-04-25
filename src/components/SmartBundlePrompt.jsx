import React, { useEffect, useMemo, useState } from 'react'
import { PackagePlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const PROMPT_PREFIX = 'sib_bundle_prompt_seen_'

export default function SmartBundlePrompt({ listing }) {
  const navigate = useNavigate()
  const { currentUser, getUserById, getUserListings } = useApp()
  const [visible, setVisible] = useState(false)

  const seller = listing ? getUserById(listing.sellerId) : null
  const sellerOtherActiveCount = useMemo(() => {
    if (!listing?.sellerId) return 0
    return getUserListings(listing.sellerId)
      .filter(item => item.id !== listing.id && item.status === 'active')
      .length
  }, [getUserListings, listing?.id, listing?.sellerId])

  const isEligible = Boolean(
    listing &&
    Number(listing.price) < 5 &&
    sellerOtherActiveCount >= 2 &&
    currentUser?.id !== listing.sellerId,
  )

  useEffect(() => {
    if (!isEligible || !listing?.id) return
    const key = `${PROMPT_PREFIX}${listing.id}`
    if (sessionStorage.getItem(key)) return

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(key, '1')
      setVisible(true)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [isEligible, listing?.id])

  if (!visible || !isEligible) return null

  const dismiss = () => setVisible(false)

  const viewSellerItems = () => {
    dismiss()
    if (seller?.username) {
      navigate(`/profile/${seller.username}`)
    } else {
      navigate('/browse')
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4 lg:bottom-6 lg:flex lg:justify-center">
      <div className="mx-auto max-w-md rounded-3xl border border-sib-primary/15 bg-white p-4 shadow-2xl shadow-sib-primary/15 dark:border-sib-primary/25 dark:bg-[#202b28]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-sib-primary/10 text-sib-primary">
            <PackagePlus size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-sib-text dark:text-[#f4efe7]">Make it a bundle?</p>
                <p className="mt-1 text-xs leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
                  This item is under €5. Add more from this seller and save on delivery.
                </p>
              </div>
              <button
                onClick={dismiss}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sib-muted hover:bg-sib-sand dark:text-[#aeb8b4] dark:hover:bg-[#26322f]"
                aria-label="Dismiss bundle suggestion"
              >
                <X size={15} />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={viewSellerItems}
                className="flex-1 rounded-2xl bg-sib-primary px-4 py-2.5 text-xs font-bold text-white active:scale-[0.98]"
              >
                View seller&apos;s items
              </button>
              <button
                onClick={dismiss}
                className="rounded-2xl border border-sib-stone px-4 py-2.5 text-xs font-bold text-sib-muted active:scale-[0.98] dark:border-[rgba(242,238,231,0.10)] dark:text-[#aeb8b4]"
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
