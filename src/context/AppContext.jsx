import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '../lib/auth-context'
import { useListings as useListingsHook } from '../hooks/useListings'
import { useProfiles as useProfilesHook } from '../hooks/useProfiles'
import { useOrders as useOrdersHook } from '../hooks/useOrders'
import { useNotifications as useNotificationsHook } from '../hooks/useNotifications'
import { useConversations as useConversationsHook } from '../hooks/useConversations'
import { useOffers as useOffersHook } from '../hooks/useOffers'
import { SEED_USERS, SEED_MESSAGES, SEED_REVIEWS } from '../data/seedData'
import {
  sendOfferAcceptedEmail, sendOfferDeclinedEmail, sendOfferCounteredEmail,
  sendOrderConfirmedEmail, sendOrderCancelledEmail, sendOrderCancelledSellerEmail,
  sendItemShippedEmail, sendItemDeliveredEmail,
  sendRefundConfirmedEmail, sendDisputeOpenedEmail, sendDisputeResolvedEmail, sendDisputeMessageEmail,
  sendItemSoldEmail, sendShippingReminderEmail, sendPayoutReleasedEmail,
  sendSuspiciousActivityEmail,
  sendMessageReceivedEmail,
  sendBundleOfferReceivedEmail, sendBundleOfferAcceptedEmail, sendBundleOfferDeclinedEmail, sendBundleOfferCounteredEmail,
  sendSellerPreparePackageEmail,
} from '../lib/email'
import { createTransfer, createRefund } from '../lib/stripe'
import { analyseMessage } from '../utils/circumventionDetector'
import { FULFILMENT_PROVIDER, getFulfilmentMethodLabel, getFulfilmentPrice, normalizeFulfilmentMethod } from '../lib/fulfilment'
import { sendNewOfferSellerEmail } from '../lib/offerEmail'
import { getOfferCreationBlockReason, isActiveOffer } from '../lib/offerStatus'
import { createShippingProvider } from '../lib/shippingProvider'
import { autoReleaseBuyerProtectionOrders, confirmBuyerProtectionOrder, disputeBuyerProtectionOrder } from '../lib/buyerProtectionApi'
import { getBuyerConfirmationDeadline } from '../lib/buyerProtection'
import { isLockerEligible } from '../lib/lockerEligibility'
import { buildAdminShipmentPayload } from '../lib/adminShipment'
import { isActiveDisputeStatus } from '../lib/disputes'
import { buildDeliverySheetRow } from '../lib/logisticsDeliverySheet'

const AppContext = createContext(null)

const PROTECTION_WINDOW_MS = 48 * 60 * 60 * 1000 // 48 hours
const SHIPPING_DEADLINE_MS = 3 * 24 * 60 * 60 * 1000 // 3 business days
const SHIPPING_REMINDER_MS = 2 * 24 * 60 * 60 * 1000 // Remind after 2 days
const COUNTER_OFFER_DEDUPE_MS = 30 * 1000
const SELLER_PAYOUT_PENDING_STATUS = 'payment_received_seller_payout_pending'
const SOLD_ORDER_STATUSES = new Set(['paid', SELLER_PAYOUT_PENDING_STATUS, 'shipped', 'delivered', 'confirmed', 'completed'])

