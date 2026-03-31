import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { SEED_USERS, SEED_LISTINGS, SEED_ORDERS, SEED_MESSAGES, SEED_REVIEWS, SEED_DISPUTES } from '../data/seed'

const AppContext = createContext(null)

const PROTECTION_WINDOW_MS = 48 * 60 * 60 * 1000 // 48 hours

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
const DATA_VERSION = 3

function getInitialListings() {
  const version = loadFromStorage('sib_data_version', 0)
  if (version < DATA_VERSION) {
    try { localStorage.removeItem('sib_listings') } catch {}
    try { localStorage.removeItem('sib_orders') } catch {}
    try { localStorage.removeItem('sib_notifications') } catch {}
    try { localStorage.setItem('sib_data_version', JSON.stringify(DATA_VERSION)) } catch {}
    return SEED_LISTINGS
  }
  return loadFromStorage('sib_listings', SEED_LISTINGS)
}

function getInitialOrders() {
  const version = loadFromStorage('sib_data_version', 0)
  if (version < DATA_VERSION) return SEED_ORDERS
  return loadFromStorage('sib_orders', SEED_ORDERS)
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => loadFromStorage('sib_currentUser', null))
  const [users, setUsers] = useState(() => loadFromStorage('sib_users', SEED_USERS))
  const [listings, setListings] = useState(() => getInitialListings())
  const [orders, setOrders] = useState(() => getInitialOrders())
  const [conversations, setConversations] = useState(() => loadFromStorage('sib_conversations', SEED_MESSAGES))
  const [reviews, setReviews] = useState(() => loadFromStorage('sib_reviews', SEED_REVIEWS))
  const [disputes, setDisputes] = useState(() => loadFromStorage('sib_disputes', SEED_DISPUTES))
  const [likedListings, setLikedListings] = useState(() => loadFromStorage('sib_likes', []))
  const [payoutProfiles, setPayoutProfiles] = useState(() => loadFromStorage('sib_payoutProfiles', {}))
  const [notifications, setNotifications] = useState(() => loadFromStorage('sib_notifications', []))
  const [offers, setOffers] = useState(() => loadFromStorage('sib_offers', []))
  const [bundle, setBundle] = useState(() => loadFromStorage('sib_bundle', null))
  const [bundleOffers, setBundleOffers] = useState(() => loadFromStorage('sib_bundleOffers', []))
  const [toast, setToast] = useState(null)

  useEffect(() => { saveToStorage('sib_currentUser', currentUser) }, [currentUser])
  useEffect(() => { saveToStorage('sib_users', users) }, [users])
  useEffect(() => { saveToStorage('sib_listings', listings) }, [listings])
  useEffect(() => { saveToStorage('sib_orders', orders) }, [orders])
  useEffect(() => { saveToStorage('sib_conversations', conversations) }, [conversations])
  useEffect(() => { saveToStorage('sib_reviews', reviews) }, [reviews])
  useEffect(() => { saveToStorage('sib_disputes', disputes) }, [disputes])
  useEffect(() => { saveToStorage('sib_likes', likedListings) }, [likedListings])
  useEffect(() => { saveToStorage('sib_payoutProfiles', payoutProfiles) }, [payoutProfiles])
  useEffect(() => { saveToStorage('sib_notifications', notifications) }, [notifications])
  useEffect(() => { saveToStorage('sib_offers', offers) }, [offers])
  useEffect(() => { saveToStorage('sib_bundle', bundle) }, [bundle])
  useEffect(() => { saveToStorage('sib_bundleOffers', bundleOffers) }, [bundleOffers])

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
    const checkAutoConfirm = () => {
      const now = Date.now()
      setOrders(prev => {
        let changed = false
        const updated = prev.map(o => {
          if (o.trackingStatus !== 'delivered' || !o.deliveredAt) return o
          const elapsed = now - new Date(o.deliveredAt).getTime()
          if (elapsed >= PROTECTION_WINDOW_MS) {
            changed = true
            const ts = new Date().toISOString()
            setNotifications(n => [...n, {
              id: `n${Date.now()}_ac_${o.id}`,
              userId: o.buyerId,
              orderId: o.id,
              type: 'auto_confirmed',
              title: 'Order auto-confirmed',
              message: 'Your 48-hour protection window has expired. The order has been automatically confirmed.',
              read: false,
              createdAt: ts,
            }, {
              id: `n${Date.now()}_acs_${o.id}`,
              userId: o.sellerId,
              orderId: o.id,
              type: 'confirmed',
              title: 'Delivery confirmed',
              message: 'The buyer\'s 48-hour window has expired. Your payout is now available.',
              read: false,
              createdAt: ts,
            }])
            return {
              ...o,
              trackingStatus: 'confirmed',
              payoutStatus: 'available',
              confirmedAt: ts,
              autoConfirmed: true,
              updatedAt: ts,
            }
          }
          return o
        })
        return changed ? updated : prev
      })
    }
    checkAutoConfirm()
    const interval = setInterval(checkAutoConfirm, 30000)
    return () => clearInterval(interval)
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const login = useCallback((email, password) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) return false
    // If user has a password set, validate it; seed users without passwords always pass
    if (user.password && user.password !== password) return false
    setCurrentUser(user)
    return true
  }, [users])

  const signup = useCallback((data) => {
    const exists = users.find(u => u.email === data.email || u.username === data.username)
    if (exists) return { error: 'Email or username already taken.' }
    const newUser = {
      id: `u${Date.now()}`,
      username: data.username || (data.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 999)),
      name: data.name,
      email: data.email,
      password: data.password || '',
      phone: data.phone || '',
      bio: '',
      avatar: `https://i.pravatar.cc/150?u=${data.email}`,
      rating: 5.0,
      reviewCount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      isShop: data.isShop || false,
      isAdmin: false,
      sales: 0,
      location: data.location || 'Malta',
    }
    setUsers(prev => [...prev, newUser])
    setCurrentUser(newUser)
    return { user: newUser }
  }, [users])

  // Alias for AuthPage compatibility
  const register = useCallback((form) => {
    const exists = users.find(u => u.email.toLowerCase() === form.email.toLowerCase())
    if (exists) return null
    const desiredUsername = (form.username || form.name.toLowerCase().replace(/\s+/g, '')).toLowerCase()
    const usernameTaken = users.find(u => u.username.toLowerCase() === desiredUsername)
    if (usernameTaken) return 'username_taken'
    const newUser = {
      id: `u${Date.now()}`,
      username: desiredUsername,
      name: form.name,
      email: form.email,
      password: form.password,
      phone: '',
      bio: '',
      avatar: `https://i.pravatar.cc/150?u=${form.email}`,
      rating: 5.0,
      reviewCount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      isShop: false,
      isAdmin: false,
      sales: 0,
      location: form.location || 'Malta',
    }
    setUsers(prev => [...prev, newUser])
    setCurrentUser(newUser)
    return newUser
  }, [users])

  const logout = useCallback(() => {
    setCurrentUser(null)
  }, [])

  const updateProfile = useCallback((updates) => {
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updates } : u))
    setCurrentUser(prev => ({ ...prev, ...updates }))
  }, [currentUser])

  const createListing = useCallback((data) => {
    const newListing = {
      id: `l${Date.now()}`,
      sellerId: currentUser.id,
      ...data,
      createdAt: new Date().toISOString(),
      likes: 0,
      status: 'active',
      views: 0,
    }
    setListings(prev => [newListing, ...prev])
    return newListing
  }, [currentUser])

  const deleteListing = useCallback((listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'deleted' } : l))
  }, [])

  const toggleLike = useCallback((listingId) => {
    if (!currentUser) return
    setLikedListings(prev => {
      const already = prev.includes(listingId)
      return already ? prev.filter(id => id !== listingId) : [...prev, listingId]
    })
    setListings(prev => prev.map(l => {
      if (l.id !== listingId) return l
      const liked = likedListings.includes(listingId)
      return { ...l, likes: liked ? Math.max(0, l.likes - 1) : l.likes + 1 }
    }))
  }, [currentUser, likedListings])

  const placeOrder = useCallback((listingId, deliveryMethod, address, overridePrice) => {
    const listing = listings.find(l => l.id === listingId)
    if (!listing) return null
    const itemPrice = overridePrice != null ? overridePrice : listing.price
    const buyerProtectionFee = parseFloat((1.00 + itemPrice * 0.05).toFixed(2))
    const deliveryFee = 5.00
    const bundledFee = parseFloat((buyerProtectionFee + deliveryFee).toFixed(2))
    const totalPrice = parseFloat((itemPrice + bundledFee).toFixed(2))
    const orderRef = `SIB-${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()
    const newOrder = {
      id: `o${Date.now()}`,
      orderRef,
      listingId,
      buyerId: currentUser.id,
      sellerId: listing.sellerId,
      itemPrice,
      bundledFee,
      totalPrice,
      sellerPayout: itemPrice,
      platformFee: bundledFee,
      status: 'paid',
      deliveryMethod: 'sib_delivery',
      trackingStatus: 'paid',
      payoutStatus: 'held',
      createdAt: now,
      updatedAt: now,
      paidAt: now,
      address,
    }
    setOrders(prev => [newOrder, ...prev])
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'sold' } : l))
    setUsers(prev => prev.map(u => u.id === listing.sellerId ? { ...u, sales: u.sales + 1 } : u))
    return newOrder
  }, [currentUser, listings])

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
    return newMsg
  }, [currentUser])

  // ── Notification helpers ─────────────────────────────────────────
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
  const updateOrderStatus = useCallback((orderId, status) => {
    const now = new Date().toISOString()
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const updates = { trackingStatus: status, updatedAt: now }

      if (status === 'delivered') {
        updates.deliveredAt = now
        // Notify buyer
        addNotification({
          userId: o.buyerId,
          orderId: o.id,
          type: 'delivered',
          title: 'Your item has been delivered',
          message: 'Please confirm everything is OK. You have 48 hours to report an issue.',
        })
        // Notify seller
        addNotification({
          userId: o.sellerId,
          orderId: o.id,
          type: 'delivered_seller',
          title: 'Item delivered',
          message: 'Waiting for buyer confirmation (48h). Payment will be released after confirmation.',
        })
      }

      return { ...o, ...updates }
    }))
  }, [addNotification])

  // ── Buyer confirms delivery → release payout ──────────────────────
  const confirmDelivery = useCallback((orderId) => {
    const now = new Date().toISOString()
    const order = orders.find(o => o.id === orderId)
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      return {
        ...o,
        trackingStatus: 'confirmed',
        payoutStatus: 'available',
        confirmedAt: now,
        autoConfirmed: false,
        updatedAt: now,
      }
    }))
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
  }, [orders, addNotification])

  // ── Buyer opens dispute ───────────────────────────────────────────
  const openDispute = useCallback((orderId, reason) => {
    const now = new Date().toISOString()
    const order = orders.find(o => o.id === orderId)
    if (!order) return null
    const newDispute = {
      id: `d${Date.now()}`,
      orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      reason,
      status: 'open',
      createdAt: now,
    }
    setDisputes(prev => [...prev, newDispute])
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      return { ...o, trackingStatus: 'disputed', payoutStatus: 'held', updatedAt: now }
    }))
    addNotification({
      userId: order.sellerId,
      orderId,
      type: 'dispute_opened',
      title: 'Buyer reported an issue',
      message: `The buyer has reported an issue: "${reason}". Your payout is on hold until this is resolved.`,
    })
    addNotification({
      userId: order.buyerId,
      orderId,
      type: 'dispute_opened_buyer',
      title: 'Issue reported',
      message: 'We have received your report. Our team will review and get back to you shortly.',
    })
    return newDispute
  }, [orders, addNotification])

  // ── Seller payout profile ─────────────────────────────────────────
  const savePayoutProfile = useCallback((userId, profile) => {
    setPayoutProfiles(prev => ({
      ...prev,
      [userId]: { ...profile, createdAt: new Date().toISOString() },
    }))
  }, [])

  const getPayoutProfile = useCallback((userId) => {
    return payoutProfiles[userId] || null
  }, [payoutProfiles])

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

    return { offer: newOffer }
  }, [currentUser, listings, offers, addNotification])

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

  const calculateBundleFees = useCallback((subtotal) => {
    const buyerProtectionFee = parseFloat((1.00 + subtotal * 0.05).toFixed(2))
    const deliveryFee = 5.00 // Single delivery fee for entire bundle
    const bundledFee = parseFloat((buyerProtectionFee + deliveryFee).toFixed(2))
    const total = parseFloat((subtotal + bundledFee).toFixed(2))
    return { buyerProtectionFee, deliveryFee, bundledFee, total }
  }, [])

  const placeBundleOrder = useCallback((address, overrideSubtotal) => {
    if (!currentUser || !bundle || bundle.items.length === 0) return null
    const items = bundle.items.map(id => listings.find(l => l.id === id)).filter(Boolean)
    if (items.length === 0) return null

    const subtotal = overrideSubtotal != null ? overrideSubtotal : items.reduce((sum, l) => sum + l.price, 0)
    const fees = calculateBundleFees(subtotal)
    const orderRef = `SIB-B${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()

    const newOrder = {
      id: `o${Date.now()}`,
      orderRef,
      isBundle: true,
      bundleListingIds: bundle.items,
      listingId: bundle.items[0], // Primary listing for compatibility
      buyerId: currentUser.id,
      sellerId: bundle.sellerId,
      itemPrice: subtotal,
      bundledFee: fees.bundledFee,
      totalPrice: fees.total,
      sellerPayout: subtotal,
      platformFee: fees.bundledFee,
      status: 'paid',
      deliveryMethod: 'sib_delivery',
      trackingStatus: 'paid',
      payoutStatus: 'held',
      createdAt: now,
      updatedAt: now,
      paidAt: now,
      address,
    }

    setOrders(prev => [newOrder, ...prev])
    // Mark all bundled listings as sold
    setListings(prev => prev.map(l => bundle.items.includes(l.id) ? { ...l, status: 'sold' } : l))
    setUsers(prev => prev.map(u => u.id === bundle.sellerId ? { ...u, sales: u.sales + items.length } : u))

    // Notify seller
    addNotification({
      userId: bundle.sellerId,
      orderId: newOrder.id,
      type: 'bundle_sold',
      title: `${items.length}-item bundle sold`,
      message: `@${currentUser.username} purchased ${items.length} items for €${fees.total.toFixed(2)}.`,
    })

    // Clear bundle after order
    setBundle(null)
    return newOrder
  }, [currentUser, bundle, listings, calculateBundleFees, addNotification])

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
  }, [bundleOffers, users, addNotification])

  const getBundleOfferById = useCallback((id) => bundleOffers.find(o => o.id === id), [bundleOffers])

  const placeBundleOfferOrder = useCallback((offerId, address) => {
    const offer = bundleOffers.find(o => o.id === offerId)
    if (!offer || offer.status !== 'accepted') return null
    const acceptedPrice = offer.acceptedPrice || offer.counterPrice || offer.price
    // Temporarily set bundle for placeBundleOrder
    const tempBundle = { sellerId: offer.sellerId, items: offer.listingIds }
    const items = offer.listingIds.map(id => listings.find(l => l.id === id)).filter(Boolean)
    if (items.length === 0) return null

    const fees = calculateBundleFees(acceptedPrice)
    const orderRef = `SIB-B${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()

    const newOrder = {
      id: `o${Date.now()}`,
      orderRef,
      isBundle: true,
      bundleListingIds: offer.listingIds,
      listingId: offer.listingIds[0],
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      itemPrice: acceptedPrice,
      bundledFee: fees.bundledFee,
      totalPrice: fees.total,
      sellerPayout: acceptedPrice,
      platformFee: fees.bundledFee,
      status: 'paid',
      deliveryMethod: 'sib_delivery',
      trackingStatus: 'paid',
      payoutStatus: 'held',
      createdAt: now,
      updatedAt: now,
      paidAt: now,
      address,
      bundleOfferId: offerId,
    }

    setOrders(prev => [newOrder, ...prev])
    setListings(prev => prev.map(l => offer.listingIds.includes(l.id) ? { ...l, status: 'sold' } : l))
    setUsers(prev => prev.map(u => u.id === offer.sellerId ? { ...u, sales: u.sales + items.length } : u))

    addNotification({
      userId: offer.sellerId,
      orderId: newOrder.id,
      type: 'bundle_sold',
      title: `${items.length}-item bundle sold`,
      message: `@${users.find(u => u.id === offer.buyerId)?.username || 'buyer'} purchased ${items.length} items for €${fees.total.toFixed(2)}.`,
    })

    // Clear buyer's bundle if it matches
    setBundle(prev => {
      if (prev && prev.sellerId === offer.sellerId) return null
      return prev
    })

    return newOrder
  }, [bundleOffers, listings, users, calculateBundleFees, addNotification])

  // ── Admin actions ──────────────────────────────────────────────────
  const suspendUser = useCallback((userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: true, banned: false } : u))
  }, [])

  const banUser = useCallback((userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true, suspended: false } : u))
  }, [])

  const restoreUser = useCallback((userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: false, suspended: false } : u))
  }, [])

  const holdPayout = useCallback((orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payoutStatus: 'held' } : o))
  }, [])

  const releasePayout = useCallback((orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payoutStatus: 'released', payoutReleasedAt: new Date().toISOString() } : o))
  }, [])

  const refundOrder = useCallback((orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payoutStatus: 'refunded', trackingStatus: 'refunded' } : o))
  }, [])

  const boostListing = useCallback((listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, boosted: true } : l))
  }, [])

  const unboostListing = useCallback((listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, boosted: false } : l))
  }, [])

  const flagListing = useCallback((listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, flagged: true } : l))
  }, [])

  const approveListing = useCallback((listingId) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, flagged: false, status: 'active' } : l))
  }, [])

  const resolveDispute = useCallback((disputeId, resolution) => {
    setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: 'resolved', resolution } : d))
    if (resolution === 'refunded') {
      const dispute = disputes.find(d => d.id === disputeId)
      if (dispute) refundOrder(dispute.orderId)
    }
    if (resolution === 'seller_payout') {
      const dispute = disputes.find(d => d.id === disputeId)
      if (dispute) releasePayout(dispute.orderId)
    }
  }, [disputes])
  // ──────────────────────────────────────────────────────────────────

  const getUserById = useCallback((id) => users.find(u => u.id === id), [users])
  const getUserByUsername = useCallback((username) => users.find(u => u.username === username), [users])
  const getListingById = useCallback((id) => listings.find(l => l.id === id), [listings])
  const getUserListings = useCallback((userId) => listings.filter(l => l.sellerId === userId && l.status !== 'deleted'), [listings])
  const getUserOrders = useCallback((userId) => orders.filter(o => o.buyerId === userId), [orders])
  const getUserSales = useCallback((userId) => orders.filter(o => o.sellerId === userId), [orders])
  const getUserConversations = useCallback((userId) => conversations.filter(c => c.participants.includes(userId)), [conversations])
  const getConversationById = useCallback((id) => conversations.find(c => c.id === id), [conversations])
  const getConversation = getConversationById

  const calculateFees = useCallback((price) => {
    const buyerProtectionFee = parseFloat((1.00 + price * 0.05).toFixed(2))
    const deliveryFee = 5.00
    const bundledFee = parseFloat((buyerProtectionFee + deliveryFee).toFixed(2))
    const total = parseFloat((price + bundledFee).toFixed(2))
    return { buyerProtectionFee, deliveryFee, bundledFee, total }
  }, [])

  return (
    <AppContext.Provider value={{
      currentUser, users, listings, orders, conversations, reviews, disputes, likedListings, payoutProfiles, notifications, offers, bundle, bundleOffers, toast,
      PROTECTION_WINDOW_MS,
      login, signup, register, logout, updateProfile,
      createListing, deleteListing, boostListing, unboostListing, flagListing, approveListing, toggleLike,
      placeOrder, getOrCreateConversation, sendMessage, updateOrderStatus,
      confirmDelivery, openDispute,
      addNotification, markNotificationRead, markAllNotificationsRead, getUserNotifications,
      createOffer, acceptOffer, declineOffer, counterOffer, getOfferById, getListingOffers, getUserActiveOfferOnListing,
      addToBundle, removeFromBundle, clearBundle, isInBundle, calculateBundleFees, placeBundleOrder,
      createBundleOffer, acceptBundleOffer, declineBundleOffer, counterBundleOffer, getBundleOfferById, placeBundleOfferOrder,
      suspendUser, banUser, restoreUser, holdPayout, releasePayout, refundOrder, resolveDispute,
      savePayoutProfile, getPayoutProfile,
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
