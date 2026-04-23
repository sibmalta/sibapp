import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '../lib/auth-context'
import { useListings as useListingsHook } from '../hooks/useListings'
import { useProfiles as useProfilesHook } from '../hooks/useProfiles'
import { useOrders as useOrdersHook } from '../hooks/useOrders'
import { SEED_USERS, SEED_MESSAGES, SEED_REVIEWS } from '../data/seedData'
import {
  sendOfferReceivedEmail, sendOfferAcceptedEmail, sendOfferDeclinedEmail, sendOfferCounteredEmail,
  sendOrderConfirmedEmail, sendPaymentConfirmedEmail, sendOrderCancelledEmail, sendOrderCancelledSellerEmail,
  sendItemShippedEmail, sendItemDeliveredEmail,
  sendRefundConfirmedEmail, sendDisputeOpenedEmail, sendDisputeResolvedEmail, sendDisputeMessageEmail,
  sendItemSoldEmail, sendShippingReminderEmail, sendPayoutReleasedEmail,
  sendSuspiciousActivityEmail,
  sendBundleOfferReceivedEmail, sendBundleOfferAcceptedEmail, sendBundleOfferDeclinedEmail, sendBundleOfferCounteredEmail,
} from '../lib/email'
import { createTransfer, createRefund } from '../lib/stripe'

const AppContext = createContext(null)

const PROTECTION_WINDOW_MS = 48 * 60 * 60 * 1000 // 48 hours
const SHIPPING_DEADLINE_MS = 3 * 24 * 60 * 60 * 1000 // 3 business days
const SHIPPING_REMINDER_MS = 2 * 24 * 60 * 60 * 1000 // Remind after 2 days
const SOLD_ORDER_STATUSES = new Set(['paid', 'shipped', 'delivered', 'confirmed', 'completed'])

function hasBlockingOrderForListings(orders, listingIds) {
  const ids = new Set(listingIds.filter(Boolean))
  return orders.some(order => {
    const status = order.status || order.trackingStatus
    if (!SOLD_ORDER_STATUSES.has(status)) return false
    if (ids.has(order.listingId)) return true
    return Array.isArray(order.bundleListingIds) && order.bundleListingIds.some(id => ids.has(id))
  })
}

// ── Shipment helper: create a shipment record for a paid order ───
function createShipmentRecord(order) {
  const now = new Date()
  const deadline = new Date(now.getTime() + SHIPPING_DEADLINE_MS)
  return {
    id: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    orderId: order.id,
    orderRef: order.orderRef,
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    status: 'awaiting_shipment',
    courier: 'MaltaPost',
    trackingNumber: null,
    maltapostConsignmentId: null,
    maltapostBarcode: null,
    senderAddress: null,
    recipientAddress: order.address ? { raw: order.address } : null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    shipByDeadline: deadline.toISOString(),
    shippedAt: null,
    inTransitAt: null,
    deliveredAt: null,
    failedAt: null,
    returnedAt: null,
    deliveryProof: null,
    deliverySignatureUrl: null,
    deliveryPhotoUrl: null,
    failureReason: null,
    returnReason: null,
    weightGrams: null,
    parcelSize: null,
    maltapostLabelUrl: null,
    maltapostLastSync: null,
    maltapostRawStatus: null,
    reminderSentAt: null,
    reminderCount: 0,
    notes: null,
  }
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// Bump this version whenever seed data structure changes; clears stale caches
const DATA_VERSION = 8

// getInitialOrders removed - orders are now DB-only (no localStorage fallback)

function getInitialUsers() {
  const version = loadFromStorage('sib_data_version', 0)
  if (version < DATA_VERSION) return SEED_USERS
  return loadFromStorage('sib_users', SEED_USERS)
}

// Build an app-compatible user object from a Supabase auth user
function buildAppUser(authUser) {
  if (!authUser) return null
  const meta = authUser.user_metadata || {}
  return {
    id: authUser.id,
    email: authUser.email,
    name: meta.name || meta.full_name || authUser.email?.split('@')[0] || '',
    username: meta.username || authUser.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._]/g, '') || '',
    phone: meta.phone || '',
    bio: meta.bio || '',
    avatar: meta.avatar || meta.avatar_url || null,
    rating: meta.rating ?? 5.0,
    reviewCount: meta.reviewCount ?? 0,
    joinedDate: authUser.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    isShop: meta.isShop || false,
    isAdmin: meta.isAdmin || (meta.username || '').toLowerCase() === 'sibadmin',
    sales: meta.sales ?? 0,
    location: meta.location || 'Malta',
  }
}

