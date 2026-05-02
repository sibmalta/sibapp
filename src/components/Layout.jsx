import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import DesktopNav from './DesktopNav'
import BundleFloater from './BundleFloater'
import Footer from './Footer'
import SellerDropoffPrompt from './SellerDropoffPrompt'

export default function Layout() {
  const { pathname } = useLocation()
  const isMessagesRoot = pathname === '/messages' || pathname === '/messages/'

  return (
    <div className="min-h-screen bg-sib-warm text-sib-text dark:bg-[#18211f] dark:text-[#f4efe7] transition-colors">
      <DesktopNav />

      <div className="w-full max-w-md mx-auto min-h-screen relative bg-white shadow-sm dark:bg-[#202b28] dark:shadow-none lg:max-w-none lg:shadow-none transition-colors">
        <div className="lg:hidden">
          <TopBar />
        </div>

        <main className={isMessagesRoot ? '' : 'pb-24 lg:pb-12'}>
          {!isMessagesRoot && <SellerDropoffPrompt />}
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
