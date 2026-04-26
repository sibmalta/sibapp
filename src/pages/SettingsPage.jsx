import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Bell, Shield, FileText, ShieldCheck, RefreshCw, Ban, ChevronRight, LogOut, HelpCircle, Mail, Lock, Store, Truck, Scale, Cookie, MapPin, Sun, Moon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { currentUser, logout } = useApp()
  const { theme, setTheme } = useTheme()

  if (!currentUser) {
    navigate('/auth')
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted dark:text-[#aeb8b4] text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-xl font-bold text-sib-text dark:text-[#f4efe7] mb-6">Settings</h1>

      <div className="mb-6">
        <p className="text-[11px] font-semibold text-sib-muted dark:text-[#aeb8b4] uppercase tracking-wide mb-2">Appearance</p>
        <div className="rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] overflow-hidden sib-panel">
          <div className="px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">Theme</p>
              <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-0.5">Choose how Sib looks on this device.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-sib-sand dark:bg-[#26322f] p-1 transition-colors">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  theme === 'light'
                    ? 'bg-[#f8f7f3] dark:bg-[#30403c] text-sib-text dark:text-[#f4efe7] shadow-sm'
                    : 'text-sib-muted dark:text-[#aeb8b4] hover:text-sib-text dark:hover:text-[#f4efe7]'
                }`}
              >
                <Sun size={14} />
                Light mode
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#30403c] text-[#f4efe7] shadow-sm'
                    : 'text-sib-muted dark:text-[#aeb8b4] hover:text-sib-text dark:hover:text-[#f4efe7]'
                }`}
              >
                <Moon size={14} />
                Dark mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-sib-muted dark:text-[#aeb8b4] uppercase tracking-wide mb-2">Account</p>
        <div className="rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] overflow-hidden divide-y divide-sib-stone dark:divide-[rgba(242,238,231,0.10)] sib-panel">
          <Link
            to="/profile/edit"
            className="flex items-center gap-3 px-4 py-3.5 active:bg-sib-sand dark:active:bg-[#26322f] transition-colors"
          >
            <User size={16} className="text-sib-muted dark:text-[#aeb8b4] flex-shrink-0" />
            <span className="text-sm text-sib-text dark:text-[#f4efe7] flex-1">Edit Profile</span>
            <ChevronRight size={14} className="text-sib-stone" />
          </Link>
          <Link
            to="/settings/delivery"
            className="flex items-center gap-3 px-4 py-3.5 active:bg-sib-sand dark:active:bg-[#26322f] transition-colors"
          >
            <MapPin size={16} className="text-sib-muted dark:text-[#aeb8b4] flex-shrink-0" />
            <span className="text-sm text-sib-text dark:text-[#f4efe7] flex-1">Delivery Address</span>
            <ChevronRight size={14} className="text-sib-stone" />
          </Link>
        </div>
      </div>

      {/* Admin */}
      {currentUser?.isAdmin && (
        <div className="mb-6">
        <p className="text-[11px] font-semibold text-sib-muted dark:text-[#aeb8b4] uppercase tracking-wide mb-2">Admin</p>
          <div className="rounded-2xl border border-sib-primary/30 overflow-hidden bg-sib-primary/5 dark:bg-[#26322f] transition-colors">
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3.5 active:bg-sib-primary/10 transition-colors"
            >
              <Shield size={16} className="text-sib-primary flex-shrink-0" />
              <span className="text-sm font-semibold text-sib-primary flex-1">Admin Panel</span>
              <ChevronRight size={14} className="text-sib-primary/50" />
            </Link>
          </div>
        </div>
      )}

      {/* Legal & Policies */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-sib-muted dark:text-[#aeb8b4] uppercase tracking-wide mb-2">Legal & Policies</p>
        <div className="rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] overflow-hidden divide-y divide-sib-stone dark:divide-[rgba(242,238,231,0.10)] sib-panel">
          {[
            { to: '/terms', icon: FileText, label: 'Terms & Conditions' },
            { to: '/privacy', icon: Lock, label: 'Privacy Policy' },
            { to: '/buyer-protection', icon: ShieldCheck, label: 'Buyer Protection' },
            { to: '/seller-policy', icon: Store, label: 'Seller Policy' },
            { to: '/delivery-policy', icon: Truck, label: 'Delivery Policy' },
            { to: '/disputes-refunds', icon: Scale, label: 'Disputes & Refunds' },
            { to: '/refund-policy', icon: RefreshCw, label: 'Refund Policy' },
            { to: '/prohibited-items', icon: Ban, label: 'Prohibited Items' },
            { to: '/cookies', icon: Cookie, label: 'Cookie Policy' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-sib-sand dark:active:bg-[#26322f] transition-colors"
            >
              <item.icon size={16} className="text-sib-muted dark:text-[#aeb8b4] flex-shrink-0" />
              <span className="text-sm text-sib-text dark:text-[#f4efe7] flex-1">{item.label}</span>
              <ChevronRight size={14} className="text-sib-stone" />
            </Link>
          ))}
        </div>
      </div>

      {/* Help & Support */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-sib-muted dark:text-[#aeb8b4] uppercase tracking-wide mb-2">Help & Support</p>
        <div className="rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] overflow-hidden divide-y divide-sib-stone dark:divide-[rgba(242,238,231,0.10)] sib-panel">
          {[
            { to: '/faq', icon: HelpCircle, label: 'FAQ' },
            { to: '/contact', icon: Mail, label: 'Contact Support' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-sib-sand dark:active:bg-[#26322f] transition-colors"
            >
              <item.icon size={16} className="text-sib-muted dark:text-[#aeb8b4] flex-shrink-0" />
              <span className="text-sm text-sib-text dark:text-[#f4efe7] flex-1">{item.label}</span>
              <ChevronRight size={14} className="text-sib-stone" />
            </Link>
          ))}
        </div>
      </div>

      {/* Log out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-[#362322] active:bg-red-100 dark:active:bg-[#42302e] transition-colors"
      >
        <LogOut size={16} className="text-red-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-red-600 dark:text-red-300">Log Out</span>
      </button>
    </div>
  )
}
