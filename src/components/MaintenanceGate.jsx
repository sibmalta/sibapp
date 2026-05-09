import React from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'

const DEFAULT_ALLOWED_PATH_PREFIXES = [
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/scan-dropoff',
  '/admin/scan-dropoff',
  '/messages/dispute',
]

export function isMaintenanceModeEnabled(value = import.meta.env.VITE_MAINTENANCE_MODE) {
  return String(value || '').trim().toLowerCase() === 'true'
}

export function parseMaintenanceEmails(value = import.meta.env.VITE_MAINTENANCE_EMAILS) {
  return String(value || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isMaintenanceBypassUser(user, whitelistEmails = []) {
  if (!user) return false
  if (user.isAdmin || user.adminRole || user.role === 'admin') return true
  const email = String(user.email || '').trim().toLowerCase()
  return Boolean(email && whitelistEmails.includes(email))
}

export function isMaintenanceAllowedPath(pathname = '', allowedPrefixes = DEFAULT_ALLOWED_PATH_PREFIXES) {
  const path = pathname || '/'
  return allowedPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

function MaintenancePage() {
  return (
    <main className="min-h-screen bg-sib-cream dark:bg-[#18211f] text-sib-text dark:text-[#f4efe7] flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sib-primary/10 text-sib-primary">
          <ShieldCheck size={28} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sib-primary">Private beta access only</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-sib-text dark:text-[#f4efe7]">
          Sib is currently being updated
        </h1>
        <p className="mt-4 text-sm leading-6 text-sib-muted dark:text-[#aeb8b4]">
          We&apos;re improving delivery and marketplace systems and will be back shortly.
        </p>
      </section>
    </main>
  )
}

export default function MaintenanceGate({ children }) {
  const location = useLocation()
  const { currentUser, authLoading } = useApp()

  if (!isMaintenanceModeEnabled()) return children
  if (isMaintenanceAllowedPath(location.pathname)) return children
  if (authLoading) {
    return (
      <main className="min-h-screen bg-sib-cream dark:bg-[#18211f] flex items-center justify-center px-5">
        <p className="text-sm font-semibold text-sib-muted dark:text-[#aeb8b4]">Checking access...</p>
      </main>
    )
  }
  if (isMaintenanceBypassUser(currentUser, parseMaintenanceEmails())) return children

  return <MaintenancePage />
}
