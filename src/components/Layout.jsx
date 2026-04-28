import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import DesktopNav from './DesktopNav'
import BundleFloater from './BundleFloater'
import Footer from './Footer'
import { useApp } from '../context/AppContext'

export default function Layout() {
  const { pathname } = useLocation()
  const { currentUser, listings } = useApp()
  const isMessagesRoot = pathname === '/messages' || pathname === '/messages/'
  const hasSellerActivity = currentUser && listings.some(listing => listing.sellerId === currentUser.id)
  const payoutSetupNeeded = hasSellerActivity && !(currentUser?.stripeAccountId && currentUser?.detailsSubmitted && currentUser?.payoutsEnabled)
  const showPayoutBanner = payoutSetupNeeded && pathname !== '/seller/payout-settings'

  return (
    <div className="min-h-screen bg-sib-warm text-sib-text dark:bg-[#18211f] dark:text-[#f4efe7] transition-colors">
      <DesktopNav />

      <div className="w-full max-w-md mx-auto min-h-screen relative bg-white shadow-sm dark:bg-[#202b28] dark:shadow-none lg:max-w-none lg:shadow-none transition-colors">
        <div className="lg:hidden">
          <TopBar />
        </div>

        {showPayoutBanner && (
          <Link
            to="/seller/payout-settings"
            className="mx-4 mt-3 block rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-[#332d20] dark:text-amber-200"
          >
            Complete payout setup to receive payments from sales.
          </Link>
        )}

        <main className={isMessagesRoot ? '' : 'pb-24 lg:pb-12'}>
          <Outlet />
          {!isMessagesRoot && <Footer />}
        </main>

        <BundleFloater />

        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
