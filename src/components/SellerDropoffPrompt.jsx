import React, { useEffect, useMemo, useState } from 'react'
import { PackageCheck, QrCode, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getPendingSellerDropoffOrders } from '../lib/sellerDropoffPrompt'

const REMIND_LATER_MS = 12 * 60 * 60 * 1000

function reminderKey(userId, orderId) {
  return `sib_dropoff_prompt_snooze:${userId}:${orderId}`
}

function isSnoozed(userId, orderId) {
  try {
    const until = Number(localStorage.getItem(reminderKey(userId, orderId)) || 0)
    return Number.isFinite(until) && until > Date.now()
  } catch {
    return false
  }
}

function snooze(userId, orderId) {
  try {
    localStorage.setItem(reminderKey(userId, orderId), String(Date.now() + REMIND_LATER_MS))
  } catch {}
}

export default function SellerDropoffPrompt() {
  const {
    currentUser,
    orders,
    shipments,
    refreshOrders,
    refreshShipments,
  } = useApp()
  const navigate = useNavigate()
  const [snoozeVersion, setSnoozeVersion] = useState(0)

  useEffect(() => {
    if (!currentUser?.id) return
    refreshOrders?.()
    refreshShipments?.()
  }, [currentUser?.id, refreshOrders, refreshShipments])

  const pendingOrders = useMemo(() => {
    return getPendingSellerDropoffOrders({
      orders,
      shipments,
      currentUserId: currentUser?.id,
    }).filter(order => !isSnoozed(currentUser?.id, order.id))
  }, [orders, shipments, currentUser?.id, snoozeVersion])

  const order = pendingOrders[0]
  if (!currentUser || !order) return null

  const orderRef = order.orderRef || order.id?.slice(-8)
  const itemTitle = order.listingTitle || (order.isBundle ? 'Bundle order' : 'your sold item')

  const handleViewQr = () => {
    console.log('[SellerDropoffPrompt] view drop-off QRs clicked', { orderCount: pendingOrders.length })
    navigate('/dropoff')
  }

  const handleRemindLater = () => {
    snooze(currentUser.id, order.id)
    setSnoozeVersion(version => version + 1)
  }

  return (
    <section className="mx-3 mt-3 rounded-3xl border border-sib-primary/30 bg-[#fff7ed] p-4 shadow-lg shadow-orange-900/5 dark:border-sib-primary/30 dark:bg-[#332d20]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sib-primary text-white">
          <PackageCheck size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-black text-sib-text dark:text-[#f4efe7]">You sold an item 🎉</p>
              <p className="mt-0.5 text-[11px] font-mono text-sib-muted dark:text-[#aeb8b4]">Order #{orderRef}</p>
            </div>
            <button
              type="button"
              onClick={handleRemindLater}
              className="rounded-full p-1.5 text-sib-muted transition hover:bg-white/70 hover:text-sib-text dark:text-[#aeb8b4] dark:hover:bg-[#26322f]"
              aria-label="Remind me later"
            >
              <X size={15} />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-sib-text dark:text-[#f4efe7]">
            Please drop your parcel at your nearest MYconvenience store so we can deliver it to the buyer.
          </p>
          <p className="mt-1 text-xs text-sib-muted dark:text-[#aeb8b4]">{itemTitle}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleViewQr}
              className="flex items-center justify-center gap-2 rounded-2xl bg-sib-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sib-primary/90"
            >
              <QrCode size={15} /> View drop-off QRs
            </button>
            <button
              type="button"
              onClick={handleRemindLater}
              className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-sib-muted transition hover:bg-white/70 hover:text-sib-text dark:text-[#aeb8b4] dark:hover:bg-[#26322f]"
            >
              Remind me later
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-sib-muted dark:text-[#aeb8b4]">
            Store staff scan each QR to confirm each parcel.
          </p>
        </div>
      </div>
    </section>
  )
}
