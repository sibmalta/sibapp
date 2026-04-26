import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Tag, Package, CheckCircle, XCircle, ArrowRightLeft, ShieldCheck, AlertTriangle, ChevronRight, PackagePlus, Truck, MessageSquare } from 'lucide-react'
import { useApp } from '../context/AppContext'

const SELLER_SHIPMENT_QUEUE = '/orders?tab=selling&shipment=awaiting_shipment'
const SELLER_DASHBOARD = '/seller'

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '')
}

function getOrderId(notif) {
  return firstValue(
    notif.actionOrderId,
    notif.action_order_id,
    notif.orderId,
    notif.order_id,
    notif.orderRef,
    notif.order_ref,
    notif.metadata?.orderId,
    notif.metadata?.order_id,
    notif.metadata?.orderRef,
    notif.metadata?.order_ref,
    notif.data?.orderId,
    notif.data?.order_id,
    notif.data?.orderRef,
    notif.data?.order_ref,
    notif.related_entity_type === 'order' ? notif.related_entity_id : null,
    notif.relatedEntityType === 'order' ? notif.relatedEntityId : null
  )
}

function getConversationId(notif) {
  return firstValue(
    notif.conversationId,
    notif.conversation_id,
    notif.threadId,
    notif.metadata?.conversationId,
    notif.metadata?.conversation_id,
    notif.data?.conversationId,
    notif.data?.conversation_id
  )
}

function orderTarget(notif, fallback = '/orders') {
  const orderId = getOrderId(notif)
  return orderId ? `/orders/${orderId}` : fallback
}

function messageTarget(notif) {
  const conversationId = getConversationId(notif)
  return conversationId ? `/messages/${conversationId}` : '/messages'
}

function isOperationalShippingNotification(notif) {
  const text = `${notif.type || ''} ${notif.title || ''} ${notif.message || ''}`.toLowerCase()
  return (
    text.includes('ship_reminder') ||
    text.includes('bundle_sold') ||
    text.includes('new sale') ||
    text.includes('ship within') ||
    text.includes('shipment') ||
    text.includes('awaiting_shipment') ||
    text.includes('collection deadline') ||
    text.includes('collection overdue')
  )
}

