import React from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-sib-warm">
      <div className="w-full max-w-md mx-auto min-h-screen relative bg-white shadow-sm">
        <TopBar />
        <main className="pb-24">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
