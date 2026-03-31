import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Bell, Shield, FileText, ShieldCheck, RefreshCw, Ban, ChevronRight, LogOut, HelpCircle, Mail } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { currentUser, logout } = useApp()

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
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-xl font-bold text-sib-text mb-6">Settings</h1>

      {/* Account */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-sib-muted uppercase tracking-wide mb-2">Account</p>
        <div className="rounded-2xl border border-sib-stone overflow-hidden divide-y divide-sib-stone">
          <Link
            to="/profile/edit"
            className="flex items-center gap-3 px-4 py-3.5 active:bg-sib-sand transition-colors"
          >
            <User size={16} className="text-sib-muted flex-shrink-0" />
            <span className="text-sm text-sib-text flex-1">Edit Profile</span>
            <ChevronRight size={14} className="text-sib-stone" />
          </Link>
        </div>
      </div>

      {/* Legal & Policies */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-sib-muted uppercase tracking-wide mb-2">Legal & Policies</p>
        <div className="rounded-2xl border border-sib-stone overflow-hidden divide-y divide-sib-stone">
          {[
            { to: '/terms', icon: FileText, label: 'Terms & Conditions' },
            { to: '/buyer-protection', icon: ShieldCheck, label: 'Buyer Protection' },
            { to: '/refund-policy', icon: RefreshCw, label: 'Refund Policy' },
            { to: '/prohibited-items', icon: Ban, label: 'Prohibited Items' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-sib-sand transition-colors"
            >
              <item.icon size={16} className="text-sib-muted flex-shrink-0" />
              <span className="text-sm text-sib-text flex-1">{item.label}</span>
              <ChevronRight size={14} className="text-sib-stone" />
            </Link>
          ))}
        </div>
      </div>

      {/* Help & Support */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-sib-muted uppercase tracking-wide mb-2">Help & Support</p>
        <div className="rounded-2xl border border-sib-stone overflow-hidden divide-y divide-sib-stone">
          {[
            { to: '/faq', icon: HelpCircle, label: 'FAQ' },
            { to: '/contact', icon: Mail, label: 'Contact Support' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-sib-sand transition-colors"
            >
              <item.icon size={16} className="text-sib-muted flex-shrink-0" />
              <span className="text-sm text-sib-text flex-1">{item.label}</span>
              <ChevronRight size={14} className="text-sib-stone" />
            </Link>
          ))}
        </div>
      </div>

      {/* Log out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-red-200 bg-red-50 active:bg-red-100 transition-colors"
      >
        <LogOut size={16} className="text-red-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-red-600">Log Out</span>
      </button>
    </div>
  )
}