const NOTIF_CONFIG = {
  new_sale:             { icon: Truck,           color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: (n) => orderTarget(n, SELLER_SHIPMENT_QUEUE) },
  offer_received:       { icon: Tag,            color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: messageTarget },
  offer_accepted:       { icon: CheckCircle,    color: 'bg-green-50 text-green-600 dark:bg-[#26322f] dark:text-green-300',  linkFn: messageTarget },
  offer_declined:       { icon: XCircle,        color: 'bg-red-50 text-red-600 dark:bg-[#26322f] dark:text-red-300',      linkFn: messageTarget },
  offer_countered:      { icon: ArrowRightLeft, color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: messageTarget },
  bundle_offer_received: { icon: PackagePlus,    color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: messageTarget },
  bundle_offer_accepted: { icon: CheckCircle,    color: 'bg-green-50 text-green-600 dark:bg-[#26322f] dark:text-green-300',  linkFn: messageTarget },
  bundle_offer_declined: { icon: XCircle,        color: 'bg-red-50 text-red-600 dark:bg-[#26322f] dark:text-red-300',      linkFn: messageTarget },
  bundle_offer_countered: { icon: ArrowRightLeft, color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: messageTarget },
  delivered:            { icon: Package,         color: 'bg-sib-sand text-sib-muted dark:bg-[#26322f] dark:text-[#aeb8b4]', linkFn: (n) => orderTarget(n) },
  delivered_seller:     { icon: Package,         color: 'bg-sib-sand text-sib-muted dark:bg-[#26322f] dark:text-[#aeb8b4]', linkFn: (n) => orderTarget(n, '/seller') },
  confirmed:            { icon: CheckCircle,    color: 'bg-green-50 text-green-600 dark:bg-[#26322f] dark:text-green-300',  linkFn: (n) => orderTarget(n, '/seller') },
  buyer_confirmed:      { icon: CheckCircle,    color: 'bg-green-50 text-green-600 dark:bg-[#26322f] dark:text-green-300',  linkFn: (n) => orderTarget(n) },
  auto_confirmed:       { icon: ShieldCheck,    color: 'bg-green-50 text-green-600 dark:bg-[#26322f] dark:text-green-300',  linkFn: (n) => orderTarget(n) },
  dispute_opened:       { icon: AlertTriangle,  color: 'bg-red-50 text-red-600 dark:bg-[#26322f] dark:text-red-300',      linkFn: (n) => orderTarget(n) },
  dispute_opened_buyer: { icon: AlertTriangle,  color: 'bg-red-50 text-red-600 dark:bg-[#26322f] dark:text-red-300', linkFn: (n) => orderTarget(n) },
  dispute_message:      { icon: MessageSquare,  color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: (n) => orderTarget(n) },
  shipped:              { icon: Package,         color: 'bg-sib-sand text-sib-muted dark:bg-[#26322f] dark:text-[#aeb8b4]', linkFn: (n) => orderTarget(n) },
  ship_reminder:        { icon: Truck,           color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: (n) => orderTarget(n, SELLER_SHIPMENT_QUEUE) },
  bundle_sold:          { icon: PackagePlus,     color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: (n) => orderTarget(n, SELLER_SHIPMENT_QUEUE) },
  overdue_warning:      { icon: AlertTriangle,  color: 'bg-amber-50 text-amber-600 dark:bg-[#26322f] dark:text-amber-300',  linkFn: (n) => orderTarget(n, SELLER_SHIPMENT_QUEUE) },
  order_cancelled:      { icon: XCircle,        color: 'bg-red-50 text-red-600 dark:bg-[#26322f] dark:text-red-300',      linkFn: (n) => orderTarget(n) },
  bundle_received:      { icon: PackagePlus,     color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', link: '/offers' },
  message_received:     { icon: MessageSquare,  color: 'bg-orange-50 text-sib-primary dark:bg-[#26322f] dark:text-[#e8751a]', linkFn: messageTarget },
  payout_available:     { icon: ShieldCheck,    color: 'bg-green-50 text-green-600 dark:bg-[#26322f] dark:text-green-300',  link: SELLER_DASHBOARD },
  payout_released:      { icon: ShieldCheck,    color: 'bg-green-50 text-green-600 dark:bg-[#26322f] dark:text-green-300',  link: SELLER_DASHBOARD },
}

const DEFAULT_CONFIG = { icon: Bell, color: 'bg-sib-sand text-sib-muted', link: '/notifications' }

function resolveNotificationTarget(notif) {
  if (notif.actionTarget && notif.actionTarget !== '/') return notif.actionTarget
  if (notif.targetPath && notif.targetPath !== '/') return notif.targetPath
  const orderId = getOrderId(notif)
  if (orderId) return `/orders/${orderId}`
  if (getConversationId(notif)) return messageTarget(notif)
  if (isOperationalShippingNotification(notif)) return SELLER_SHIPMENT_QUEUE
  const cfg = NOTIF_CONFIG[notif.type] || DEFAULT_CONFIG
  return cfg.linkFn ? cfg.linkFn(notif) : cfg.link
}

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
  const { currentUser, getUserNotifications, markNotificationRead, markAllNotificationsRead, refreshNotifications } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const notifications = currentUser ? getUserNotifications(currentUser.id) : []
  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!currentUser) {
      const redirect = `${location.pathname}${location.search}`
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`, {
        replace: true,
        state: { from: redirect },
      })
      return
    }
    refreshNotifications()
  }, [currentUser, location.pathname, location.search, navigate, refreshNotifications])

  if (!currentUser) return null

  const handleTap = (notif) => {
    markNotificationRead(notif.id)
    const target = resolveNotificationTarget(notif)
    if (target) navigate(target)
  }

  const handleMarkAllRead = () => {
    markAllNotificationsRead(currentUser.id)
  }

  return (
    <div className="px-4 py-5 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-sib-text dark:text-[#f4efe7]">Notifications</h2>
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
          <div className="w-16 h-16 rounded-full bg-sib-sand dark:bg-[#26322f] flex items-center justify-center mb-4 transition-colors">
            <Bell size={28} className="text-sib-muted dark:text-[#aeb8b4]" />
          </div>
          <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7] mb-1">No notifications yet</p>
          <p className="text-xs text-sib-muted dark:text-[#aeb8b4] max-w-[240px]">
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
                  notif.read
                    ? 'sib-card border'
                    : 'bg-sib-primary/5 dark:bg-[#26322f] border border-sib-primary/10 dark:border-sib-primary/30'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate text-sib-text dark:text-[#f4efe7]">
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-sib-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-sib-muted dark:text-[#aeb8b4] leading-relaxed line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-sib-muted/60 dark:text-[#aeb8b4]/70 mt-1">{timeAgo(notif.createdAt)}</p>
                </div>
                <ChevronRight size={16} className="text-sib-muted/40 dark:text-[#aeb8b4]/60 flex-shrink-0 mt-2.5" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