export function AppProvider({ children }) {
  const { user: authUser, session: authSession, loading: authLoading, signOut: authSignOut } = useAuth()

  // Derive currentUser from Supabase auth — single source of truth
  const authAppUser = useMemo(() => buildAppUser(authUser), [authUser])

  // Local seed state. Listings are intentionally empty here: Supabase is the only production listing source.
  const [localUsers]    = useState(() => getInitialUsers())
  const [localListings] = useState([])
  const [localLikes]    = useState(() => loadFromStorage('sib_likes', []))

  // ── Supabase-backed profiles hook ──────────────────────────
  const {
    users,
    dbAvailable: profilesDbAvailable,
    refreshCurrentProfile,
    updateProfile: dbUpdateProfile,
    suspendUser: dbSuspendUser,
    banUser: dbBanUser,
    restoreUser: dbRestoreUser,
    incrementUserSales,
    updateSellerBadges,
    updateTrustTags,
    updateAdminRole,
    getUserById,
    getUserByUsername,
  } = useProfilesHook(localUsers, authAppUser)

  const currentUser = useMemo(() => {
    if (!authAppUser) return null
    const profileUser = users.find(u => u.id === authAppUser.id)
    return profileUser ? { ...authAppUser, ...profileUser } : authAppUser
  }, [authAppUser, users])

  // ── Supabase-backed listings hook ──────────────────────────
  const {
    listings,
    likedListings,
    loading: listingsLoading,
    dbAvailable: listingsDbAvailable,
    createListing: dbCreateListing,
    deleteListing: dbDeleteListing,
    markSold: dbMarkSold,
    toggleLike: dbToggleLike,
    boostListing: dbBoostListing,
    unboostListing: dbUnboostListing,
    flagListing: dbFlagListing,
    approveListing: dbApproveListing,
    hideListing: dbHideListing,
    updateStyleTags: dbUpdateStyleTags,
    updateCollectionTags: dbUpdateCollectionTags,
    adminUpdateListingMeta: dbAdminUpdateListingMeta,
    getListingById,
    getUserListings,
  } = useListingsHook(localListings, localLikes, currentUser)

  // Local setters that delegate to DB hooks (so order/bundle code still works)
  const setListings = useCallback(() => {}, []) // no-op — DB hook owns listings state
  const setUsers    = useCallback(() => {}, []) // no-op — DB hook owns users state

  // ── Supabase-backed orders/disputes/payouts/shipments hook (no localStorage fallback) ────
  const {
    orders, disputes, payouts: dbPayouts, shipments,
    dbAvailable: ordersDbAvailable,
    dbError: ordersDbError,
    setOrders, setDisputes, setShipments,
    createOrder: dbCreateOrder,
    patchOrder: dbPatchOrder,
    createDispute: dbCreateDispute,
    patchDispute: dbPatchDispute,
    createPayout: dbCreatePayout,
    patchPayout: dbPatchPayout,
    createShipment: dbCreateShipment,
    patchShipment: dbPatchShipment,
    patchShipmentByOrderId: dbPatchShipmentByOrderId,
    refreshOrders,
    refreshDisputes,
    refreshShipments,
  } = useOrdersHook()

  const [conversations, setConversations] = useState(() => loadFromStorage('sib_conversations', SEED_MESSAGES))
  const [reviews, setReviews] = useState(() => loadFromStorage('sib_reviews', SEED_REVIEWS))
  const [payoutProfiles, setPayoutProfiles] = useState(() => loadFromStorage('sib_payoutProfiles', {}))
  const [notifications, setNotifications] = useState(() => loadFromStorage('sib_notifications', []))
  const [offers, setOffers] = useState(() => loadFromStorage('sib_offers', []))
  const [bundle, setBundle] = useState(() => loadFromStorage('sib_bundle', null))
  const [bundleOffers, setBundleOffers] = useState(() => loadFromStorage('sib_bundleOffers', []))
  const [toast, setToast] = useState(null)

  // ── Notification helpers (must be before effects that depend on it) ──
  const addNotification = useCallback((notif) => {
    const newNotif = {
      id: `n${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString(),
      ...notif,
    }
    setNotifications(prev => [newNotif, ...prev])
    return newNotif
  }, [])

  // ── Shipping reminder timer: check every 60s ──────────────────────
  useEffect(() => {
    const checkReminders = async () => {
      const now = Date.now()
      for (const s of shipments) {
        if (s.status !== 'awaiting_shipment') continue
        if (s.reminderSentAt || !s.createdAt) continue
        const elapsed = now - new Date(s.createdAt).getTime()
        if (elapsed >= SHIPPING_REMINDER_MS) {
          const ts = new Date().toISOString()
          await dbPatchShipmentByOrderId(s.orderId, { reminderSentAt: ts, reminderCount: (s.reminderCount || 0) + 1 })
          addNotification({
            userId: s.sellerId,
            orderId: s.orderId,
            type: 'ship_reminder',
            title: 'Collection deadline approaching',
            message: `Order ${s.orderRef || s.orderId} must be collected within 24 hours to avoid cancellation.`,
          })
          const seller = users.find(u => u.id === s.sellerId)
          if (seller?.email) {
            sendShippingReminderEmail(seller.email, seller.name, 'item', s.orderRef || s.orderId, Math.round((Date.now() - new Date(s.createdAt).getTime()) / 86400000), {
              related_entity_type: 'order',
              related_entity_id: s.orderId,
              orderId: s.orderId,
              sellerId: s.sellerId,
            })
          }
        }
      }
    }
    checkReminders()
    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  }, [users, shipments, dbPatchShipmentByOrderId, addNotification])

  // No longer persist currentUser to localStorage — derived from Supabase auth
  // Only persist users/likes to localStorage when DB is NOT available (fallback mode).
  // When DB is the source of truth, localStorage caching would create stale conflicts.
  useEffect(() => { if (!profilesDbAvailable) saveToStorage('sib_users', users) }, [users, profilesDbAvailable])
  // Listings are never cached to localStorage; Supabase is the only production listing source.
  // Orders no longer saved to localStorage — DB is sole source of truth
  useEffect(() => { saveToStorage('sib_conversations', conversations) }, [conversations])
  useEffect(() => { saveToStorage('sib_reviews', reviews) }, [reviews])
  // Disputes no longer saved to localStorage — DB is sole source of truth
  useEffect(() => { if (!listingsDbAvailable) saveToStorage('sib_likes', likedListings) }, [likedListings, listingsDbAvailable])
  useEffect(() => { saveToStorage('sib_payoutProfiles', payoutProfiles) }, [payoutProfiles])
  useEffect(() => { saveToStorage('sib_notifications', notifications) }, [notifications])
  useEffect(() => { saveToStorage('sib_offers', offers) }, [offers])
  useEffect(() => { saveToStorage('sib_bundle', bundle) }, [bundle])
  useEffect(() => { saveToStorage('sib_bundleOffers', bundleOffers) }, [bundleOffers])
  // Shipments no longer saved to localStorage — DB is sole source of truth

  // ── Auto-expire offers every 30s ──────────────────────────────────
  useEffect(() => {
    const checkExpired = () => {
      const now = Date.now()
      setOffers(prev => {
        let changed = false
        const updated = prev.map(o => {
          if ((o.status === 'pending' || o.status === 'countered') && o.expiresAt && new Date(o.expiresAt).getTime() <= now) {
            changed = true
            return { ...o, status: 'expired', updatedAt: new Date().toISOString() }
          }
          return o
        })
        return changed ? updated : prev
      })
    }
    checkExpired()
    const interval = setInterval(checkExpired, 30000)
    return () => clearInterval(interval)
  }, [])

  // ── Auto-confirm timer: check every 30s for expired 48h windows ───
  useEffect(() => {
    const checkAutoConfirm = async () => {
      const now = Date.now()
      for (const o of orders) {
        if (o.trackingStatus !== 'delivered' || !o.deliveredAt) continue
        const elapsed = now - new Date(o.deliveredAt).getTime()
        if (elapsed >= PROTECTION_WINDOW_MS) {
          const ts = new Date().toISOString()
          await dbPatchOrder(o.id, {
            trackingStatus: 'confirmed',
            payoutStatus: 'available',
            confirmedAt: ts,
            autoConfirmed: true,
          })
          addNotification({
            id: `n${Date.now()}_ac_${o.id}`,
            userId: o.buyerId,
            orderId: o.id,
            type: 'auto_confirmed',
            title: 'Order auto-confirmed',
            message: 'Your 48-hour protection window has expired. The order has been automatically confirmed.',
          })
          addNotification({
            id: `n${Date.now()}_acs_${o.id}`,
            userId: o.sellerId,
            orderId: o.id,
            type: 'confirmed',
            title: 'Delivery confirmed',
            message: 'The buyer\'s 48-hour window has expired. Your payout is now available.',
          })
        }
      }
    }
    checkAutoConfirm()
    const interval = setInterval(checkAutoConfirm, 30000)
    return () => clearInterval(interval)
  }, [orders, dbPatchOrder, addNotification])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Auth is now handled by useAuth() from auth-context.jsx
  // These stubs are kept for backward compatibility with components that reference them
  const login = useCallback(() => { throw new Error('Use useAuth().signIn instead') }, [])
  const signup = useCallback(() => { throw new Error('Use useAuth().signUp instead') }, [])
  const register = useCallback(() => { throw new Error('Use useAuth().signUp instead') }, [])
  const logout = useCallback(async () => { await authSignOut() }, [authSignOut])
  const requestPasswordReset = useCallback(() => { throw new Error('Use useAuth().resetPasswordForEmail instead') }, [])
  const validateResetToken = useCallback(() => false, [])
  const resetPassword = useCallback(() => ({ error: 'Use useAuth().updatePassword instead' }), [])

  // Delegate to DB-backed hooks
  const updateProfile = dbUpdateProfile
  const createListing = dbCreateListing
  const deleteListing = dbDeleteListing
  const toggleLike    = dbToggleLike
  const boostListing   = dbBoostListing
  const unboostListing = dbUnboostListing
  const flagListing    = dbFlagListing
  const approveListing = dbApproveListing
  const hideListing    = dbHideListing
  const updateStyleTags = dbUpdateStyleTags
  const updateCollectionTags = dbUpdateCollectionTags
  const adminUpdateListingMeta = dbAdminUpdateListingMeta

  // ── Notification helpers (must be before placeOrder which depends on it) ──
  const placeOrder = useCallback(async (listingId, deliveryMethod, address, overridePrice, deliveryInfo, deliverySnapshot) => {
    const listing = listings.find(l => l.id === listingId)
    if (!listing) return null
    if (listing.status !== 'active' || hasBlockingOrderForListings(orders, [listingId])) {
      showToast('Item already sold', 'error')
      return null
    }
    const itemPrice = overridePrice != null ? overridePrice : listing.price
    const dFee = deliveryInfo?.fee ?? 4.50
    const buyerProtectionFee = parseFloat((0.75 + itemPrice * 0.05).toFixed(2))
    const bundledFee = parseFloat((buyerProtectionFee + dFee).toFixed(2))
    const totalPrice = parseFloat((itemPrice + bundledFee).toFixed(2))
    const orderRef = `SIB-${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()
    const deliveryType = deliveryInfo?.type || 'home_delivery'
    const deliveryLabel = deliveryType === 'locker_collection' ? 'Locker Collection' : 'Home Delivery'
    const seller = users.find(u => u.id === listing.sellerId)
    const shippingAddress = {
      raw: address || null,
      bundledFee,
      buyerFullName: deliverySnapshot?.buyerFullName || currentUser?.name || null,
      buyerPhone: deliverySnapshot?.buyerPhone || null,
      buyerCity: deliverySnapshot?.buyerCity || null,
      buyerPostcode: deliverySnapshot?.buyerPostcode || null,
      deliveryNotes: deliverySnapshot?.deliveryNotes || null,
      deliveryFee: dFee,
      lockerLocationName: deliveryInfo?.lockerName || null,
      lockerAddress: deliveryInfo?.lockerAddress || null,
      sellerName: deliverySnapshot?.sellerName || seller?.name || seller?.username || null,
      sellerPhone: deliverySnapshot?.sellerPhone || seller?.phone || null,
      sellerAddress: deliverySnapshot?.sellerAddress || seller?.location || null,
    }
    const orderData = {
      orderRef,
      listingId,
      buyerId: currentUser.id,
      sellerId: listing.sellerId,
      itemPrice,
      totalPrice,
      amount: totalPrice,
      sellerPayout: itemPrice,
      platformFee: bundledFee,
      paymentFlowType: 'separate_charge',
      status: 'paid',
      deliveryMethod: deliveryType,
      deliveryFee: dFee,
      trackingStatus: 'paid',
      payoutStatus: 'held',
      paidAt: now,
      shippingAddress,
    }
    const { data: savedOrder, error: orderErr } = await dbCreateOrder(orderData)
    if (orderErr) {
      console.error('[placeOrder] DB write failed:', orderErr.message)
      showToast('Failed to place order: ' + orderErr.message, 'error')
      return null
    }
    dbMarkSold(listingId)
    incrementUserSales(listing.sellerId, 1)

    // Auto-create shipment record for this paid order
    const shipmentData = createShipmentRecord(savedOrder)
    shipmentData.deliveryType = deliveryType
    const { error: shipErr } = await dbCreateShipment(shipmentData)
    if (shipErr) console.error('[placeOrder] shipment create failed:', shipErr.message)

    // Notify seller about collection deadline
    addNotification({
      userId: listing.sellerId,
      orderId: savedOrder.id,
      type: 'ship_reminder',
      title: 'New sale — ship within 3 days',
      message: `You have a new order (${orderRef}) — ${deliveryLabel}. Please ship via MaltaPost within 3 business days.`,
    })

    // Email: order confirmation + payment confirmation to buyer
    if (currentUser?.email) {
      const emailMeta = {
        related_entity_type: 'order',
        related_entity_id: savedOrder.id,
        orderId: savedOrder.id,
        listingId: listing.id,
        sellerId: listing.sellerId,
        buyerId: currentUser.id,
      }
      sendOrderConfirmedEmail(currentUser.email, currentUser.username, orderRef, listing.title, totalPrice.toFixed(2), deliveryLabel, emailMeta)
      sendPaymentConfirmedEmail(currentUser.email, currentUser.username, orderRef, totalPrice.toFixed(2), emailMeta)
    }

    // Email: item sold notification to seller
    if (seller?.email) {
      sendItemSoldEmail(seller.email, seller.name, listing.title, orderRef, itemPrice.toFixed(2), currentUser.username, {
        related_entity_type: 'order',
        related_entity_id: savedOrder.id,
        orderId: savedOrder.id,
        listingId: listing.id,
        sellerId: seller.id,
        buyerId: currentUser.id,
      })
    }

    return savedOrder
  }, [currentUser, listings, users, orders, addNotification, dbCreateOrder, dbCreateShipment, showToast])

  const getOrCreateConversation = useCallback((otherUserId, listingId) => {
    const existing = conversations.find(c =>
      c.participants.includes(currentUser.id) &&
      c.participants.includes(otherUserId) &&
      c.listingId === listingId
    )
    if (existing) return existing
    const newConv = {
      id: `c${Date.now()}`,
      participants: [currentUser.id, otherUserId],
      listingId,
      messages: [],
    }
    setConversations(prev => [...prev, newConv])
    return newConv
  }, [currentUser, conversations])

  // sendMessage(convId, senderId, text, flagged?)
  const sendMessage = useCallback((conversationId, senderIdOrText, textArg, flagged = false) => {
    const text = textArg !== undefined ? textArg : senderIdOrText
    const newMsg = {
      id: `m${Date.now()}`,
      senderId: currentUser.id,
      text,
      timestamp: new Date().toISOString(),
      flagged: !!flagged,
    }
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c
      return { ...c, messages: [...c.messages, newMsg] }
    }))
    // Email: suspicious activity alert if message flagged
    if (flagged && currentUser?.email) {
      sendSuspiciousActivityEmail(currentUser.email, currentUser.name, 'Your message was flagged for containing contact information. Please use Sib messaging to stay protected.')
    }
    return newMsg
  }, [currentUser])

  // Mark all messages from other participants as read in a conversation
  const markConversationRead = useCallback((conversationId) => {
    if (!currentUser) return
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c
      const updated = c.messages.map(m =>
        m.senderId !== currentUser.id && !m.read ? { ...m, read: true } : m
      )
      // Only create new object if something changed
      if (updated === c.messages || updated.every((m, i) => m === c.messages[i])) return c
      return { ...c, messages: updated }
    }))
  }, [currentUser])

  // Count conversations with unread messages for a given user
  const getUnreadConversationCount = useCallback((userId) => {
    if (!userId) return 0
    return conversations.filter(c => {
      if (!c.participants.includes(userId)) return false
      const last = c.messages[c.messages.length - 1]
      return last && last.senderId !== userId && !last.read
    }).length
  }, [conversations])

  const markNotificationRead = useCallback((notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
  }, [])

  const markAllNotificationsRead = useCallback((userId) => {
    setNotifications(prev => prev.map(n => n.userId === userId ? { ...n, read: true } : n))
  }, [])

  const getUserNotifications = useCallback((userId) => {
    return notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [notifications])

  // ── Order status with delivery confirmation flow ───────────────────
  const updateOrderStatus = useCallback(async (orderId, status) => {
    const now = new Date().toISOString()
    const order = orders.find(o => o.id === orderId)
    const updates = { trackingStatus: status }
    if (status === 'shipped') updates.shippedAt = now
    if (status === 'delivered') updates.deliveredAt = now

    const { error } = await dbPatchOrder(orderId, updates)
    if (error) {
      console.error('[updateOrderStatus] DB write failed:', error.message)
      showToast('Failed to update order status: ' + error.message, 'error')
      return
    }

    if (status === 'shipped' && order) {
      const buyer = users.find(u => u.id === order.buyerId)
      const sellerUser = users.find(u => u.id === order.sellerId)
      const listing = listings.find(l => l.id === order.listingId)
      if (buyer?.email) {
        sendItemShippedEmail(buyer.email, buyer.name, listing?.title || 'item', order.orderRef || order.id, sellerUser?.username || 'seller', {
          related_entity_type: 'order',
          related_entity_id: order.id,
          orderId: order.id,
          listingId: order.listingId,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
        })
      }
    }

    if (status === 'delivered' && order) {
      addNotification({
        userId: order.buyerId,
        orderId: order.id,
        type: 'delivered',
        title: 'Your item has been delivered',
        message: 'Please confirm everything is OK. You have 48 hours to report an issue.',
      })
      addNotification({
        userId: order.sellerId,
        orderId: order.id,
        type: 'delivered_seller',
        title: 'Item delivered',
        message: 'Waiting for buyer confirmation (48h). Payment will be released after confirmation.',
      })
      const buyer = users.find(u => u.id === order.buyerId)
      const listing = listings.find(l => l.id === order.listingId)
      if (buyer?.email) {
        sendItemDeliveredEmail(buyer.email, buyer.name, listing?.title || 'item', order.orderRef || order.id, {
          related_entity_type: 'order',
          related_entity_id: order.id,
          orderId: order.id,
          listingId: order.listingId,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
        })
      }
    }
  }, [addNotification, orders, users, listings, dbPatchOrder, showToast])

  // ── Buyer confirms delivery → release payout ──────────────────────
  const confirmDelivery = useCallback(async (orderId) => {
    const now = new Date().toISOString()
    const order = orders.find(o => o.id === orderId)
    const { error } = await dbPatchOrder(orderId, {
      trackingStatus: 'confirmed',
      payoutStatus: 'available',
      confirmedAt: now,
      autoConfirmed: false,
    })
    if (error) {
      console.error('[confirmDelivery] DB write failed:', error.message)
      showToast('Failed to confirm delivery: ' + error.message, 'error')
      return
    }
    if (order) {
      addNotification({
        userId: order.sellerId,
        orderId,
        type: 'confirmed',
        title: 'Delivery confirmed by buyer',
        message: 'The buyer has confirmed the item. Your payout is now available and will be sent on the next payout day.',
      })
      addNotification({
        userId: order.buyerId,
        orderId,
        type: 'buyer_confirmed',
        title: 'Order confirmed',
        message: 'Thank you for confirming. The seller will receive their payment.',
      })
    }
  }, [orders, users, listings, addNotification, dbPatchOrder, showToast])

  // ── Dispute reason types ──────────────────────────────────────────
  const DISPUTE_REASONS = {
    not_received: 'Item not received',
    not_as_described: 'Item not as described',
    wrong_item: 'Wrong item received',
    damaged: 'Damaged item',
    overdue_shipment: 'Overdue shipment',
    admin_review: 'Admin review',
  }

  // ── Buyer opens dispute ───────────────────────────────────────────
  const openDispute = useCallback(async (orderId, reason, opts = {}) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return null
    // Prevent duplicate dispute on same order
    const existing = disputes.find(d => d.orderId === orderId && d.status === 'open')
    if (existing) return existing
    const type = opts.type || 'not_as_described'
    const description = reason || DISPUTE_REASONS[type] || reason
    const source = opts.source || 'buyer' // 'buyer', 'admin', 'system'

    const { data: newDispute, error: disputeErr } = await dbCreateDispute({
      orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      type,
      reason: description,
      description,
      status: 'open',
      source,
      messages: [],
      adminMessages: [],
    })
    if (disputeErr) {
      console.error('[openDispute] DB write failed:', disputeErr.message)
      showToast('Failed to open dispute: ' + disputeErr.message, 'error')
      return null
    }

    const { error: orderErr } = await dbPatchOrder(orderId, { trackingStatus: 'under_review', payoutStatus: 'held' })
    if (orderErr) console.error('[openDispute] order patch failed:', orderErr.message)

    addNotification({
      userId: order.sellerId,
      orderId,
      type: 'dispute_opened',
      title: source === 'admin' ? 'Admin opened a dispute' : 'Buyer reported an issue',
      message: `${source === 'admin' ? 'An admin has opened a dispute' : 'The buyer has reported an issue'}: "${description}". Your payout is on hold until this is resolved.`,
    })
    addNotification({
      userId: order.buyerId,
      orderId,
      type: 'dispute_opened_buyer',
      title: source === 'admin' ? 'Admin review opened' : 'Issue reported',
      message: source === 'admin'
        ? 'An admin has opened a review on your order. Your payment is protected until it is resolved.'
        : 'We have received your report. Our team will review and get back to you shortly.',
    })

    // Email: dispute confirmation to buyer
    const buyer = users.find(u => u.id === order.buyerId)
    if (buyer?.email) {
      sendDisputeOpenedEmail(buyer.email, buyer.name, order.orderRef || orderId, description, 'buyer', {
        related_entity_type: 'dispute',
        related_entity_id: newDispute.id,
        disputeId: newDispute.id,
        orderId: order.id,
        listingId: order.listingId,
        sellerId: order.sellerId,
        buyerId: order.buyerId,
      })
    }
    const seller = users.find(u => u.id === order.sellerId)
    if (seller?.email) {
      sendDisputeOpenedEmail(seller.email, seller.name, order.orderRef || orderId, description, 'seller', {
        related_entity_type: 'dispute',
        related_entity_id: newDispute.id,
        disputeId: newDispute.id,
        orderId: order.id,
        listingId: order.listingId,
        sellerId: order.sellerId,
        buyerId: order.buyerId,
      })
    }

    return newDispute
  }, [orders, disputes, users, addNotification, dbCreateDispute, dbPatchOrder, showToast])

  // ── Admin opens dispute on an order ─────────────────────────────
  const adminOpenDispute = useCallback((orderId, reason) => {
    return openDispute(orderId, reason || 'Opened for admin review', { type: 'admin_review', source: 'admin' })
  }, [openDispute])

  // ── Flag overdue order for admin review (does NOT create dispute) ─
  const flagOrderOverdue = useCallback(async (orderId) => {
    const { error } = await dbPatchOrder(orderId, { overdueFlag: true, overdueFlaggedAt: new Date().toISOString() })
    if (error) {
      console.error('[flagOrderOverdue] DB write failed:', error.message)
      return
    }
    const order = orders.find(o => o.id === orderId)
    if (order) {
      addNotification({
        userId: order.sellerId,
        orderId,
        type: 'overdue_warning',
        title: 'Collection overdue',
        message: 'Your collection is overdue. Please prepare the item immediately to avoid order cancellation.',
      })
    }
  }, [orders, addNotification, dbPatchOrder])

  // ── Check and flag overdue shipments on mount / periodically ──
  useEffect(() => {
    const now = Date.now()
    orders.forEach(o => {
      if (o.trackingStatus !== 'pending' && o.trackingStatus !== 'paid') return
      if (o.overdueFlag) return // already flagged
      const shipment = shipments.find(s => s.orderId === o.id)
      if (!shipment) return
      const deadline = new Date(shipment.shipByDeadline).getTime()
      if (now > deadline) {
        flagOrderOverdue(o.id)
      }
    })
  }, [orders, shipments]) // runs when orders or shipments change

  // ── Seller payout profile ─────────────────────────────────────────
  const savePayoutProfile = useCallback((userId, profile) => {
    setPayoutProfiles(prev => ({
      ...prev,
      [userId]: { ...profile, createdAt: new Date().toISOString() },
    }))
  }, [])

  const getPayoutProfile = useCallback((userId) => {
    const user = getUserById(userId)
    if (user?.stripeAccountId) {
      return {
        provider: 'stripe',
        stripeAccountId: user.stripeAccountId,
        detailsSubmitted: !!user.detailsSubmitted,
        chargesEnabled: !!user.chargesEnabled,
        payoutsEnabled: !!user.payoutsEnabled,
        createdAt: user.stripeStatusUpdatedAt || user.createdAt || null,
      }
    }
    return payoutProfiles[userId] || null
  }, [payoutProfiles, getUserById])

  // ── Offers system ──────────────────────────────────────────────────
  const MAX_ACTIVE_OFFERS_PER_USER = 10
  const OFFER_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

  const createOffer = useCallback((listingId, price) => {
    if (!currentUser) return { error: 'Login required.' }
    const listing = listings.find(l => l.id === listingId)
    if (!listing) return { error: 'Listing not found.' }
    if (listing.sellerId === currentUser.id) return { error: 'Cannot offer on your own listing.' }

    // Anti-spam: active offer limit
    const activeOffers = offers.filter(o => o.buyerId === currentUser.id && (o.status === 'pending' || o.status === 'countered'))
    if (activeOffers.length >= MAX_ACTIVE_OFFERS_PER_USER) {
      return { error: `You can only have ${MAX_ACTIVE_OFFERS_PER_USER} active offers at a time.` }
    }

    // Prevent duplicate pending offer on same item
    const existingOnItem = offers.find(o => o.buyerId === currentUser.id && o.listingId === listingId && (o.status === 'pending' || o.status === 'countered'))
    if (existingOnItem) return { error: 'You already have an active offer on this item.' }

    const now = new Date()
    const newOffer = {
      id: `of${Date.now()}`,
      listingId,
      buyerId: currentUser.id,
      sellerId: listing.sellerId,
      price,
      status: 'pending',
      counterPrice: null,
      acceptedPrice: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + OFFER_EXPIRY_MS).toISOString(),
    }
    setOffers(prev => [newOffer, ...prev])

    addNotification({
      userId: listing.sellerId,
      type: 'offer_received',
      title: 'New offer received',
      message: `@${currentUser.username} offered €${price} on "${listing.title}"`,
    })

    // Email: notify seller about new offer
    const seller = users.find(u => u.id === listing.sellerId)
    if (seller?.email) {
      sendOfferReceivedEmail(seller.email, listing.title, price, currentUser.username)
    }

    return { offer: newOffer }
  }, [currentUser, listings, offers, users, addNotification])

  const acceptOffer = useCallback((offerId) => {
    const now = new Date()
    setOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o
      const acceptedPrice = o.counterPrice || o.price
      return { ...o, status: 'accepted', acceptedPrice, updatedAt: now.toISOString() }
    }))
    const offer = offers.find(o => o.id === offerId)
    if (offer) {
      const listing = listings.find(l => l.id === offer.listingId)
      const acceptedPrice = offer.counterPrice || offer.price
      const notifyUserId = offer.status === 'countered' ? offer.sellerId : offer.buyerId
      const acceptor = users.find(u => u.id === (offer.status === 'countered' ? offer.buyerId : offer.sellerId))
      addNotification({
        userId: notifyUserId,
        type: 'offer_accepted',
        title: 'Offer accepted',
        message: `@${acceptor?.username || 'user'} accepted €${acceptedPrice} on "${listing?.title || 'item'}"`,
      })

      // Email: notify buyer that offer was accepted
      const buyer = users.find(u => u.id === offer.buyerId)
      const sellerUser = users.find(u => u.id === offer.sellerId)
      if (buyer?.email) {
        sendOfferAcceptedEmail(buyer.email, listing?.title || 'item', acceptedPrice, sellerUser?.username || 'seller')
      }
    }
  }, [offers, listings, users, addNotification])

  const declineOffer = useCallback((offerId) => {
    const now = new Date()
    setOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o
      return { ...o, status: 'declined', updatedAt: now.toISOString() }
    }))
    const offer = offers.find(o => o.id === offerId)
    if (offer) {
      const listing = listings.find(l => l.id === offer.listingId)
      const notifyUserId = offer.status === 'countered' ? offer.sellerId : offer.buyerId
      const decliner = users.find(u => u.id === (offer.status === 'countered' ? offer.buyerId : offer.sellerId))
      addNotification({
        userId: notifyUserId,
        type: 'offer_declined',
        title: 'Offer declined',
        message: `@${decliner?.username || 'user'} declined your ${offer.status === 'countered' ? 'counter' : 'offer'} on "${listing?.title || 'item'}"`,
      })

      // Email: notify the other party that offer was declined
      const recipientId = notifyUserId
      const recipient = users.find(u => u.id === recipientId)
      if (recipient?.email) {
        sendOfferDeclinedEmail(recipient.email, listing?.title || 'item', offer.counterPrice || offer.price, decliner?.username || 'user')
      }
    }
  }, [offers, listings, users, addNotification])

  const counterOffer = useCallback((offerId, counterPrice) => {
    const now = new Date()
    setOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o
      return {
        ...o,
        status: 'countered',
        counterPrice,
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + OFFER_EXPIRY_MS).toISOString(),
      }
    }))
    const offer = offers.find(o => o.id === offerId)
    if (offer) {
      const listing = listings.find(l => l.id === offer.listingId)
      const seller = users.find(u => u.id === offer.sellerId)
      addNotification({
        userId: offer.buyerId,
        type: 'offer_countered',
        title: 'Counter offer received',
        message: `@${seller?.username || 'seller'} countered with €${counterPrice} on "${listing?.title || 'item'}"`,
      })

      // Email: notify buyer about counter offer
      const buyer = users.find(u => u.id === offer.buyerId)
      if (buyer?.email) {
        sendOfferCounteredEmail(buyer.email, listing?.title || 'item', offer.price, counterPrice, seller?.username || 'seller')
      }
    }
  }, [offers, listings, users, addNotification])

  const getOfferById = useCallback((id) => offers.find(o => o.id === id), [offers])

  const getListingOffers = useCallback((listingId) => {
    return offers.filter(o => o.listingId === listingId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [offers])

  const getUserActiveOfferOnListing = useCallback((userId, listingId) => {
    return offers.find(o => o.buyerId === userId && o.listingId === listingId && (o.status === 'pending' || o.status === 'countered' || o.status === 'accepted'))
  }, [offers])

  // ── Bundle system ──────────────────────────────────────────────────
  // Bundle: { sellerId, items: [listingId, ...] }
  const addToBundle = useCallback((listingId) => {
    if (!currentUser) return { error: 'Login required.' }
    const listing = listings.find(l => l.id === listingId)
    if (!listing) return { error: 'Listing not found.' }
    if (listing.sellerId === currentUser.id) return { error: 'Cannot bundle your own items.' }
    if (listing.status !== 'active') return { error: 'This item is no longer available.' }

    setBundle(prev => {
      // No bundle yet — create one
      if (!prev || prev.items.length === 0) {
        return { sellerId: listing.sellerId, items: [listingId] }
      }
      // Different seller — reject
      if (prev.sellerId !== listing.sellerId) {
        return prev // handled below via return
      }
      // Already in bundle
      if (prev.items.includes(listingId)) return prev
      return { ...prev, items: [...prev.items, listingId] }
    })

    // Check seller mismatch synchronously
    if (bundle && bundle.items.length > 0 && bundle.sellerId !== listing.sellerId) {
      return { error: 'Bundles can only include items from one seller.' }
    }

    return { ok: true }
  }, [currentUser, listings, bundle])

  const removeFromBundle = useCallback((listingId) => {
    setBundle(prev => {
      if (!prev) return null
      const newItems = prev.items.filter(id => id !== listingId)
      if (newItems.length === 0) return null
      return { ...prev, items: newItems }
    })
  }, [])

  const clearBundle = useCallback(() => {
    setBundle(null)
  }, [])

  const isInBundle = useCallback((listingId) => {
    return bundle?.items?.includes(listingId) || false
  }, [bundle])

  const calculateBundleFees = useCallback((subtotal, deliveryFeeOverride) => {
    const buyerProtectionFee = parseFloat((0.75 + subtotal * 0.05).toFixed(2))
    const deliveryFee = typeof deliveryFeeOverride === 'number' ? deliveryFeeOverride : 4.50
    const bundledFee = parseFloat((buyerProtectionFee + deliveryFee).toFixed(2))
    const total = parseFloat((subtotal + bundledFee).toFixed(2))
    return { buyerProtectionFee, deliveryFee, bundledFee, total }
  }, [])

  const placeBundleOrder = useCallback(async (address, overrideSubtotal, deliveryInfo, deliverySnapshot) => {
    if (!currentUser || !bundle || bundle.items.length === 0) return null
    const items = bundle.items.map(id => listings.find(l => l.id === id)).filter(Boolean)
    if (items.length === 0) return null
    if (items.length !== bundle.items.length || items.some(item => item.status !== 'active') || hasBlockingOrderForListings(orders, bundle.items)) {
      showToast('Item already sold', 'error')
      return null
    }

    const subtotal = overrideSubtotal != null ? overrideSubtotal : items.reduce((sum, l) => sum + l.price, 0)
    const dFee = deliveryInfo?.fee ?? 4.50
    const fees = calculateBundleFees(subtotal, dFee)
    const deliveryType = deliveryInfo?.type || 'home_delivery'
    const deliveryLabel = deliveryType === 'locker_collection' ? 'Locker Collection' : 'Home Delivery'
    const orderRef = `SIB-B${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()
    const seller = users.find(u => u.id === bundle.sellerId)
    const shippingAddress = {
      raw: address || null,
      bundledFee: fees.bundledFee,
      buyerFullName: deliverySnapshot?.buyerFullName || currentUser?.name || null,
      buyerPhone: deliverySnapshot?.buyerPhone || null,
      buyerCity: deliverySnapshot?.buyerCity || null,
      buyerPostcode: deliverySnapshot?.buyerPostcode || null,
      deliveryNotes: deliverySnapshot?.deliveryNotes || null,
      deliveryFee: dFee,
      lockerLocationName: deliveryInfo?.lockerName || null,
      lockerAddress: deliveryInfo?.lockerAddress || null,
      sellerName: deliverySnapshot?.sellerName || seller?.name || seller?.username || null,
      sellerPhone: deliverySnapshot?.sellerPhone || seller?.phone || null,
      sellerAddress: deliverySnapshot?.sellerAddress || seller?.location || null,
    }

    const orderData = {
      orderRef,
      isBundle: true,
      bundleListingIds: bundle.items,
      listingId: bundle.items[0],
      buyerId: currentUser.id,
      sellerId: bundle.sellerId,
      itemPrice: subtotal,
      totalPrice: fees.total,
      amount: fees.total,
      sellerPayout: subtotal,
      platformFee: fees.bundledFee,
      paymentFlowType: 'separate_charge',
      status: 'paid',
      deliveryMethod: deliveryType,
      deliveryFee: dFee,
      trackingStatus: 'paid',
      payoutStatus: 'held',
      paidAt: now,
      shippingAddress,
    }

    const { data: savedOrder, error: orderErr } = await dbCreateOrder(orderData)
    if (orderErr) {
      console.error('[placeBundleOrder] DB write failed:', orderErr.message)
      showToast('Failed to place bundle order: ' + orderErr.message, 'error')
      return null
    }

    // Mark all bundled listings as sold via DB hook
    bundle.items.forEach(id => dbMarkSold(id))
    incrementUserSales(bundle.sellerId, items.length)

    // Auto-create shipment record for this paid bundle order
    const shipmentData = createShipmentRecord(savedOrder)
    shipmentData.deliveryType = deliveryType
    const { error: shipErr } = await dbCreateShipment(shipmentData)
    if (shipErr) console.error('[placeBundleOrder] shipment create failed:', shipErr.message)

    // Notify seller
    addNotification({
      userId: bundle.sellerId,
      orderId: savedOrder.id,
      type: 'bundle_sold',
      title: `${items.length}-item bundle sold — ship within 3 days`,
      message: `@${currentUser.username} purchased ${items.length} items for €${fees.total.toFixed(2)} — ${deliveryLabel}. Ship via MaltaPost within 3 business days.`,
    })

    // Email buyer order confirmation + payment confirmation
    if (currentUser?.email) {
      const emailMeta = {
        related_entity_type: 'order',
        related_entity_id: savedOrder.id,
        orderId: savedOrder.id,
        listingId: savedOrder.listingId,
        sellerId: bundle.sellerId,
        buyerId: currentUser.id,
        bundle: true,
      }
      sendOrderConfirmedEmail(currentUser.email, currentUser.username, orderRef, `${items.length}-item bundle`, fees.total.toFixed(2), deliveryLabel, emailMeta)
      sendPaymentConfirmedEmail(currentUser.email, currentUser.username, orderRef, fees.total.toFixed(2), emailMeta)
    }

    // Email: item sold notification to seller
    if (seller?.email) {
      sendItemSoldEmail(seller.email, seller.name, `${items.length}-item bundle`, orderRef, subtotal.toFixed(2), currentUser.username, {
        related_entity_type: 'order',
        related_entity_id: savedOrder.id,
        orderId: savedOrder.id,
        listingId: savedOrder.listingId,
        sellerId: bundle.sellerId,
        buyerId: currentUser.id,
        bundle: true,
      })
    }

    // Clear bundle after order
    setBundle(null)
    return savedOrder
  }, [currentUser, bundle, listings, users, orders, calculateBundleFees, addNotification, dbCreateOrder, dbCreateShipment, showToast])

  // ── Bundle Offer system ──────────────────────────────────────────
  const BUNDLE_OFFER_EXPIRY_MS = 24 * 60 * 60 * 1000

  // Auto-expire bundle offers
  useEffect(() => {
    const checkBundleExpired = () => {
      const now = Date.now()
      setBundleOffers(prev => {
        let changed = false
        const updated = prev.map(o => {
          if ((o.status === 'pending' || o.status === 'countered') && o.expiresAt && new Date(o.expiresAt).getTime() <= now) {
            changed = true
            return { ...o, status: 'expired', updatedAt: new Date().toISOString() }
          }
          return o
        })
        return changed ? updated : prev
      })
    }
    checkBundleExpired()
    const interval = setInterval(checkBundleExpired, 30000)
    return () => clearInterval(interval)
  }, [])

  const createBundleOffer = useCallback((price) => {
    if (!currentUser) return { error: 'Login required.' }
    if (!bundle || bundle.items.length === 0) return { error: 'Bundle is empty.' }

    const items = bundle.items.map(id => listings.find(l => l.id === id)).filter(Boolean)
    const subtotal = items.reduce((sum, l) => sum + l.price, 0)
    const seller = users.find(u => u.id === bundle.sellerId)

    // Prevent duplicate active bundle offer to same seller
    const existing = bundleOffers.find(o =>
      o.buyerId === currentUser.id && o.sellerId === bundle.sellerId &&
      (o.status === 'pending' || o.status === 'countered')
    )
    if (existing) return { error: 'You already have an active bundle offer to this seller.' }

    const now = new Date()
    const newOffer = {
      id: `bo${Date.now()}`,
      type: 'bundle',
      listingIds: [...bundle.items],
      buyerId: currentUser.id,
      sellerId: bundle.sellerId,
      price,
      originalTotal: subtotal,
      itemCount: items.length,
      status: 'pending',
      counterPrice: null,
      acceptedPrice: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + BUNDLE_OFFER_EXPIRY_MS).toISOString(),
    }
    setBundleOffers(prev => [newOffer, ...prev])

    addNotification({
      userId: bundle.sellerId,
      type: 'bundle_offer_received',
      title: `New bundle offer: €${price} for ${items.length} items`,
      message: `@${currentUser.username} offered €${price} for your ${items.length}-item bundle (original total: €${subtotal.toFixed(2)})`,
      bundleOfferId: newOffer.id,
    })

    // Email: notify seller about new bundle offer
    if (seller?.email) {
      sendBundleOfferReceivedEmail(seller.email, items.length, price, subtotal.toFixed(2), currentUser.username)
    }

    return { offer: newOffer }
  }, [currentUser, bundle, listings, users, bundleOffers, addNotification])

  const acceptBundleOffer = useCallback((offerId) => {
    const now = new Date()
    const offer = bundleOffers.find(o => o.id === offerId)
    if (!offer) return

    const acceptedPrice = offer.counterPrice || offer.price
    setBundleOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o
      return { ...o, status: 'accepted', acceptedPrice, updatedAt: now.toISOString() }
    }))

    const buyer = users.find(u => u.id === offer.buyerId)
    const notifyUserId = offer.status === 'countered' ? offer.sellerId : offer.buyerId
    const acceptor = users.find(u => u.id === (offer.status === 'countered' ? offer.buyerId : offer.sellerId))

    addNotification({
      userId: notifyUserId,
      type: 'bundle_offer_accepted',
      title: 'Bundle offer accepted',
      message: `@${acceptor?.username || 'user'} accepted €${acceptedPrice} for the ${offer.itemCount}-item bundle`,
      bundleOfferId: offerId,
    })

    const notifyUser = users.find(u => u.id === notifyUserId)
    if (notifyUser?.email) sendBundleOfferAcceptedEmail(notifyUser.email, offer.itemCount, acceptedPrice.toFixed(2), acceptor?.username || 'user')
  }, [bundleOffers, users, addNotification])

  const declineBundleOffer = useCallback((offerId) => {
    const now = new Date()
    const offer = bundleOffers.find(o => o.id === offerId)
    if (!offer) return

    setBundleOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o
      return { ...o, status: 'declined', updatedAt: now.toISOString() }
    }))

    const notifyUserId = offer.status === 'countered' ? offer.sellerId : offer.buyerId
    const decliner = users.find(u => u.id === (offer.status === 'countered' ? offer.buyerId : offer.sellerId))

    addNotification({
      userId: notifyUserId,
      type: 'bundle_offer_declined',
      title: 'Bundle offer declined',
      message: `@${decliner?.username || 'user'} declined your bundle offer`,
      bundleOfferId: offerId,
    })

    const notifyUser = users.find(u => u.id === notifyUserId)
    if (notifyUser?.email) sendBundleOfferDeclinedEmail(notifyUser.email, offer.itemCount, offer.price.toFixed(2), decliner?.username || 'user')
  }, [bundleOffers, users, addNotification])

  const counterBundleOffer = useCallback((offerId, counterPrice) => {
    const now = new Date()
    const offer = bundleOffers.find(o => o.id === offerId)
    if (!offer) return

    setBundleOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o
      return {
        ...o,
        status: 'countered',
        counterPrice,
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + BUNDLE_OFFER_EXPIRY_MS).toISOString(),
      }
    }))

    const seller = users.find(u => u.id === offer.sellerId)
    addNotification({
      userId: offer.buyerId,
      type: 'bundle_offer_countered',
      title: 'Counter offer received',
      message: `@${seller?.username || 'seller'} countered with €${counterPrice} for your ${offer.itemCount}-item bundle`,
      bundleOfferId: offerId,
    })

    const buyer = users.find(u => u.id === offer.buyerId)
    if (buyer?.email) sendBundleOfferCounteredEmail(buyer.email, offer.itemCount, offer.price.toFixed(2), counterPrice.toFixed(2), seller?.username || 'seller')
  }, [bundleOffers, users, addNotification])

  const getBundleOfferById = useCallback((id) => bundleOffers.find(o => o.id === id), [bundleOffers])

  const placeBundleOfferOrder = useCallback(async (offerId, address, deliveryInfo, deliverySnapshot) => {
    const offer = bundleOffers.find(o => o.id === offerId)
    if (!offer || offer.status !== 'accepted') return null
    const acceptedPrice = offer.acceptedPrice || offer.counterPrice || offer.price
    const items = offer.listingIds.map(id => listings.find(l => l.id === id)).filter(Boolean)
    if (items.length === 0) return null
    if (items.length !== offer.listingIds.length || items.some(item => item.status !== 'active') || hasBlockingOrderForListings(orders, offer.listingIds)) {
      showToast('Item already sold', 'error')
      return null
    }

    const dFee = deliveryInfo?.fee ?? 4.50
    const fees = calculateBundleFees(acceptedPrice, dFee)
    const deliveryType = deliveryInfo?.type || 'home_delivery'
    const deliveryLabel = deliveryType === 'locker_collection' ? 'Locker Collection' : 'Home Delivery'
    const orderRef = `SIB-B${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()
    const sellerUser = users.find(u => u.id === offer.sellerId)
    const shippingAddress = {
      raw: address || null,
      bundledFee: fees.bundledFee,
      buyerFullName: deliverySnapshot?.buyerFullName || null,
      buyerPhone: deliverySnapshot?.buyerPhone || null,
      buyerCity: deliverySnapshot?.buyerCity || null,
      buyerPostcode: deliverySnapshot?.buyerPostcode || null,
      deliveryNotes: deliverySnapshot?.deliveryNotes || null,
      deliveryFee: dFee,
      lockerLocationName: deliveryInfo?.lockerName || null,
      lockerAddress: deliveryInfo?.lockerAddress || null,
      sellerName: deliverySnapshot?.sellerName || sellerUser?.name || sellerUser?.username || null,
      sellerPhone: deliverySnapshot?.sellerPhone || sellerUser?.phone || null,
      sellerAddress: deliverySnapshot?.sellerAddress || sellerUser?.location || null,
    }

    const orderData = {
      orderRef,
      isBundle: true,
      bundleListingIds: offer.listingIds,
      listingId: offer.listingIds[0],
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      itemPrice: acceptedPrice,
      totalPrice: fees.total,
      amount: fees.total,
      sellerPayout: acceptedPrice,
      platformFee: fees.bundledFee,
      paymentFlowType: 'separate_charge',
      status: 'paid',
      deliveryMethod: deliveryType,
      deliveryFee: dFee,
      trackingStatus: 'paid',
      payoutStatus: 'held',
      paidAt: now,
      shippingAddress,
      bundleOfferId: offerId,
    }

    const { data: savedOrder, error: orderErr } = await dbCreateOrder(orderData)
    if (orderErr) {
      console.error('[placeBundleOfferOrder] DB write failed:', orderErr.message)
      showToast('Failed to place bundle offer order: ' + orderErr.message, 'error')
      return null
    }

    // Mark all bundled listings as sold via DB hook
    offer.listingIds.forEach(id => dbMarkSold(id))
    incrementUserSales(offer.sellerId, items.length)

    // Auto-create shipment record for this paid bundle offer order
    const shipmentData = createShipmentRecord(savedOrder)
    shipmentData.deliveryType = deliveryType
    const { error: shipErr } = await dbCreateShipment(shipmentData)
    if (shipErr) console.error('[placeBundleOfferOrder] shipment create failed:', shipErr.message)

    addNotification({
      userId: offer.sellerId,
      orderId: savedOrder.id,
      type: 'bundle_sold',
      title: `${items.length}-item bundle sold — ship within 3 days`,
      message: `@${users.find(u => u.id === offer.buyerId)?.username || 'buyer'} purchased ${items.length} items for €${fees.total.toFixed(2)} — ${deliveryLabel}. Ship via MaltaPost within 3 business days.`,
    })

    // Email buyer order confirmation
    const buyer = users.find(u => u.id === offer.buyerId)
    if (buyer?.email) {
      const emailMeta = {
        related_entity_type: 'order',
        related_entity_id: savedOrder.id,
        orderId: savedOrder.id,
        listingId: savedOrder.listingId,
        sellerId: offer.sellerId,
        buyerId: offer.buyerId,
        bundle: true,
        bundleOfferId: offerId,
      }
      sendOrderConfirmedEmail(buyer.email, buyer.username, orderRef, `${items.length}-item bundle`, fees.total.toFixed(2), deliveryLabel, emailMeta)
      sendPaymentConfirmedEmail(buyer.email, buyer.username, orderRef, fees.total.toFixed(2), emailMeta)
    }

    // Email seller sold notification
    if (sellerUser?.email) {
      sendItemSoldEmail(sellerUser.email, sellerUser.name, `${items.length}-item bundle`, orderRef, acceptedPrice.toFixed(2), buyer?.username || 'buyer', {
        related_entity_type: 'order',
        related_entity_id: savedOrder.id,
        orderId: savedOrder.id,
        listingId: savedOrder.listingId,
        sellerId: offer.sellerId,
        buyerId: offer.buyerId,
        bundle: true,
        bundleOfferId: offerId,
      })
    }

    // Clear buyer's bundle if it matches
    setBundle(prev => {
      if (prev && prev.sellerId === offer.sellerId) return null
      return prev
    })

    return savedOrder
  }, [bundleOffers, listings, users, orders, calculateBundleFees, addNotification, dbCreateOrder, dbCreateShipment, showToast])

  // ── Admin actions — delegate to DB-backed profile hook ────────────
  const suspendUser = dbSuspendUser
  const banUser = dbBanUser
  const restoreUser = dbRestoreUser

  const holdPayout = useCallback(async (orderId) => {
    const { error } = await dbPatchOrder(orderId, { payoutStatus: 'held' })
    if (error) {
      console.error('[holdPayout] DB write failed:', error.message)
      showToast('Failed to hold payout: ' + error.message, 'error')
    }
  }, [dbPatchOrder, showToast])

  const releasePayout = useCallback(async (orderId) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) {
      showToast('Order not found', 'error')
      return
    }

    const accessToken = authSession?.access_token
    if (!accessToken) {
      showToast('You must be signed in to release payouts', 'error')
      return
    }

    // Call Stripe Transfer Edge Function — it also updates the order in DB
    try {
      const amountCents = Math.round((order.sellerPayout || 0) * 100)
      await createTransfer({
        orderId: order.id,
        amount: amountCents,
        sellerId: order.sellerId,
      }, accessToken)
    } catch (stripeErr) {
      console.error('[releasePayout] Stripe transfer failed:', stripeErr.message)
      showToast('Stripe transfer failed: ' + stripeErr.message, 'error')
      return
    }

    // Refresh orders from DB to pick up the Edge Function's updates
    await refreshOrders()

    const seller = users.find(u => u.id === order.sellerId)
    const listing = listings.find(l => l.id === order.listingId)
    if (seller?.email) {
      sendPayoutReleasedEmail(seller.email, seller.name, order.orderRef || order.id, order.sellerPayout?.toFixed(2) || '0.00', listing?.title || 'item', {
        related_entity_type: 'order',
        related_entity_id: order.id,
        orderId: order.id,
        listingId: order.listingId,
        sellerId: order.sellerId,
        buyerId: order.buyerId,
      })
    }
  }, [orders, users, listings, authSession, refreshOrders, showToast])

  const refundOrder = useCallback(async (orderId) => {
    const accessToken = authSession?.access_token
    if (!accessToken) {
      showToast('You must be signed in to process refunds', 'error')
      return
    }

    // Call Stripe Refund Edge Function — it also updates the order in DB
    try {
      await createRefund(orderId, 'requested_by_customer', accessToken)
    } catch (stripeErr) {
      console.error('[refundOrder] Stripe refund failed:', stripeErr.message)
      showToast('Stripe refund failed: ' + stripeErr.message, 'error')
      return
    }

    // Refresh orders from DB to pick up the Edge Function's updates
    await refreshOrders()

    const order = orders.find(o => o.id === orderId)
    if (order) {
      const buyer = users.find(u => u.id === order.buyerId)
      const listing = listings.find(l => l.id === order.listingId)
      if (buyer?.email) {
        sendRefundConfirmedEmail(buyer.email, buyer.name, order.orderRef || orderId, order.totalPrice?.toFixed(2) || '0.00', listing?.title || 'item', {
          related_entity_type: 'order',
          related_entity_id: order.id,
          orderId: order.id,
          listingId: order.listingId,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
        })
      }
    }
  }, [orders, users, listings, authSession, refreshOrders, showToast])

  const resolveDispute = useCallback(async (disputeId, resolution) => {
    const { error } = await dbPatchDispute(disputeId, { status: 'resolved', resolution })
    if (error) {
      console.error('[resolveDispute] DB write failed:', error.message)
      showToast('Failed to resolve dispute: ' + error.message, 'error')
      return
    }
    if (resolution === 'refunded') {
      const dispute = disputes.find(d => d.id === disputeId)
      if (dispute) await refundOrder(dispute.orderId)
    }
    if (resolution === 'seller_payout') {
      const dispute = disputes.find(d => d.id === disputeId)
      if (dispute) await releasePayout(dispute.orderId)
    }
    // Send dispute resolved emails to both buyer and seller
    const dispute = disputes.find(d => d.id === disputeId)
    if (dispute) {
      const order = orders.find(o => o.id === dispute.orderId)
      const listing = order ? listings.find(l => l.id === order.listingId) : null
      const buyer = users.find(u => u.id === dispute.buyerId)
      const seller = users.find(u => u.id === dispute.sellerId)
      const orderRef = order?.orderRef || order?.id || 'N/A'
      if (buyer?.email) sendDisputeResolvedEmail(buyer.email, buyer.name, orderRef, resolution, {
        related_entity_type: 'dispute',
        related_entity_id: dispute.id,
        disputeId: dispute.id,
        orderId: order?.id,
        listingId: order?.listingId,
        sellerId: dispute.sellerId,
        buyerId: dispute.buyerId,
      })
      if (seller?.email) sendDisputeResolvedEmail(seller.email, seller.name, orderRef, resolution, {
        related_entity_type: 'dispute',
        related_entity_id: dispute.id,
        disputeId: dispute.id,
        orderId: order?.id,
        listingId: order?.listingId,
        sellerId: dispute.sellerId,
        buyerId: dispute.buyerId,
      })
    }
  }, [disputes, orders, users, listings, dbPatchDispute, refundOrder, releasePayout, showToast])

  // ── Admin: cancel order ──────────────────────────────────────────
  const cancelOrder = useCallback(async (orderId) => {
    const now = new Date().toISOString()
    const { error } = await dbPatchOrder(orderId, {
      trackingStatus: 'cancelled', payoutStatus: 'refunded', status: 'cancelled', updatedAt: now, cancelledAt: now,
    })
    if (error) {
      console.error('[cancelOrder] DB write failed:', error.message)
      showToast('Failed to cancel order: ' + error.message, 'error')
      return
    }
    const order = orders.find(o => o.id === orderId)
    if (order) {
      addNotification({ userId: order.buyerId, orderId, type: 'order_cancelled', title: 'Order cancelled', message: 'Your order has been cancelled by admin. A refund has been issued.' })
      addNotification({ userId: order.sellerId, orderId, type: 'order_cancelled', title: 'Order cancelled', message: 'An order has been cancelled by admin.' })
      const buyer = users.find(u => u.id === order.buyerId)
      const seller = users.find(u => u.id === order.sellerId)
      const listing = listings.find(l => l.id === order.listingId)
      if (buyer?.email) {
        sendOrderCancelledEmail(buyer.email, buyer.name, order.orderRef || orderId, listing?.title || 'item', order.totalPrice?.toFixed(2) || '0.00')
        sendRefundConfirmedEmail(buyer.email, buyer.name, order.orderRef || orderId, order.totalPrice?.toFixed(2) || '0.00', listing?.title || 'item', {
          related_entity_type: 'order',
          related_entity_id: order.id,
          orderId: order.id,
          listingId: order.listingId,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
        })
      }
      if (seller?.email) sendOrderCancelledSellerEmail(seller.email, seller.name, order.orderRef || orderId, listing?.title || 'item')
    }
  }, [orders, users, listings, addNotification, dbPatchOrder, showToast])

  // ── Admin: add message to dispute ────────────────────────────────
  const addDisputeMessage = useCallback(async (disputeId, message, fromAdmin = true) => {
    const now = new Date().toISOString()
    const dispute = disputes.find(d => d.id === disputeId)
    if (!dispute) return
    const msgs = dispute.messages || []
    const newMsg = { id: `dm${Date.now()}`, text: message, fromAdmin, createdAt: now }
    const { error } = await dbPatchDispute(disputeId, {
      messages: [...msgs, newMsg],
      updatedAt: now,
    })
    if (error) {
      console.error('[addDisputeMessage] DB write failed:', error.message)
      showToast('Failed to add dispute message: ' + error.message, 'error')
      return
    }
    // Notify both parties
    if (dispute) {
      addNotification({ userId: dispute.buyerId, type: 'dispute_message', title: 'Dispute update', message: fromAdmin ? 'Admin has sent a message regarding your dispute.' : message })
      addNotification({ userId: dispute.sellerId, type: 'dispute_message', title: 'Dispute update', message: fromAdmin ? 'Admin has sent a message regarding the dispute.' : message })
      // Email both parties about the new dispute message
      const order = orders.find(o => o.id === dispute.orderId)
      const buyer = users.find(u => u.id === dispute.buyerId)
      const seller = users.find(u => u.id === dispute.sellerId)
      const orderRef = order?.orderRef || dispute.orderId
      if (buyer?.email) sendDisputeMessageEmail(buyer.email, buyer.name, orderRef, message, {
        related_entity_type: 'dispute',
        related_entity_id: dispute.id,
        disputeId: dispute.id,
        orderId: order?.id,
        sellerId: dispute.sellerId,
        buyerId: dispute.buyerId,
      })
      if (seller?.email) sendDisputeMessageEmail(seller.email, seller.name, orderRef, message, {
        related_entity_type: 'dispute',
        related_entity_id: dispute.id,
        disputeId: dispute.id,
        orderId: order?.id,
        sellerId: dispute.sellerId,
        buyerId: dispute.buyerId,
      })
    }
  }, [disputes, orders, users, addNotification, dbPatchDispute, showToast])

  // ──────────────────────────────────────────────────────────────────

  // ── Shipment management functions ──────────────────────────────────
  const getShipmentByOrderId = useCallback((orderId) => {
    return shipments.find(s => s.orderId === orderId) || null
  }, [shipments])

  const getSellerShipments = useCallback((sellerId) => {
    return shipments.filter(s => s.sellerId === sellerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [shipments])

  const getBuyerShipments = useCallback((buyerId) => {
    return shipments.filter(s => s.buyerId === buyerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [shipments])

  // Seller marks item as shipped with tracking number
  const markShipmentShipped = useCallback(async (orderId, trackingNumber, opts = {}) => {
    const now = new Date().toISOString()
    const shipmentUpdates = {
      status: 'shipped',
      trackingNumber: trackingNumber || null,
      maltapostConsignmentId: opts.consignmentId || null,
      maltapostBarcode: opts.barcode || null,
      senderAddress: opts.senderAddress || null,
      weightGrams: opts.weightGrams || null,
      parcelSize: opts.parcelSize || null,
      maltapostLabelUrl: opts.labelUrl || null,
      shippedAt: now,
      updatedAt: now,
    }
    const { error } = await dbPatchShipmentByOrderId(orderId, shipmentUpdates)
    if (error) {
      console.error('[markShipmentShipped] DB write failed:', error.message)
      showToast('Failed to mark shipment as shipped: ' + error.message, 'error')
      return
    }
    // Also update order tracking status
    await updateOrderStatus(orderId, 'shipped')
  }, [updateOrderStatus, dbPatchShipmentByOrderId, showToast])

  // Update shipment status (e.g. from MaltaPost API sync)
  const updateShipmentStatus = useCallback(async (orderId, status, extraData = {}) => {
    const now = new Date().toISOString()
    const shipment = shipments.find(s => s.orderId === orderId)
    const updates = { status, updatedAt: now, ...extraData }
    if (status === 'in_transit' && (!shipment || !shipment.inTransitAt)) updates.inTransitAt = now
    if (status === 'delivered' && (!shipment || !shipment.deliveredAt)) {
      updates.deliveredAt = now
      updates.deliveryProof = extraData.deliveryProof || shipment?.deliveryProof || null
      updates.deliverySignatureUrl = extraData.deliverySignatureUrl || shipment?.deliverySignatureUrl || null
      updates.deliveryPhotoUrl = extraData.deliveryPhotoUrl || shipment?.deliveryPhotoUrl || null
    }
    if (status === 'failed_delivery' && (!shipment || !shipment.failedAt)) {
      updates.failedAt = now
      updates.failureReason = extraData.failureReason || null
    }
    if (status === 'returned' && (!shipment || !shipment.returnedAt)) {
      updates.returnedAt = now
      updates.returnReason = extraData.returnReason || null
    }
    if (extraData.maltapostRawStatus) {
      updates.maltapostRawStatus = extraData.maltapostRawStatus
      updates.maltapostLastSync = now
    }
    const { error } = await dbPatchShipmentByOrderId(orderId, updates)
    if (error) {
      console.error('[updateShipmentStatus] DB write failed:', error.message)
      showToast('Failed to update shipment status: ' + error.message, 'error')
      return
    }
    // Sync order tracking status for delivered/failed
    if (status === 'delivered') {
      await updateOrderStatus(orderId, 'delivered')
    }
  }, [updateOrderStatus, shipments, dbPatchShipmentByOrderId, showToast])

  // Admin: force update any shipment field
  const adminUpdateShipment = useCallback(async (shipmentId, updates) => {
    const now = new Date().toISOString()
    const { error } = await dbPatchShipment(shipmentId, { ...updates, updatedAt: now })
    if (error) {
      console.error('[adminUpdateShipment] DB write failed:', error.message)
      showToast('Failed to update shipment: ' + error.message, 'error')
    }
  }, [dbPatchShipment, showToast])

  // ──────────────────────────────────────────────────────────────────
  // getUserById, getUserByUsername, getListingById, getUserListings come from hooks above

  const getUserOrders = useCallback((userId) => orders.filter(o => o.buyerId === userId), [orders])
  const getUserSales = useCallback((userId) => orders.filter(o => o.sellerId === userId), [orders])
  const getUserConversations = useCallback((userId) => conversations.filter(c => c.participants.includes(userId)), [conversations])
  const getConversationById = useCallback((id) => conversations.find(c => c.id === id), [conversations])
  const getConversation = getConversationById

  const calculateFees = useCallback((price, deliveryFeeOverride) => {
    const buyerProtectionFee = parseFloat((0.75 + price * 0.05).toFixed(2))
    const deliveryFee = typeof deliveryFeeOverride === 'number' ? deliveryFeeOverride : 4.50
    const bundledFee = parseFloat((buyerProtectionFee + deliveryFee).toFixed(2))
    const total = parseFloat((price + bundledFee).toFixed(2))
    return { buyerProtectionFee, deliveryFee, bundledFee, total }
  }, [])

  return (
    <AppContext.Provider value={{
      currentUser, users, listings, listingsLoading, orders, conversations, reviews, disputes, likedListings, payoutProfiles, notifications, offers, bundle, bundleOffers, shipments, toast,
      PROTECTION_WINDOW_MS, SHIPPING_DEADLINE_MS,
      login, signup, register, logout, requestPasswordReset, validateResetToken, resetPassword, updateProfile,
      createListing, deleteListing, boostListing, unboostListing, flagListing, approveListing, hideListing, updateStyleTags, updateCollectionTags, adminUpdateListingMeta, toggleLike,
      placeOrder, getOrCreateConversation, sendMessage, markConversationRead, getUnreadConversationCount, updateOrderStatus,
      confirmDelivery, openDispute, adminOpenDispute, flagOrderOverdue, DISPUTE_REASONS,
      addNotification, markNotificationRead, markAllNotificationsRead, getUserNotifications,
      createOffer, acceptOffer, declineOffer, counterOffer, getOfferById, getListingOffers, getUserActiveOfferOnListing,
      addToBundle, removeFromBundle, clearBundle, isInBundle, calculateBundleFees, placeBundleOrder,
      createBundleOffer, acceptBundleOffer, declineBundleOffer, counterBundleOffer, getBundleOfferById, placeBundleOfferOrder,
      suspendUser, banUser, restoreUser, updateSellerBadges, updateTrustTags, updateAdminRole, holdPayout, releasePayout, refundOrder, resolveDispute, cancelOrder, addDisputeMessage,
      savePayoutProfile, getPayoutProfile,
      refreshCurrentProfile,
      getShipmentByOrderId, getSellerShipments, getBuyerShipments, markShipmentShipped, updateShipmentStatus, adminUpdateShipment,
      getUserById, getUserByUsername, getListingById, getUserListings,
      getUserOrders, getUserSales,
      getUserConversations, getConversationById, getConversation,
      calculateFees, showToast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