function canSellerReceivePayouts(seller) {
  return Boolean(seller?.stripeAccountId && seller?.detailsSubmitted && seller?.payoutsEnabled)
}

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
    fulfilmentProvider: order.fulfilmentProvider || FULFILMENT_PROVIDER,
    fulfilmentMethod: order.fulfilmentMethod || normalizeFulfilmentMethod(order.deliveryMethod),
    fulfilmentPrice: order.fulfilmentPrice ?? order.deliveryFee ?? getFulfilmentPrice(order.deliveryMethod),
    fulfilmentStatus: order.fulfilmentStatus || 'awaiting_fulfilment',
    lockerLocation: order.lockerLocation || null,
    deliveryAddressSnapshot: order.deliveryAddressSnapshot || null,
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
    ensureUserById,
    getUserById,
    getUserByUsername,
  } = useProfilesHook(localUsers, authAppUser)

  const currentUser = useMemo(() => {
    if (!authAppUser) return null
    const profileUser = users.find(u => u.id === authAppUser.id)
    return profileUser ? { ...authAppUser, ...profileUser } : authAppUser
  }, [authAppUser, users])

  const {
    conversations,
    setConversations,
    refreshConversations,
    createConversation,
    createConversationForUsers,
    addMessage: dbAddMessage,
    markConversationRead: dbMarkConversationRead,
  } = useConversationsHook(currentUser, SEED_MESSAGES)

  // ── Supabase-backed listings hook ──────────────────────────
  const {
    listings,
    likedListings,
    loading: listingsLoading,
    loadingMore: listingsLoadingMore,
    hasMoreListings,
    loadMoreListings,
    dbAvailable: listingsDbAvailable,
    createListing: dbCreateListing,
    updateListing: dbUpdateListing,
    deleteListing: dbDeleteListing,
    markSold: dbMarkSold,
    markReserved: dbMarkReserved,
    releaseReservation: dbReleaseReservation,
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
    orders, disputes, payouts: dbPayouts, shipments, logisticsDeliverySheet,
    dbAvailable: ordersDbAvailable,
    dbError: ordersDbError,
    ordersLoading, disputesLoading, payoutsLoading, shipmentsLoading, logisticsDeliverySheetLoading,
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
    refreshPayouts,
    refreshShipments,
    upsertDeliverySheetRow,
    refreshLogisticsDeliverySheet,
  } = useOrdersHook()

  const [reviews, setReviews] = useState(() => loadFromStorage('sib_reviews', SEED_REVIEWS))
  const [payoutProfiles, setPayoutProfiles] = useState(() => loadFromStorage('sib_payoutProfiles', {}))
  const [bundle, setBundle] = useState(() => loadFromStorage('sib_bundle', null))
  const [bundleOffers, setBundleOffers] = useState(() => loadFromStorage('sib_bundleOffers', []))
  const [toast, setToast] = useState(null)
  const counterOfferRequestsRef = useRef(new Map())
  const [packagePrepDismissedOfferIds, setPackagePrepDismissedOfferIds] = useState(() => new Set())

  // ── Notification helpers (must be before effects that depend on it) ──
  const {
    notifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    getUserNotifications,
    refreshNotifications,
  } = useNotificationsHook(currentUser)

  const {
    offers,
    setOffers,
    createOffer: dbCreateOffer,
    patchOffer: dbPatchOffer,
    refreshOffers,
  } = useOffersHook(currentUser)

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
            status: 'awaiting_shipment',
            actionTarget: `/orders/${s.orderId}`,
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
  useEffect(() => { saveToStorage('sib_reviews', reviews) }, [reviews])
  // Disputes no longer saved to localStorage — DB is sole source of truth
  useEffect(() => { if (!listingsDbAvailable) saveToStorage('sib_likes', likedListings) }, [likedListings, listingsDbAvailable])
  useEffect(() => { saveToStorage('sib_payoutProfiles', payoutProfiles) }, [payoutProfiles])
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
      if (!orders.some(o => o.trackingStatus === 'delivered' && o.deliveredAt)) return
      const result = await autoReleaseBuyerProtectionOrders().catch(error => {
        console.error('[buyer-protection] auto release check failed:', error?.message || error)
        return null
      })
      if (!result?.completed?.length) return
      await refreshOrders()
      await refreshDisputes()
      const ts = new Date().toISOString()
      for (const completed of result.completed) {
        const o = orders.find(order => order.id === completed.orderId)
        if (o) {
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
  }, [orders, addNotification, refreshOrders, refreshDisputes])

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
  const updateListing = dbUpdateListing
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

  const ensureMaltaPostShipment = useCallback(async (order, source = 'order') => {
    if (!order?.id) return { success: false, error: 'Order is required.' }
    const accessToken = authSession?.access_token
    if (!accessToken) {
      console.warn('[maltapost] shipment create skipped: missing auth session', {
        orderId: order.id,
        source,
      })
      return { success: false, error: 'missing_auth_session' }
    }

    try {
      const provider = createShippingProvider({ accessToken })
      const result = await provider.createShipment(order)
      if (!result?.success) {
        console.error('[maltapost] shipment create failed', {
          orderId: order.id,
          source,
          error: result?.error || 'unknown_error',
          details: result?.details || null,
        })
        return result
      }

      console.info('[maltapost] shipment created/prepared', {
        orderId: order.id,
        source,
        shipmentId: result.shipment?.shipmentId || null,
        trackingNumber: result.shipment?.trackingNumber || null,
        alreadyCreated: !!result.alreadyCreated,
      })
      await Promise.all([refreshOrders(), refreshShipments()])
      return result
    } catch (error) {
      console.error('[maltapost] shipment create unexpected failure', {
        orderId: order.id,
        source,
        message: error?.message || String(error),
      })
      return { success: false, error: error?.message || 'maltapost_request_failed' }
    }
  }, [authSession?.access_token, refreshOrders, refreshShipments])

  // ── Notification helpers (must be before placeOrder which depends on it) ──
  const placeOrder = useCallback(async (listingId, deliveryMethod, address, overridePrice, deliveryInfo, deliverySnapshot, stripePaymentIntentId = null, opts = {}) => {
    const listing = listings.find(l => l.id === listingId)
    if (!listing) return null
    const acceptedOffer = opts.offerId ? offers.find(o => o.id === opts.offerId) : null
    const isAcceptedOfferCheckout =
      acceptedOffer?.listingId === listingId &&
      acceptedOffer?.buyerId === currentUser?.id &&
      acceptedOffer?.status === 'accepted'
    const listingCanBeOrdered =
      listing.status === 'active' ||
      (listing.status === 'reserved' && isAcceptedOfferCheckout)
    if (!listingCanBeOrdered || hasBlockingOrderForListings(orders, [listingId])) {
      showToast('Item already sold', 'error')
      return null
    }
    const itemPrice = overridePrice != null ? overridePrice : listing.price
    const deliveryType = deliveryInfo?.type || 'home_delivery'
    const fulfilmentMethod = normalizeFulfilmentMethod(deliveryType)
    if (fulfilmentMethod === 'locker' && !isLockerEligible(listing)) {
      showToast('Locker delivery not available for this item', 'error')
      return null
    }
    const dFee = getFulfilmentPrice(fulfilmentMethod)
    const buyerProtectionFee = parseFloat((0.75 + itemPrice * 0.05).toFixed(2))
    const bundledFee = parseFloat((buyerProtectionFee + dFee).toFixed(2))
    const totalPrice = parseFloat((itemPrice + bundledFee).toFixed(2))
    const orderRef = `SIB-${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()
    const deliveryLabel = getFulfilmentMethodLabel(fulfilmentMethod)
    const seller = users.find(u => u.id === listing.sellerId)
    const sellerPayoutReady = canSellerReceivePayouts(seller)
    const orderStatus = sellerPayoutReady ? 'paid' : SELLER_PAYOUT_PENDING_STATUS
    const lockerLocation = fulfilmentMethod === 'locker' ? {
      name: deliveryInfo?.lockerName || null,
      address: deliveryInfo?.lockerAddress || address || null,
    } : null
    const deliveryAddressSnapshot = fulfilmentMethod === 'delivery' ? {
      raw: address || null,
      buyerFullName: deliverySnapshot?.buyerFullName || currentUser?.name || null,
      buyerPhone: deliverySnapshot?.buyerPhone || null,
      buyerCity: deliverySnapshot?.buyerCity || null,
      buyerPostcode: deliverySnapshot?.buyerPostcode || null,
      deliveryNotes: deliverySnapshot?.deliveryNotes || null,
    } : null
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
      fulfilmentProvider: FULFILMENT_PROVIDER,
      fulfilmentMethod,
      fulfilmentPrice: dFee,
      fulfilmentStatus: 'awaiting_fulfilment',
      lockerLocation,
      deliveryAddressSnapshot,
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
      status: orderStatus,
      paymentStatus: 'paid',
      stripePaymentIntentId,
      deliveryMethod: deliveryType,
      deliveryFee: dFee,
      fulfilmentProvider: FULFILMENT_PROVIDER,
      fulfilmentMethod,
      fulfilmentPrice: dFee,
      fulfilmentStatus: 'awaiting_fulfilment',
      lockerLocation,
      deliveryAddressSnapshot,
      trackingStatus: 'awaiting_delivery',
      payoutStatus: 'held',
      sellerPayoutStatus: sellerPayoutReady ? 'held' : 'setup_pending',
      paidAt: now,
      shippingAddress,
    }
    const { data: savedOrder, error: orderErr } = await dbCreateOrder(orderData)
    if (orderErr) {
      console.error('[placeOrder] DB write failed:', orderErr.message)
      showToast('Failed to place order: ' + orderErr.message, 'error')
      return null
    }
    await dbMarkSold(listingId)
    incrementUserSales(listing.sellerId, 1)

    // Auto-create shipment record for this paid order
    const shipmentData = createShipmentRecord(savedOrder)
    shipmentData.deliveryType = deliveryType
    const { error: shipErr } = await dbCreateShipment(shipmentData)
    if (shipErr) console.error('[placeOrder] shipment create failed:', shipErr.message)
    if (!shipErr) await ensureMaltaPostShipment(savedOrder, 'placeOrder')

    // Notify seller about collection deadline
    addNotification({
      userId: listing.sellerId,
      orderId: savedOrder.id,
      listingId: listing.id,
      status: 'awaiting_shipment',
      actionTarget: `/orders/${savedOrder.id}`,
      type: 'new_sale',
      title: 'New sale — ship within 3 days',
      message: `You have a new order (${orderRef}) — ${deliveryLabel}. Please ship via MaltaPost within 3 business days.`,
    })

    if (!sellerPayoutReady) {
      addNotification({
        userId: listing.sellerId,
        orderId: savedOrder.id,
        listingId: listing.id,
        actionTarget: '/seller/payout-settings',
        type: 'seller_payout_setup_required',
        title: 'Complete payout setup',
        message: 'You made a sale. Please complete payout setup to receive your funds.',
      })
    }

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
    }

    // Email: item sold notification to seller
    sendItemSoldEmail(seller?.email || null, seller?.name || seller?.username || 'seller', listing.title, orderRef, itemPrice.toFixed(2), currentUser.username, {
      related_entity_type: 'order',
      related_entity_id: savedOrder.id,
      orderId: savedOrder.id,
      listingId: listing.id,
      sellerId: listing.sellerId,
      buyerId: currentUser.id,
    })

    return savedOrder
  }, [currentUser, listings, users, orders, offers, addNotification, dbCreateOrder, dbCreateShipment, dbMarkSold, ensureMaltaPostShipment, showToast])

  const getOrCreateConversation = useCallback((otherUserId, listingId) => {
    return createConversation(otherUserId, listingId)
  }, [createConversation])

  const getOrCreateConversationForUsers = useCallback((userAId, userBId, listingId) => {
    return createConversationForUsers(userAId, userBId, listingId)
  }, [createConversationForUsers])

  const addConversationEvent = useCallback(async (conversationOrId, event) => {
    const conversationId = typeof conversationOrId === 'string' ? conversationOrId : conversationOrId?.id
    if (!conversationId) return { data: null, error: { message: 'Conversation missing for event.' } }
    const newMsg = {
      id: `ev${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderId: event.senderId || 'system',
      recipientId: event.recipientId || conversationOrId?.participants?.find(id => id !== (event.senderId || 'system')) || null,
      text: event.text || event.title || '',
      timestamp: event.timestamp || new Date().toISOString(),
      type: event.type || 'system_event',
      eventType: event.eventType || event.type || 'system_event',
      read: false,
      ...event,
    }
    const metadata = { ...event }
    delete metadata.senderId
    delete metadata.recipientId
    delete metadata.text
    delete metadata.type
    delete metadata.eventType
    delete metadata.timestamp

    const result = await dbAddMessage(conversationId, {
      ...newMsg,
      conversation: typeof conversationOrId === 'string' ? undefined : conversationOrId,
      metadata,
    })

    if (result?.error) {
      console.error('[conversation-event] failed to persist event', {
        conversationId,
        eventType: newMsg.eventType,
        message: result.error.message,
        code: result.error.code || null,
      })
      return result
    }

    return { data: result?.data || newMsg, error: null }
  }, [dbAddMessage])

  // sendMessage(convId, senderId, text, flagged?)
  const sendMessage = useCallback(async (conversationId, senderIdOrText, textArg, flagged = false) => {
    const text = textArg !== undefined ? textArg : senderIdOrText
    const analysis = analyseMessage(text)
    if (analysis.flagged) {
      if (currentUser?.email) {
        sendSuspiciousActivityEmail(
          currentUser.email,
          currentUser.name,
          'Your message was blocked because it tried to share contact details, addresses, or arrange an off-platform deal. Please keep communication on Sib to stay protected.'
        )
      }
      const err = new Error('For your safety and to keep Buyer Protection active, sharing addresses, contact details, or arranging off-platform deals is not allowed in chat.')
      err.code = 'SIB_CHAT_CIRCUMVENTION_BLOCKED'
      err.analysis = analysis
      throw err
    }
    const conversation = conversations.find(c => c.id === conversationId)
    const recipientId = conversation?.participants?.find(id => id !== currentUser.id)
    let recipient = users.find(u => u.id === recipientId)
    if (recipientId && (!recipient?.email || !recipient?.username)) {
      recipient = await ensureUserById?.(recipientId) || recipient
    }
    const listing = conversation?.listingId ? listings.find(l => l.id === conversation.listingId) : null
    console.info('[messages] sendMessage start', {
      conversationId,
      senderId: currentUser.id,
      recipientId: recipientId || null,
      hasConversation: !!conversation,
      hasRecipientProfile: !!recipient,
      hasRecipientEmail: !!recipient?.email,
    })

    if (!conversation || !recipientId) {
      const error = new Error('Conversation or recipient missing.')
      console.error('[messages] sendMessage blocked before persistence:', {
        conversationId,
        hasConversation: !!conversation,
        recipientId: recipientId || null,
      })
      return { error }
    }

    const newMsg = {
      id: `m${Date.now()}`,
      senderId: currentUser.id,
      recipientId,
      text,
      timestamp: new Date().toISOString(),
      flagged: !!flagged,
    }
    const messageResult = await dbAddMessage(conversationId, newMsg)
    if (messageResult?.error) {
      console.error('[messages] message persistence failed; notification/email skipped:', {
        conversationId,
        senderId: currentUser.id,
        recipientId,
        message: messageResult.error.message,
        code: messageResult.error.code || null,
      })
      showToast?.('Message could not be sent. Please try again.', 'error')
      return { error: messageResult.error }
    }

    console.info('[messages] message persistence ok', {
      conversationId,
      messageId: messageResult?.data?.id || newMsg.id,
      recipientId,
    })

    if (recipientId && recipientId !== currentUser.id && !flagged) {
      const notificationResult = await addNotification({
        userId: recipientId,
        type: 'message_received',
        title: `New message from @${currentUser.username || currentUser.name || 'someone'}`,
        message: text.length > 120 ? `${text.slice(0, 117)}...` : text,
        listingId: conversation?.listingId || null,
        conversationId,
        actionTarget: `/messages/${conversationId}`,
        metadata: {
          senderId: currentUser.id,
          senderName: currentUser.username || currentUser.name || '',
          senderUsername: currentUser.username || '',
          senderAvatar: currentUser.avatar || '',
          senderIsAdmin: !!currentUser.isAdmin,
          senderVerified: !!currentUser.verified || !!currentUser.isAdmin,
        },
        data: {
          senderId: currentUser.id,
          senderName: currentUser.username || currentUser.name || '',
          senderUsername: currentUser.username || '',
          senderAvatar: currentUser.avatar || '',
          senderIsAdmin: !!currentUser.isAdmin,
          senderVerified: !!currentUser.verified || !!currentUser.isAdmin,
        },
      })
      console.info('[messages] notification result', {
        conversationId,
        recipientId,
        notificationId: notificationResult?.id || null,
        ok: !!notificationResult,
      })

      if (recipient?.email) {
        const emailResult = await sendMessageReceivedEmail(
          recipient.email,
          recipient.name || recipient.username || 'there',
          currentUser.username || currentUser.name || 'someone',
          text,
          listing?.title || '',
          {
            conversationId,
            listingId: conversation?.listingId || null,
            senderId: currentUser.id,
            recipientId,
            related_entity_type: 'conversation',
            related_entity_id: conversationId,
          },
        )
        console.info('[messages] message email result', {
          conversationId,
          recipientId,
          recipientEmail: recipient.email,
          ok: !!emailResult,
        })
      } else {
        console.warn('[messages] recipient has no email; message email skipped', {
          conversationId,
          recipientId,
        })
      }
    }

    // Email: suspicious activity alert if message flagged
    if (flagged && currentUser?.email) {
      sendSuspiciousActivityEmail(currentUser.email, currentUser.name, 'Your message was flagged for containing contact information. Please use Sib messaging to stay protected.')
    }
    return { message: messageResult?.data || newMsg }
  }, [addNotification, conversations, currentUser, dbAddMessage, ensureUserById, listings, showToast, users])

  // Mark all messages from other participants as read in a conversation
  const markConversationRead = useCallback((conversationId) => {
    if (!currentUser) return
    dbMarkConversationRead(conversationId)
  }, [currentUser, dbMarkConversationRead])

  // Count conversations with unread messages for a given user
  const getUnreadConversationCount = useCallback((userId) => {
    if (!userId) return 0
    return conversations.filter(c => {
      if (!c.participants.includes(userId)) return false
      const last = c.messages[c.messages.length - 1]
      return last && last.senderId !== userId && !last.read
    }).length
  }, [conversations])


  // ── Order status with delivery confirmation flow ───────────────────
  const updateOrderStatus = useCallback(async (orderId, status) => {
    const now = new Date().toISOString()
    const order = orders.find(o => o.id === orderId)
    const updates = { trackingStatus: status, fulfilmentStatus: status }
    if (status === 'shipped') updates.shippedAt = now
    if (status === 'delivered') {
      updates.deliveredAt = now
      updates.status = 'delivered'
      updates.buyerConfirmationDeadline = getBuyerConfirmationDeadline(now)
      updates.payoutStatus = 'held'
    }

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
      const conversation = getOrCreateConversationForUsers(order.buyerId, order.sellerId, order.listingId)
      addConversationEvent(conversation.id, {
        type: 'order_event',
        eventType: 'in_transit',
        senderId: order.sellerId,
        orderId: order.id,
        listingId: order.listingId,
        title: 'In transit',
        text: `${listing?.title || 'Your item'} is on the way to the buyer.`,
      })
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
      const listing = listings.find(l => l.id === order.listingId)
      const conversation = getOrCreateConversationForUsers(order.buyerId, order.sellerId, order.listingId)
      addConversationEvent(conversation.id, {
        type: 'order_event',
        eventType: 'awaiting_buyer_confirmation',
        senderId: 'system',
        orderId: order.id,
        listingId: order.listingId,
        title: 'Awaiting buyer confirmation',
        text: 'Delivered. The buyer has 48 hours to confirm everything is okay.',
      })
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
  }, [addNotification, orders, users, listings, dbPatchOrder, showToast, getOrCreateConversationForUsers, addConversationEvent])

  // ── Buyer confirms delivery → release payout ──────────────────────
  const confirmDelivery = useCallback(async (orderId) => {
    const order = orders.find(o => o.id === orderId)
    try {
      await confirmBuyerProtectionOrder(orderId)
      await refreshOrders()
      await refreshDisputes()
    } catch (error) {
      console.error('[confirmDelivery] buyer-protection function failed:', error?.message || error)
      showToast('Failed to confirm delivery: ' + (error?.message || 'Please try again.'), 'error')
      return false
    }
    if (order) {
      const listing = listings.find(l => l.id === order.listingId)
      const seller = users.find(u => u.id === order.sellerId)
      const conversation = getOrCreateConversationForUsers(order.buyerId, order.sellerId, order.listingId)
      addConversationEvent(conversation.id, {
        type: 'order_event',
        eventType: 'completed',
        senderId: order.buyerId,
        orderId,
        listingId: order.listingId,
        title: 'Completed',
        text: 'Order completed. Feedback requested.',
        feedbackUrl: seller?.username ? `/reviews/${seller.username}` : null,
      })
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
    return true
  }, [orders, users, listings, addNotification, showToast, getOrCreateConversationForUsers, addConversationEvent, refreshOrders, refreshDisputes])

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
    const existing = disputes.find(d => d.orderId === orderId && isActiveDisputeStatus(d.status))
    if (existing) return existing
    const type = opts.type || 'not_as_described'
    const description = reason || DISPUTE_REASONS[type] || reason
    const source = opts.source || 'buyer' // 'buyer', 'admin', 'system'

    let newDispute = null
    if (source === 'buyer') {
      try {
        const result = await disputeBuyerProtectionOrder(orderId, { type, reason: description })
        newDispute = result.dispute || { id: result.disputeId, orderId, buyerId: order.buyerId, sellerId: order.sellerId, type, reason: description, description, status: 'open', source }
        await refreshOrders()
        await refreshDisputes()
        await refreshNotifications()
      } catch (error) {
        console.error('[openDispute] buyer-protection function failed:', error?.message || error)
        showToast('Failed to open dispute: ' + (error?.message || 'Please try again.'), 'error')
        return null
      }
    } else {
      const { data, error: disputeErr } = await dbCreateDispute({
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
      newDispute = data
      const { error: orderErr } = await dbPatchOrder(orderId, { status: 'disputed', trackingStatus: 'under_review', payoutStatus: 'disputed', disputedAt: new Date().toISOString() })
      if (orderErr) console.error('[openDispute] order patch failed:', orderErr.message)
    }

    if (source !== 'buyer') {
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
    }

    // Email: dispute confirmation to buyer
    const buyer = users.find(u => u.id === order.buyerId)
    if (source !== 'buyer' && buyer?.email) {
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
    if (source !== 'buyer' && seller?.email) {
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
  }, [orders, disputes, users, addNotification, dbCreateDispute, dbPatchOrder, showToast, refreshOrders, refreshDisputes, refreshNotifications])

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

  const createOffer = useCallback(async (listingId, price) => {
    if (!currentUser) return { error: 'Login required.' }
    const listing = listings.find(l => l.id === listingId)
    if (!listing) return { error: 'Listing not found.' }
    if (listing.sellerId === currentUser.id) return { error: 'Cannot offer on your own listing.' }
    if (listing.status !== 'active') return { error: 'This item is no longer available.' }
    const latestOffers = await refreshOffers()
    const offerSource = Array.isArray(latestOffers) ? latestOffers : offers
    const nowMs = Date.now()

    const blockReason = getOfferCreationBlockReason(offerSource, currentUser.id, listingId, MAX_ACTIVE_OFFERS_PER_USER, nowMs)
    if (blockReason) return { error: blockReason }

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
    const conversation = getOrCreateConversationForUsers(currentUser.id, listing.sellerId, listingId)
    if (!conversation?.id) {
      console.error('[offers] conversation creation failed before offer send', {
        listingId,
        buyerId: currentUser.id,
        sellerId: listing.sellerId,
      })
      return { error: 'We could not open the message thread for this offer. Please try again.' }
    }

    const offerWithConversation = { ...newOffer, conversationId: conversation.id }
    const savedOfferResult = await dbCreateOffer(offerWithConversation)
    if (savedOfferResult?.error) {
      console.error('[offers] offer persistence failed; message/notification/email skipped', {
        listingId,
        buyerId: currentUser.id,
        sellerId: listing.sellerId,
        conversationId: conversation.id,
        message: savedOfferResult.error.message,
        code: savedOfferResult.error.code || null,
      })
      return { error: savedOfferResult.error.message || 'We could not save this offer. Please try again.' }
    }
    const savedOffer = savedOfferResult?.data || offerWithConversation

    const eventResult = await addConversationEvent(conversation, {
      type: 'offer',
      eventType: 'offer_received',
      senderId: currentUser.id,
      recipientId: listing.sellerId,
      offerId: savedOffer.id,
      listingId,
      buyerId: currentUser.id,
      sellerId: listing.sellerId,
      title: 'Offer received',
      text: `@${currentUser.username} offered €${price} on "${listing.title}"`,
      offerPrice: price,
      originalPrice: listing.price,
      itemTitle: listing.title,
      itemImage: listing.images?.[0] || null,
      status: 'pending',
    })

    if (eventResult?.error) {
      console.error('[offers] offer message persistence failed after offer insert', {
        offerId: savedOffer.id,
        listingId,
        conversationId: conversation.id,
        message: eventResult.error.message,
        code: eventResult.error.code || null,
      })
      return { error: 'Offer could not be added to the message thread. Please try again.' }
    }

    const notificationResult = await addNotification({
      userId: listing.sellerId,
      type: 'offer_received',
      title: 'New offer received',
      message: `@${currentUser.username} offered €${price} on "${listing.title}"`,
      listingId,
      conversationId: conversation.id,
      actionTarget: `/messages/${conversation.id}`,
      metadata: {
        offerId: savedOffer.id,
        buyerId: currentUser.id,
        buyerName: currentUser.username || currentUser.name || '',
        offerPrice: price,
      },
      data: {
        offerId: savedOffer.id,
        buyerId: currentUser.id,
        buyerName: currentUser.username || currentUser.name || '',
        offerPrice: price,
      },
    })
    console.info('[offers] offer notification result', {
      offerId: savedOffer.id,
      conversationId: conversation.id,
      sellerId: listing.sellerId,
      notificationId: notificationResult?.id || null,
      ok: !!notificationResult,
    })

    // Email: notify seller about new offer. Keep offer creation successful if email fails,
    // but log a visible result so production failures are traceable.
    const ensuredSeller = await ensureUserById?.(listing.sellerId)
    const seller = ensuredSeller || users.find(u => u.id === listing.sellerId)
    await sendNewOfferSellerEmail({
      seller,
      listing,
      offer: savedOffer,
      buyer: currentUser,
      conversationId: conversation.id,
    })

    return { offer: savedOffer, conversationId: conversation.id }
  }, [currentUser, listings, offers, users, addNotification, getOrCreateConversationForUsers, addConversationEvent, dbCreateOffer, refreshOffers, ensureUserById])

  const acceptOffer = useCallback(async (offerId) => {
    const now = new Date()
    const offer = offers.find(o => o.id === offerId)
    if (!offer) return { error: 'Offer not found. Please refresh the conversation and try again.' }
    if (offer.status !== 'pending' && offer.status !== 'countered') return { error: 'This offer is no longer pending.' }
    if (offer.status === 'pending' && currentUser?.id !== offer.sellerId) return { error: 'Only the seller can accept this offer.' }
    if (offer.status === 'countered' && currentUser?.id !== offer.buyerId) return { error: 'Only the buyer can accept this counter offer.' }
    const listing = listings.find(l => l.id === offer.listingId)
    if (!listing || !['active', 'reserved'].includes(listing.status)) return { error: 'This item is no longer available.' }
    const acceptedPrice = offer?.counterPrice || offer?.price
    const acceptedMetadata = {
      ...(offer.metadata || {}),
      acceptedAt: now.toISOString(),
      sellerPreparationStatus: 'seller_preparing_package',
    }
    const { error } = await dbPatchOffer(offerId, {
      status: 'accepted',
      acceptedPrice,
      updatedAt: now.toISOString(),
      metadata: acceptedMetadata,
    })
    if (error) {
      return { error: 'Failed to accept offer: ' + error.message }
    }
    await dbMarkReserved(offer.listingId)
    setOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o
      const acceptedPrice = o.counterPrice || o.price
      return { ...o, status: 'accepted', acceptedPrice, updatedAt: now.toISOString(), metadata: acceptedMetadata }
    }))
    const notifyUserId = offer.status === 'countered' ? offer.sellerId : offer.buyerId
    const acceptor = users.find(u => u.id === (offer.status === 'countered' ? offer.buyerId : offer.sellerId))
    const conversation = getOrCreateConversationForUsers(offer.buyerId, offer.sellerId, offer.listingId)
    if (!conversation?.id) return { error: 'Could not find the message thread for this offer.' }
    const eventResult = await addConversationEvent(conversation.id, {
        type: 'offer',
        eventType: 'offer_accepted',
        senderId: acceptor?.id || currentUser?.id || 'system',
        recipientId: notifyUserId,
        offerId: offer.id,
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        title: offer.status === 'countered' ? 'Counter offer accepted' : 'Offer accepted',
        text: `@${acceptor?.username || 'user'} accepted ${offer.status === 'countered' ? 'your counter offer' : 'the offer'} of €${acceptedPrice} on "${listing?.title || 'item'}"`,
        offerPrice: acceptedPrice,
        originalPrice: listing?.price,
        itemTitle: listing?.title || 'item',
        itemImage: listing?.images?.[0] || null,
        status: 'accepted',
      })
    if (eventResult?.error) {
      console.error('[offers] accept event failed:', eventResult.error)
    }
    await addNotification({
        userId: notifyUserId,
        type: 'offer_accepted',
        title: offer.status === 'countered' ? 'Counter offer accepted' : 'Offer accepted',
        message: `@${acceptor?.username || 'user'} accepted ${offer.status === 'countered' ? 'your counter offer' : 'the offer'} of €${acceptedPrice} on "${listing?.title || 'item'}"`,
        offerId: offer.id,
        listingId: offer.listingId,
        conversationId: conversation.id,
        actionTarget: `/messages/${conversation.id}`,
      })

    const sellerForPrep = await ensureUserById?.(offer.sellerId) || users.find(u => u.id === offer.sellerId)
    const buyerForPrep = users.find(u => u.id === offer.buyerId)
    await addNotification({
        userId: offer.sellerId,
        type: 'seller_prepare_package',
        title: 'Prepare your package for MaltaPost pickup',
        message: 'Your offer has been accepted. Package the item securely and keep it ready for MaltaPost pickup.',
        offerId: offer.id,
        listingId: offer.listingId,
        conversationId: conversation.id,
        actionTarget: `/messages/${conversation.id}`,
        status: 'seller_preparing_package',
      })
    const prepEmailResult = await sendSellerPreparePackageEmail(
      sellerForPrep?.email || null,
      sellerForPrep?.name || sellerForPrep?.username || 'seller',
      listing?.title || 'item',
      acceptedPrice,
      buyerForPrep?.username || buyerForPrep?.name || currentUser?.username || 'buyer',
      {
        offerId: offer.id,
        listingId: offer.listingId,
        conversationId: conversation.id,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        related_entity_type: 'offer',
        related_entity_id: offer.id,
      },
    )
    if (!prepEmailResult?.success || !prepEmailResult?.emailSent) {
      console.warn('[offers] seller prepare package email failed or not sent', {
        offerId: offer.id,
        sellerId: offer.sellerId,
        response: prepEmailResult,
      })
    }

    // Email: notify the buyer when a seller accepts an offer. Seller action-required
    // email is sent above for both direct acceptances and accepted counter offers.
    const buyer = users.find(u => u.id === offer.buyerId)
    const sellerUser = users.find(u => u.id === offer.sellerId)
    const emailMeta = {
      offerId: offer.id,
      listingId: offer.listingId,
      conversationId: conversation.id,
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      related_entity_type: 'offer',
      related_entity_id: offer.id,
    }
    if (offer.status !== 'countered' && buyer?.email) {
      const emailResult = await sendOfferAcceptedEmail(buyer.email, listing?.title || 'item', acceptedPrice, sellerUser?.username || 'seller', emailMeta)
      if (!emailResult) {
        console.error('[offers] offer accepted email failed', {
          offerId: offer.id,
          conversationId: conversation.id,
          buyerId: offer.buyerId,
        })
      }
    } else if (offer.status !== 'countered') {
      console.warn('[offers] buyer email missing; offer accepted email skipped', {
        offerId: offer.id,
        buyerId: offer.buyerId,
      })
    }
    return { ok: true }
  }, [offers, listings, users, addNotification, currentUser, getOrCreateConversationForUsers, addConversationEvent, dbPatchOffer, dbMarkReserved, showToast, ensureUserById])

  const declineOffer = useCallback(async (offerId) => {
    const now = new Date()
    const offer = offers.find(o => o.id === offerId)
    if (!offer) return { error: 'Offer not found. Please refresh the conversation and try again.' }
    if (offer.status !== 'pending' && offer.status !== 'countered') return { error: 'This offer is no longer pending.' }
    if (offer.status === 'pending' && currentUser?.id !== offer.sellerId) return { error: 'Only the seller can decline this offer.' }
    if (offer.status === 'countered' && currentUser?.id !== offer.buyerId) return { error: 'Only the buyer can decline this counter offer.' }
    const { error } = await dbPatchOffer(offerId, { status: 'declined', updatedAt: now.toISOString() })
    if (error) {
      return { error: 'Failed to decline offer: ' + error.message }
    }
    setOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o
      return { ...o, status: 'declined', updatedAt: now.toISOString() }
    }))
    const listing = listings.find(l => l.id === offer.listingId)
    const notifyUserId = offer.status === 'countered' ? offer.sellerId : offer.buyerId
    const decliner = users.find(u => u.id === (offer.status === 'countered' ? offer.buyerId : offer.sellerId))
    const conversation = getOrCreateConversationForUsers(offer.buyerId, offer.sellerId, offer.listingId)
    if (!conversation?.id) return { error: 'Could not find the message thread for this offer.' }
    const eventResult = await addConversationEvent(conversation.id, {
        type: 'offer',
        eventType: 'offer_declined',
        senderId: decliner?.id || currentUser?.id || 'system',
        recipientId: notifyUserId,
        offerId: offer.id,
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        title: 'Offer declined',
        text: `@${decliner?.username || 'user'} declined ${offer.status === 'countered' ? 'the counter offer' : 'the offer'} on "${listing?.title || 'item'}"`,
        offerPrice: offer.counterPrice || offer.price,
        originalPrice: listing?.price,
        itemTitle: listing?.title || 'item',
        itemImage: listing?.images?.[0] || null,
        status: 'declined',
      })
    if (eventResult?.error) {
      console.error('[offers] decline event failed:', eventResult.error)
    }
    await addNotification({
        userId: notifyUserId,
        type: 'offer_declined',
        title: 'Offer declined',
        message: `@${decliner?.username || 'user'} declined your ${offer.status === 'countered' ? 'counter' : 'offer'} on "${listing?.title || 'item'}"`,
        offerId: offer.id,
        listingId: offer.listingId,
        conversationId: conversation.id,
        actionTarget: `/messages/${conversation.id}`,
      })

      // Email: notify the other party that offer was declined
    const recipient = users.find(u => u.id === notifyUserId)
    if (recipient?.email) {
      await sendOfferDeclinedEmail(recipient.email, listing?.title || 'item', offer.counterPrice || offer.price, decliner?.username || 'user', {
          offerId: offer.id,
          listingId: offer.listingId,
          conversationId: conversation.id,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
          related_entity_type: 'offer',
          related_entity_id: offer.id,
        })
    }
    return { ok: true }
  }, [offers, listings, users, addNotification, currentUser, getOrCreateConversationForUsers, addConversationEvent, dbPatchOffer, showToast])

  const releaseListingReservation = useCallback(async (listingId) => {
    if (!listingId) return
    await dbReleaseReservation(listingId)
  }, [dbReleaseReservation])

  const counterOffer = useCallback(async (offerId, counterPrice, opts = {}) => {
    const now = new Date()
    const offer = offers.find(o => o.id === offerId)
    const normalizedCounterPrice = Number(counterPrice).toFixed(2)
    const idempotencyKey = opts?.idempotencyKey || `${currentUser?.id || 'user'}:${offerId}:${normalizedCounterPrice}`
    const dedupeKey = `${currentUser?.id || 'user'}:${offerId}:${normalizedCounterPrice}`
    const requestKey = `${idempotencyKey}:${dedupeKey}`
    console.info('[offers] counterOffer start', {
      offerId,
      counterPrice,
      idempotencyKey,
      sellerId: offer?.sellerId || null,
      buyerId: offer?.buyerId || null,
      listingId: offer?.listingId || null,
      currentUserId: currentUser?.id || null,
    })
    if (!offer) return { error: 'Offer not found. Please refresh the conversation and try again.' }
    if (offer.status !== 'pending') return { error: 'Only pending offers can be countered.' }
    if (currentUser?.id !== offer.sellerId) return { error: 'Only the seller can counter this offer.' }
    const existingRequest = counterOfferRequestsRef.current.get(requestKey) || counterOfferRequestsRef.current.get(dedupeKey)
    if (existingRequest && Date.now() - existingRequest.ts < COUNTER_OFFER_DEDUPE_MS) {
      console.warn('[offers] duplicate counterOffer suppressed', {
        offerId,
        counterPrice,
        idempotencyKey,
        dedupeKey,
        hasOriginalResult: !!existingRequest.result,
      })
      return existingRequest.result || { ok: true, duplicate: true, emailSent: existingRequest.emailSent ?? null }
    }
    counterOfferRequestsRef.current.set(requestKey, { ts: Date.now(), result: null, emailSent: null })
    counterOfferRequestsRef.current.set(dedupeKey, { ts: Date.now(), result: null, emailSent: null })
    const { error } = await dbPatchOffer(offerId, {
      status: 'countered',
      counterPrice,
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + OFFER_EXPIRY_MS).toISOString(),
      metadata: {
        ...(offer.metadata || {}),
        counterIdempotencyKey: idempotencyKey,
      },
    }, { expectedStatus: 'pending' })
    if (error) {
      console.error('[offers] counterOffer status update failed', {
        offerId,
        message: error.message,
        code: error.code || null,
      })
      counterOfferRequestsRef.current.delete(requestKey)
      counterOfferRequestsRef.current.delete(dedupeKey)
      if (error.code === 'PGRST116') {
        return { error: 'This offer has already been updated. Please refresh the conversation.' }
      }
      return { error: 'Failed to counter offer: ' + error.message }
    }
    console.info('[offers] counterOffer status updated', {
      offerId,
      status: 'countered',
      counterPrice,
    })
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
    const listing = listings.find(l => l.id === offer.listingId)
    const seller = users.find(u => u.id === offer.sellerId)
    const conversation = getOrCreateConversationForUsers(offer.buyerId, offer.sellerId, offer.listingId)
    if (!conversation?.id) {
      counterOfferRequestsRef.current.delete(requestKey)
      counterOfferRequestsRef.current.delete(dedupeKey)
      return { error: 'Could not find the message thread for this offer.' }
    }
    const eventResult = await addConversationEvent(conversation.id, {
        type: 'offer',
        eventType: 'offer_countered',
        senderId: offer.sellerId,
        recipientId: offer.buyerId,
        offerId: offer.id,
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        title: 'Counter offer received',
        text: `@${seller?.username || 'seller'} countered with €${counterPrice} on "${listing?.title || 'item'}"`,
        idempotencyKey,
        offerPrice: counterPrice,
        originalPrice: offer.price,
        itemTitle: listing?.title || 'item',
        itemImage: listing?.images?.[0] || null,
        status: 'countered',
      })
    if (eventResult?.error) {
      console.error('[offers] counter event failed:', eventResult.error)
    }
    await addNotification({
        userId: offer.buyerId,
        type: 'offer_countered',
        title: 'Counter offer received',
        message: `@${seller?.username || 'seller'} countered with €${counterPrice} on "${listing?.title || 'item'}"`,
        offerId: offer.id,
        listingId: offer.listingId,
        conversationId: conversation.id,
        actionTarget: `/messages/${conversation.id}`,
        metadata: { idempotencyKey },
      })
    console.info('[offers] counterOffer notification created', {
      offerId: offer.id,
      recipientId: offer.buyerId,
      conversationId: conversation.id,
    })

    // Email: notify buyer about counter offer
    console.info('[offers] counterOffer email profile lookup start', {
      offerId: offer.id,
      recipientId: offer.buyerId,
      emailType: 'offer_countered',
    })
    const ensuredBuyer = await ensureUserById?.(offer.buyerId)
    const buyer = ensuredBuyer || users.find(u => u.id === offer.buyerId)
    console.info('[offers] counterOffer email recipient resolved', {
      offerId: offer.id,
      recipientId: offer.buyerId,
      hasProfile: !!buyer,
      recipientEmail: buyer?.email || null,
      emailType: 'offer_countered',
    })
    let emailResult = null
    if (buyer?.email) {
      console.info('[offers] counterOffer email send triggered', {
        offerId: offer.id,
        recipientEmail: buyer.email,
        emailType: 'offer_countered',
        conversationId: conversation.id,
      })
      emailResult = await sendOfferCounteredEmail(buyer.email, listing?.title || 'item', offer.price, counterPrice, seller?.username || 'seller', {
          offerId: offer.id,
          listingId: offer.listingId,
          conversationId: conversation.id,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
          related_entity_type: 'offer',
          related_entity_id: offer.id,
        })
      console.info('[offers] counterOffer email result', {
        offerId: offer.id,
        recipientEmail: buyer.email,
        emailType: 'offer_countered',
        response: emailResult,
        emailSent: !!emailResult?.emailSent,
        success: !!emailResult?.success,
      })
      if (!emailResult?.success || !emailResult?.emailSent) {
        console.warn('[offers] counterOffer email failed or not sent', {
          offerId: offer.id,
          recipientId: offer.buyerId,
          recipientEmail: buyer.email,
          emailType: 'offer_countered',
          response: emailResult,
        })
      }
    } else {
      console.error('[offers] counterOffer email skipped: buyer email missing', {
        offerId: offer.id,
        recipientId: offer.buyerId,
        hasProfile: !!buyer,
        emailType: 'offer_countered',
      })
    }
    const result = { ok: true, duplicate: false, emailSent: !!emailResult?.emailSent }
    counterOfferRequestsRef.current.set(requestKey, { ts: Date.now(), result, emailSent: result.emailSent })
    counterOfferRequestsRef.current.set(dedupeKey, { ts: Date.now(), result, emailSent: result.emailSent })
    setTimeout(() => {
      counterOfferRequestsRef.current.delete(requestKey)
      counterOfferRequestsRef.current.delete(dedupeKey)
    }, COUNTER_OFFER_DEDUPE_MS)
    return result
  }, [offers, listings, users, addNotification, currentUser, ensureUserById, getOrCreateConversationForUsers, addConversationEvent, dbPatchOffer, showToast])

  const recoverOfferConversationFromLink = useCallback((params = {}) => {
    const {
      conversationId,
      offerId,
      listingId,
      buyerId,
      sellerId,
      price,
      buyerName,
      itemTitle,
    } = params

    if (!currentUser || !conversationId || !offerId || !listingId || !buyerId || !sellerId) {
      return null
    }

    if (![buyerId, sellerId].includes(currentUser.id)) {
      return null
    }

    const listing = listings.find(l => l.id === listingId)
    const offerPrice = Number(price || 0)
    const now = new Date().toISOString()
    const existingOffer = offers.find(o => o.id === offerId)

    if (!existingOffer && offerPrice > 0) {
      const recoveredOffer = {
        id: offerId,
        listingId,
        buyerId,
        sellerId,
        conversationId,
        price: offerPrice,
        status: 'pending',
        counterPrice: null,
        acceptedPrice: null,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.now() + OFFER_EXPIRY_MS).toISOString(),
      }
      setOffers(prev => prev.some(o => o.id === offerId) ? prev : [recoveredOffer, ...prev])
    }

    const offerMessage = {
      id: `ev_${offerId}`,
      senderId: buyerId,
      text: `@${buyerName || 'buyer'} offered €${offerPrice.toFixed(2)} on "${itemTitle || listing?.title || 'item'}"`,
      timestamp: now,
      type: 'offer',
      eventType: 'offer_received',
      read: false,
      offerId,
      listingId,
      buyerId,
      sellerId,
      title: 'Offer received',
      offerPrice,
      originalPrice: listing?.price,
      itemTitle: itemTitle || listing?.title || 'Item',
      itemImage: listing?.images?.[0] || null,
      status: existingOffer?.status || 'pending',
    }

    const recoveredConversation = {
      id: conversationId,
      participants: [buyerId, sellerId],
      listingId,
      messages: [offerMessage],
    }

    setConversations(prev => {
      const existing = prev.find(c => c.id === conversationId)
      if (!existing) return [...prev, recoveredConversation]

      const hasOfferMessage = existing.messages?.some(m => m.offerId === offerId)
      if (hasOfferMessage) return prev

      return prev.map(c => (
        c.id === conversationId
          ? { ...c, messages: [...(c.messages || []), offerMessage] }
          : c
      ))
    })

    return recoveredConversation
  }, [currentUser, listings, offers, OFFER_EXPIRY_MS])

  const getOfferById = useCallback((id) => offers.find(o => o.id === id), [offers])

  const getListingOffers = useCallback((listingId) => {
    return offers.filter(o => o.listingId === listingId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [offers])

  const getUserActiveOfferOnListing = useCallback((userId, listingId) => {
    return offers.find(o => o.buyerId === userId && o.listingId === listingId && isActiveOffer(o))
  }, [offers])

  const pendingPackagePreparationOffer = useMemo(() => {
    if (!currentUser?.id) return null
    return offers.find(o => (
      o.sellerId === currentUser.id &&
      o.status === 'accepted' &&
      o.metadata?.sellerPreparationStatus === 'seller_preparing_package' &&
      !o.metadata?.packagePreparedAt &&
      !packagePrepDismissedOfferIds.has(o.id)
    )) || null
  }, [currentUser?.id, offers, packagePrepDismissedOfferIds])

  const dismissPackagePreparationPrompt = useCallback((offerId) => {
    if (!offerId) return
    setPackagePrepDismissedOfferIds(prev => new Set([...prev, offerId]))
  }, [])

  const markOfferPackagePrepared = useCallback(async (offerId) => {
    const offer = offers.find(o => o.id === offerId)
    if (!offer) return { error: 'Offer not found. Please refresh and try again.' }
    if (currentUser?.id !== offer.sellerId) return { error: 'Only the seller can update package preparation.' }
    const now = new Date().toISOString()
    const metadata = {
      ...(offer.metadata || {}),
      sellerPreparationStatus: 'ready_for_pickup',
      packagePreparedAt: now,
    }
    const { error } = await dbPatchOffer(offerId, {
      updatedAt: now,
      metadata,
    })
    if (error) {
      console.error('[offers] mark package prepared failed', {
        offerId,
        sellerId: offer.sellerId,
        message: error.message,
        code: error.code || null,
      })
      return { error: 'Could not save package preparation. Please try again.' }
    }
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, updatedAt: now, metadata } : o))
    setPackagePrepDismissedOfferIds(prev => new Set([...prev, offerId]))
    const paidOrder = orders.find(order => (
      order.listingId === offer.listingId &&
      order.sellerId === offer.sellerId &&
      order.buyerId === offer.buyerId &&
      ['paid', 'accepted', 'seller_preparing_package', 'ready_for_pickup'].includes(order.status || order.trackingStatus)
    ))
    if (paidOrder) await ensureMaltaPostShipment(paidOrder, 'sellerPackagePrepared')
    return { ok: true }
  }, [offers, currentUser?.id, dbPatchOffer, setOffers, orders, ensureMaltaPostShipment])

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
    const deliveryType = deliveryInfo?.type || 'home_delivery'
    const fulfilmentMethod = normalizeFulfilmentMethod(deliveryType)
    if (fulfilmentMethod === 'locker' && items.some(item => !isLockerEligible(item))) {
      showToast('Locker delivery not available for this item', 'error')
      return null
    }
    const dFee = getFulfilmentPrice(fulfilmentMethod)
    const fees = calculateBundleFees(subtotal, dFee)
    const deliveryLabel = getFulfilmentMethodLabel(fulfilmentMethod)
    const orderRef = `SIB-B${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()
    const seller = users.find(u => u.id === bundle.sellerId)
    const sellerPayoutReady = canSellerReceivePayouts(seller)
    const orderStatus = sellerPayoutReady ? 'paid' : SELLER_PAYOUT_PENDING_STATUS
    const lockerLocation = fulfilmentMethod === 'locker' ? {
      name: deliveryInfo?.lockerName || null,
      address: deliveryInfo?.lockerAddress || address || null,
    } : null
    const deliveryAddressSnapshot = fulfilmentMethod === 'delivery' ? {
      raw: address || null,
      buyerFullName: deliverySnapshot?.buyerFullName || currentUser?.name || null,
      buyerPhone: deliverySnapshot?.buyerPhone || null,
      buyerCity: deliverySnapshot?.buyerCity || null,
      buyerPostcode: deliverySnapshot?.buyerPostcode || null,
      deliveryNotes: deliverySnapshot?.deliveryNotes || null,
    } : null
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
      fulfilmentProvider: FULFILMENT_PROVIDER,
      fulfilmentMethod,
      fulfilmentPrice: dFee,
      fulfilmentStatus: 'awaiting_fulfilment',
      lockerLocation,
      deliveryAddressSnapshot,
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
      status: orderStatus,
      deliveryMethod: deliveryType,
      deliveryFee: dFee,
      fulfilmentProvider: FULFILMENT_PROVIDER,
      fulfilmentMethod,
      fulfilmentPrice: dFee,
      fulfilmentStatus: 'awaiting_fulfilment',
      lockerLocation,
      deliveryAddressSnapshot,
      trackingStatus: 'awaiting_delivery',
      payoutStatus: 'held',
      sellerPayoutStatus: sellerPayoutReady ? 'held' : 'setup_pending',
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
    await Promise.all(bundle.items.map(id => dbMarkSold(id)))
    incrementUserSales(bundle.sellerId, items.length)

    // Auto-create shipment record for this paid bundle order
    const shipmentData = createShipmentRecord(savedOrder)
    shipmentData.deliveryType = deliveryType
    const { error: shipErr } = await dbCreateShipment(shipmentData)
    if (shipErr) console.error('[placeBundleOrder] shipment create failed:', shipErr.message)
    if (!shipErr) await ensureMaltaPostShipment(savedOrder, 'placeBundleOrder')

    // Notify seller
    addNotification({
      userId: bundle.sellerId,
      orderId: savedOrder.id,
      listingId: savedOrder.listingId,
      status: 'awaiting_shipment',
      actionTarget: `/orders/${savedOrder.id}`,
      type: 'bundle_sold',
      title: `${items.length}-item bundle sold — ship within 3 days`,
      message: `@${currentUser.username} purchased ${items.length} items for €${fees.total.toFixed(2)} — ${deliveryLabel}. Ship via MaltaPost within 3 business days.`,
    })

    if (!sellerPayoutReady) {
      addNotification({
        userId: bundle.sellerId,
        orderId: savedOrder.id,
        listingId: savedOrder.listingId,
        actionTarget: '/seller/payout-settings',
        type: 'seller_payout_setup_required',
        title: 'Complete payout setup',
        message: 'You made a sale. Please complete payout setup to receive your funds.',
      })
    }

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
    }

    // Email: item sold notification to seller
    sendItemSoldEmail(seller?.email || null, seller?.name || seller?.username || 'seller', `${items.length}-item bundle`, orderRef, subtotal.toFixed(2), currentUser.username, {
      related_entity_type: 'order',
      related_entity_id: savedOrder.id,
      orderId: savedOrder.id,
      listingId: savedOrder.listingId,
      sellerId: bundle.sellerId,
      buyerId: currentUser.id,
      bundle: true,
    })

    // Clear bundle after order
    setBundle(null)
    return savedOrder
  }, [currentUser, bundle, listings, users, orders, calculateBundleFees, addNotification, dbCreateOrder, dbCreateShipment, ensureMaltaPostShipment, showToast])

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
      sendBundleOfferReceivedEmail(seller.email, items.length, price, subtotal.toFixed(2), currentUser.username, {
        offerId: newOffer.id,
        related_entity_type: 'bundle_offer',
        related_entity_id: newOffer.id,
      })
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
    if (notifyUser?.email) sendBundleOfferAcceptedEmail(notifyUser.email, offer.itemCount, acceptedPrice.toFixed(2), acceptor?.username || 'user', {
      offerId: offer.id,
      related_entity_type: 'bundle_offer',
      related_entity_id: offer.id,
    })
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
    if (notifyUser?.email) sendBundleOfferDeclinedEmail(notifyUser.email, offer.itemCount, offer.price.toFixed(2), decliner?.username || 'user', {
      offerId: offer.id,
      related_entity_type: 'bundle_offer',
      related_entity_id: offer.id,
    })
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
    if (buyer?.email) sendBundleOfferCounteredEmail(buyer.email, offer.itemCount, offer.price.toFixed(2), counterPrice.toFixed(2), seller?.username || 'seller', {
      offerId: offer.id,
      related_entity_type: 'bundle_offer',
      related_entity_id: offer.id,
    })
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

    const deliveryType = deliveryInfo?.type || 'home_delivery'
    const fulfilmentMethod = normalizeFulfilmentMethod(deliveryType)
    if (fulfilmentMethod === 'locker' && items.some(item => !isLockerEligible(item))) {
      showToast('Locker delivery not available for this item', 'error')
      return null
    }
    const dFee = getFulfilmentPrice(fulfilmentMethod)
    const fees = calculateBundleFees(acceptedPrice, dFee)
    const deliveryLabel = getFulfilmentMethodLabel(fulfilmentMethod)
    const orderRef = `SIB-B${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()
    const sellerUser = users.find(u => u.id === offer.sellerId)
    const sellerPayoutReady = canSellerReceivePayouts(sellerUser)
    const orderStatus = sellerPayoutReady ? 'paid' : SELLER_PAYOUT_PENDING_STATUS
    const lockerLocation = fulfilmentMethod === 'locker' ? {
      name: deliveryInfo?.lockerName || null,
      address: deliveryInfo?.lockerAddress || address || null,
    } : null
    const deliveryAddressSnapshot = fulfilmentMethod === 'delivery' ? {
      raw: address || null,
      buyerFullName: deliverySnapshot?.buyerFullName || null,
      buyerPhone: deliverySnapshot?.buyerPhone || null,
      buyerCity: deliverySnapshot?.buyerCity || null,
      buyerPostcode: deliverySnapshot?.buyerPostcode || null,
      deliveryNotes: deliverySnapshot?.deliveryNotes || null,
    } : null
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
      fulfilmentProvider: FULFILMENT_PROVIDER,
      fulfilmentMethod,
      fulfilmentPrice: dFee,
      fulfilmentStatus: 'awaiting_fulfilment',
      lockerLocation,
      deliveryAddressSnapshot,
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
      status: orderStatus,
      deliveryMethod: deliveryType,
      deliveryFee: dFee,
      fulfilmentProvider: FULFILMENT_PROVIDER,
      fulfilmentMethod,
      fulfilmentPrice: dFee,
      fulfilmentStatus: 'awaiting_fulfilment',
      lockerLocation,
      deliveryAddressSnapshot,
      trackingStatus: 'awaiting_delivery',
      payoutStatus: 'held',
      sellerPayoutStatus: sellerPayoutReady ? 'held' : 'setup_pending',
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
    await Promise.all(offer.listingIds.map(id => dbMarkSold(id)))
    incrementUserSales(offer.sellerId, items.length)

    // Auto-create shipment record for this paid bundle offer order
    const shipmentData = createShipmentRecord(savedOrder)
    shipmentData.deliveryType = deliveryType
    const { error: shipErr } = await dbCreateShipment(shipmentData)
    if (shipErr) console.error('[placeBundleOfferOrder] shipment create failed:', shipErr.message)
    if (!shipErr) await ensureMaltaPostShipment(savedOrder, 'placeBundleOfferOrder')

    addNotification({
      userId: offer.sellerId,
      orderId: savedOrder.id,
      listingId: savedOrder.listingId,
      status: 'awaiting_shipment',
      actionTarget: `/orders/${savedOrder.id}`,
      type: 'bundle_sold',
      title: `${items.length}-item bundle sold — ship within 3 days`,
      message: `@${users.find(u => u.id === offer.buyerId)?.username || 'buyer'} purchased ${items.length} items for €${fees.total.toFixed(2)} — ${deliveryLabel}. Ship via MaltaPost within 3 business days.`,
    })

    if (!sellerPayoutReady) {
      addNotification({
        userId: offer.sellerId,
        orderId: savedOrder.id,
        listingId: savedOrder.listingId,
        actionTarget: '/seller/payout-settings',
        type: 'seller_payout_setup_required',
        title: 'Complete payout setup',
        message: 'You made a sale. Please complete payout setup to receive your funds.',
      })
    }

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
    }

    // Email seller sold notification
    sendItemSoldEmail(sellerUser?.email || null, sellerUser?.name || sellerUser?.username || 'seller', `${items.length}-item bundle`, orderRef, acceptedPrice.toFixed(2), buyer?.username || 'buyer', {
      related_entity_type: 'order',
      related_entity_id: savedOrder.id,
      orderId: savedOrder.id,
      listingId: savedOrder.listingId,
      sellerId: offer.sellerId,
      buyerId: offer.buyerId,
      bundle: true,
      bundleOfferId: offerId,
    })

    // Clear buyer's bundle if it matches
    setBundle(prev => {
      if (prev && prev.sellerId === offer.sellerId) return null
      return prev
    })

    return savedOrder
  }, [bundleOffers, listings, users, orders, calculateBundleFees, addNotification, dbCreateOrder, dbCreateShipment, ensureMaltaPostShipment, showToast])

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
      addNotification({ userId: dispute.buyerId, orderId: dispute.orderId, type: 'dispute_message', title: 'Dispute update', message: fromAdmin ? 'Admin has sent a message regarding your dispute.' : message })
      addNotification({ userId: dispute.sellerId, orderId: dispute.orderId, type: 'dispute_message', title: 'Dispute update', message: fromAdmin ? 'Admin has sent a message regarding the dispute.' : message })
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
      fulfilmentStatus: 'shipped',
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
    const updates = { status, fulfilmentStatus: status, updatedAt: now, ...extraData }
    if (status === 'dropped_off' && (!shipment || !shipment.droppedOffAt)) {
      updates.droppedOffAt = extraData.droppedOffAt || now
      updates.dropoffStoreId = extraData.dropoffStoreId || extraData.storeId || shipment?.dropoffStoreId || null
      updates.dropoffStoreName = extraData.dropoffStoreName || extraData.storeName || shipment?.dropoffStoreName || ''
      updates.dropoffStoreAddress = extraData.dropoffStoreAddress || extraData.storeAddress || shipment?.dropoffStoreAddress || ''
      updates.currentLocation = extraData.currentLocation || [updates.dropoffStoreName, updates.dropoffStoreAddress].filter(Boolean).join(' - ')
    }
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
    if (status === 'dropped_off') {
      const order = orders.find(o => o.id === orderId)
      if (order && shipment) {
        const mergedShipment = { ...shipment, ...updates }
        const seller = users.find(u => u.id === order.sellerId)
        const buyer = users.find(u => u.id === order.buyerId)
        const listing = listings.find(l => l.id === order.listingId)
        const sheetRow = buildDeliverySheetRow({ order, shipment: mergedShipment, seller, buyer, listing })
        const { error: sheetError } = await upsertDeliverySheetRow(sheetRow)
        if (sheetError) {
          console.error('[updateShipmentStatus] delivery sheet upsert failed:', sheetError.message)
          showToast('Shipment updated, but delivery sheet update failed: ' + sheetError.message, 'error')
        }
      }
    }
    // Sync order tracking status for delivered/failed
    if (status === 'delivered') {
      await updateOrderStatus(orderId, 'delivered')
    }
  }, [updateOrderStatus, orders, shipments, users, listings, dbPatchShipmentByOrderId, upsertDeliverySheetRow, showToast])

  const markShipmentDroppedOff = useCallback(async (orderId, store = {}, extraData = {}) => {
    const order = orders.find(o => o.id === orderId)
    const shipment = shipments.find(s => s.orderId === orderId)
    if (!order || !shipment) {
      const error = { message: !order ? 'Order not found.' : 'Shipment not found for this order.' }
      showToast(error.message, 'error')
      return { data: null, error }
    }

    const now = extraData.droppedOffAt || new Date().toISOString()
    const dropoffStoreName = store.name || store.storeName || extraData.dropoffStoreName || ''
    const dropoffStoreAddress = store.address || store.storeAddress || extraData.dropoffStoreAddress || ''
    const updates = {
      status: 'dropped_off',
      fulfilmentStatus: 'dropped_off',
      dropoffStoreId: store.id || store.storeId || extraData.dropoffStoreId || null,
      dropoffStoreName,
      dropoffStoreAddress,
      droppedOffAt: now,
      currentLocation: extraData.currentLocation || [dropoffStoreName, dropoffStoreAddress].filter(Boolean).join(' - '),
      fallbackStoreName: extraData.fallbackStoreName || shipment.fallbackStoreName || '',
      notes: extraData.notes || shipment.notes || '',
      updatedAt: now,
    }

    const { data: updatedShipment, error } = await dbPatchShipment(shipment.id, updates)
    if (error) {
      console.error('[markShipmentDroppedOff] DB write failed:', error.message)
      showToast('Failed to record store drop-off: ' + error.message, 'error')
      return { data: null, error }
    }

    const mergedShipment = { ...shipment, ...updatedShipment, ...updates }
    const seller = users.find(u => u.id === order.sellerId)
    const buyer = users.find(u => u.id === order.buyerId)
    const listing = listings.find(l => l.id === order.listingId)
    const sheetRow = buildDeliverySheetRow({ order, shipment: mergedShipment, seller, buyer, listing })
    const { data: deliverySheetRow, error: sheetError } = await upsertDeliverySheetRow(sheetRow)
    if (sheetError) {
      console.error('[markShipmentDroppedOff] delivery sheet upsert failed:', sheetError.message)
      showToast('Drop-off saved, but delivery sheet update failed: ' + sheetError.message, 'error')
      return { data: updatedShipment, deliverySheetRow: null, error: sheetError }
    }

    await refreshShipments()
    await refreshLogisticsDeliverySheet()
    showToast('Parcel drop-off recorded.')
    return { data: updatedShipment, deliverySheetRow, error: null }
  }, [orders, shipments, users, listings, dbPatchShipment, upsertDeliverySheetRow, refreshShipments, refreshLogisticsDeliverySheet, showToast])

  // Admin: force update any shipment field
  const adminUpdateShipment = useCallback(async (shipmentId, updates) => {
    const now = new Date().toISOString()
    const { error } = await dbPatchShipment(shipmentId, { ...updates, updatedAt: now })
    if (error) {
      console.error('[adminUpdateShipment] DB write failed:', error.message)
      showToast('Failed to update shipment: ' + error.message, 'error')
    }
  }, [dbPatchShipment, showToast])

  const adminCreateShipmentShortcut = useCallback(async (orderId, payload) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return { data: null, error: { message: 'Order not found.' } }

    const shipmentPayload = payload || buildAdminShipmentPayload(order, {
      buyer: users.find(u => u.id === order.buyerId),
    })
    const now = new Date().toISOString()
    const existing = shipments.find(s => s.orderId === orderId)

    if (existing?.shipmentReference || existing?.shipmentCreatedAt) {
      return { data: existing, error: null, duplicate: true, payload: shipmentPayload }
    }

    const updates = {
      status: 'label_created',
      fulfilmentStatus: 'label_created',
      shipmentCreatedAt: now,
      shipmentReference: shipmentPayload.shipmentReference,
      deliveryType: shipmentPayload.deliveryType,
      recipientAddress: {
        name: [shipmentPayload.recipientName, shipmentPayload.recipientSurname].filter(Boolean).join(' '),
        phone: shipmentPayload.recipientPhone || null,
        email: shipmentPayload.recipientEmail || null,
        address: shipmentPayload.address || null,
        postcode: shipmentPayload.postcode || null,
        country: shipmentPayload.country || 'Malta',
      },
      notes: `Admin MaltaPost shipment shortcut generated for ${shipmentPayload.orderReference}`,
      updatedAt: now,
    }

    if (existing?.id) {
      const { data, error } = await dbPatchShipment(existing.id, updates)
      if (error) return { data: null, error, payload: shipmentPayload }
      return { data, error: null, duplicate: false, payload: shipmentPayload }
    }

    const { data, error } = await dbCreateShipment({
      orderId: order.id,
      orderRef: order.orderRef,
      sellerId: order.sellerId,
      buyerId: order.buyerId,
      courier: 'MaltaPost',
      fulfilmentProvider: order.fulfilmentProvider || FULFILMENT_PROVIDER,
      fulfilmentMethod: order.fulfilmentMethod,
      fulfilmentPrice: order.fulfilmentPrice ?? order.deliveryFee,
      ...updates,
    })
    return { data, error, duplicate: false, payload: shipmentPayload }
  }, [orders, shipments, users, dbCreateShipment, dbPatchShipment])

  // ──────────────────────────────────────────────────────────────────
  // getUserById, getUserByUsername, getListingById, getUserListings come from hooks above

  const getUserOrders = useCallback((userId) => (
    orders
      .filter(o => o.buyerId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  ), [orders])
  const getUserSales = useCallback((userId) => (
    orders
      .filter(o => o.sellerId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  ), [orders])
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
      currentUser, users, listings, listingsLoading, listingsLoadingMore, hasMoreListings, orders, ordersLoading, ordersDbAvailable, ordersDbError, conversations, reviews, disputes, disputesLoading, likedListings, payoutProfiles, notifications, offers, bundle, bundleOffers, shipments, shipmentsLoading, logisticsDeliverySheet, logisticsDeliverySheetLoading, toast,
      PROTECTION_WINDOW_MS, SHIPPING_DEADLINE_MS,
      login, signup, register, logout, requestPasswordReset, validateResetToken, resetPassword, updateProfile,
      createListing, updateListing, deleteListing, boostListing, unboostListing, flagListing, approveListing, hideListing, updateStyleTags, updateCollectionTags, adminUpdateListingMeta, toggleLike, loadMoreListings,
      placeOrder, getOrCreateConversation, sendMessage, markConversationRead, getUnreadConversationCount, updateOrderStatus,
      confirmDelivery, openDispute, adminOpenDispute, flagOrderOverdue, DISPUTE_REASONS,
      addNotification, markNotificationRead, markAllNotificationsRead, getUserNotifications, refreshNotifications,
      refreshOrders, refreshDisputes, refreshPayouts, refreshShipments, refreshLogisticsDeliverySheet,
      createOffer, acceptOffer, declineOffer, counterOffer, releaseListingReservation, recoverOfferConversationFromLink, getOfferById, getListingOffers, getUserActiveOfferOnListing,
      pendingPackagePreparationOffer, dismissPackagePreparationPrompt, markOfferPackagePrepared,
      addToBundle, removeFromBundle, clearBundle, isInBundle, calculateBundleFees, placeBundleOrder,
      createBundleOffer, acceptBundleOffer, declineBundleOffer, counterBundleOffer, getBundleOfferById, placeBundleOfferOrder,
      suspendUser, banUser, restoreUser, updateSellerBadges, updateTrustTags, updateAdminRole, holdPayout, releasePayout, refundOrder, resolveDispute, cancelOrder, addDisputeMessage,
      savePayoutProfile, getPayoutProfile,
      refreshCurrentProfile, ensureUserById,
      getShipmentByOrderId, getSellerShipments, getBuyerShipments, markShipmentShipped, updateShipmentStatus, markShipmentDroppedOff, adminUpdateShipment, adminCreateShipmentShortcut,
      getUserById, getUserByUsername, getListingById, getUserListings,
      getUserOrders, getUserSales,
      getUserConversations, getConversationById, getConversation, refreshConversations,
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
