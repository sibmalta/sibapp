import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Tag, Package, CheckCircle, XCircle, ArrowRightLeft, ShieldCheck, AlertTriangle, ChevronRight, PackagePlus } from 'lucide-react'
import { useApp } from '../context/AppContext'

const NOTIF_CONFIG = {
  offer_received:       { icon: Tag,            color: 'bg-blue-100 text-blue-600',    link: '/offers' },
  offer_accepted:       { icon: CheckCircle,    color: 'bg-green-100 text-green-600',  link: '/offers' },
  offer_declined:       { icon: XCircle,        color: 'bg-red-100 text-red-600',      link: '/offers' },
  offer_countered:      { icon: ArrowRightLeft, color: 'bg-amber-100 text-amber-600',  link: '/offers' },
  delivered:            { icon: Package,         color: 'bg-indigo-100 text-indigo-600', linkFn: (n) => `/orders/${n.orderId}` },
  delivered_seller:     { icon: Package,         color: 'bg-indigo-100 text-indigo-600', linkFn: (n) => `/orders/${n.orderId}` },
  confirmed:            { icon: CheckCircle,    color: 'bg-green-100 text-green-600',  linkFn: (n) => `/orders/${n.orderId}` },
  buyer_confirmed:      { icon: CheckCircle,    color: 'bg-green-100 text-green-600',  linkFn: (n) => `/orders/${n.orderId}` },
  auto_confirmed:       { icon: ShieldCheck,    color: 'bg-green-100 text-green-600',  linkFn: (n) => `/orders/${n.orderId}` },
  dispute_opened:       { icon: AlertTriangle,  color: 'bg-red-100 text-red-600',      linkFn: (n) => `/orders/${n.orderId}` },
  dispute_opened_buyer: { icon: AlertTriangle,  color: 'bg-orange-100 text-orange-600', linkFn: (n) => `/orders/${n.orderId}` },
  shipped:              { icon: Package,         color: 'bg-blue-100 text-blue-600',    linkFn: (n) => `/orders/${n.orderId}` },
  bundle_received:      { icon: PackagePlus,     color: 'bg-purple-100 text-purple-600', link: '/offers' },
}

const DEFAULT_CONFIG = { icon: Bell, color: 'bg-sib-sand text-sib-muted', link: '/' }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const { currentUser, getUserNotifications, markNotificationRead, markAllNotificationsRead } = useApp()
  const navigate = useNavigate()

  const notifications = currentUser ? getUserNotifications(currentUser.id) : []
  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth')
    }
  }, [currentUser, navigate])

  if (!currentUser) return null

  const handleTap = (notif) => {
    markNotificationRead(notif.id)
    const cfg = NOTIF_CONFIG[notif.type] || DEFAULT_CONFIG
    const target = cfg.linkFn ? cfg.linkFn(notif) : cfg.link
    if (target) navigate(target)
  }

  const handleMarkAllRead = () => {
    markAllNotificationsRead(currentUser.id)
  }

  return (
    <div className="px-4 py-5 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-sib-text">Notifications</h2>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-sib-primary"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-sib-sand flex items-center justify-center mb-4">
            <Bell size={28} className="text-sib-muted" />
          </div>
          <p className="text-sm font-semibold text-sib-text mb-1">No notifications yet</p>
          <p className="text-xs text-sib-muted max-w-[240px]">
            When someone makes an offer or your order updates, you'll see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const cfg = NOTIF_CONFIG[notif.type] || DEFAULT_CONFIG
            const Icon = cfg.icon
            return (
              <button
                key={notif.id}
                onClick={() => handleTap(notif)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-2xl text-left transition-colors ${
                  notif.read ? 'bg-white' : 'bg-sib-primary/5 border border-sib-primary/10'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-semibold truncate ${notif.read ? 'text-sib-text' : 'text-sib-text'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-sib-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-sib-muted leading-relaxed line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-sib-muted/60 mt-1">{timeAgo(notif.createdAt)}</p>
                </div>
                <ChevronRight size={16} className="text-sib-muted/40 flex-shrink-0 mt-2.5" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
