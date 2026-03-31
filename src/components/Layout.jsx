import React from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import DesktopNav from './DesktopNav'
import BundleFloater from './BundleFloater'

export default function Layout() {
  return (
    <div className="min-h-screen bg-sib-warm">
      {/* Desktop top navigation */}
      <DesktopNav />

      {/* Mobile: constrained max-w-md. Desktop: full width */}
      <div className="w-full max-w-md mx-auto min-h-screen relative bg-white shadow-sm lg:max-w-none lg:shadow-none">
        {/* Mobile top bar */}
        <div className="lg:hidden">
          <TopBar />
        </div>

        <main className="pb-24 lg:pb-12">
          <Outlet />
        </main>

        {/* Bundle floater */}
        <BundleFloater />

        {/* Mobile bottom nav */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
