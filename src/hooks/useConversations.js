import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '../lib/useSupabase'
import {
  fetchUserConversations,
  insertMessage,
  markConversationRead as dbMarkConversationRead,
  upsertConversation,
} from '../lib/db/conversations'

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

function sortConversations(items) {
  return [...items].sort((a, b) => {
    const aLast = a.messages?.[a.messages.length - 1]
    const bLast = b.messages?.[b.messages.length - 1]
    const aTime = new Date(aLast?.timestamp || a.updatedAt || a.createdAt || 0).getTime()
    const bTime = new Date(bLast?.timestamp || b.updatedAt || b.createdAt || 0).getTime()
    return bTime - aTime
  })
}

export function useConversations(currentUser, seedConversations = []) {
  const { supabase, isAuthenticated } = useSupabase()
  const [conversations, setConversations] = useState(() => loadFromStorage('sib_conversations', seedConversations))
  const [dbAvailable, setDbAvailable] = useState(null)

  const mergeConversation = useCallback((conversation) => {
    if (!conversation?.id) return
    setConversations(prev => {
      const existing = prev.find(c => c.id === conversation.id)
      if (!existing) return sortConversations([...prev, conversation])
      return sortConversations(prev.map(c => c.id === conversation.id ? { ...c, ...conversation } : c))
    })
  }, [])

  const refreshConversations = useCallback(async () => {
    if (!currentUser?.id || !isAuthenticated) return []

    const { data, error } = await fetchUserConversations(supabase, currentUser.id)
    if (error) {
      console.error('[useConversations] fetchUserConversations failed:', error.message)
      setDbAvailable(false)
      return []
    }

    setDbAvailable(true)
    setConversations(sortConversations(data || []))
    return data || []
  }, [currentUser?.id, isAuthenticated, supabase])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  useEffect(() => {
    if (!dbAvailable) saveToStorage('sib_conversations', conversations)
  }, [conversations, dbAvailable])

  useEffect(() => {
    if (!currentUser?.id || !isAuthenticated) return undefined

    const channel = supabase
      .channel(`messages:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const row = payload.new
          if (row.sender_id !== currentUser.id && row.recipient_id !== currentUser.id) return
          await refreshConversations()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        async (payload) => {
          const row = payload.new
          if (row.sender_id !== currentUser.id && row.recipient_id !== currentUser.id) return
          await refreshConversations()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id, isAuthenticated, refreshConversations, supabase])

  const createConversation = useCallback((otherUserId, listingId = null, explicitId = null) => {
    if (!currentUser?.id || !otherUserId) return null

    const existing = conversations.find(c =>
      c.participants.includes(currentUser.id) &&
      c.participants.includes(otherUserId) &&
      (listingId ? c.listingId === listingId : true)
    )
    if (existing) return existing

    const newConversation = {
      id: explicitId || `c${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      participants: [currentUser.id, otherUserId],
      listingId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mergeConversation(newConversation)

    if (isAuthenticated) {
      upsertConversation(supabase, newConversation).then(({ error }) => {
        if (error) console.error('[useConversations] upsertConversation failed:', error.message)
      })
    }

    return newConversation
  }, [currentUser?.id, conversations, isAuthenticated, mergeConversation, supabase])

  const createConversationForUsers = useCallback((userAId, userBId, listingId = null, explicitId = null) => {
    if (!userAId || !userBId) return null

    const existing = conversations.find(c =>
      c.participants.includes(userAId) &&
      c.participants.includes(userBId) &&
      (listingId ? c.listingId === listingId : true)
    )
    if (existing) return existing

    const newConversation = {
      id: explicitId || `c${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      participants: [userAId, userBId],
      listingId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mergeConversation(newConversation)

    if (isAuthenticated && newConversation.participants.includes(currentUser?.id)) {
      upsertConversation(supabase, newConversation).then(({ error }) => {
        if (error) console.error('[useConversations] upsertConversationForUsers failed:', error.message)
      })
    }

    return newConversation
  }, [currentUser?.id, conversations, isAuthenticated, mergeConversation, supabase])

  const addLocalMessage = useCallback((conversationId, message) => {
    setConversations(prev => sortConversations(prev.map(c => (
      c.id === conversationId
        ? { ...c, messages: [...(c.messages || []), message], updatedAt: message.timestamp || new Date().toISOString() }
        : c
    ))))
  }, [])

  const addMessage = useCallback(async (conversationId, message) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation) return { data: null, error: { message: 'Conversation not found' } }

    const recipientId = message.recipientId || conversation.participants.find(id => id !== message.senderId) || null
    const optimisticMessage = {
      id: message.id || `m${Date.now()}`,
      senderId: message.senderId,
      recipientId,
      text: message.text || '',
      timestamp: message.timestamp || new Date().toISOString(),
      type: message.type || undefined,
      eventType: message.eventType || undefined,
      flagged: !!message.flagged,
      read: message.senderId === currentUser?.id,
      ...(message.metadata || {}),
    }

    addLocalMessage(conversationId, optimisticMessage)

    if (!isAuthenticated) return { data: optimisticMessage, error: null }

    const { data, error } = await insertMessage(supabase, {
      conversationId,
      senderId: message.senderId,
      recipientId,
      text: message.text,
      type: message.type || 'message',
      eventType: message.eventType || null,
      flagged: !!message.flagged,
      metadata: message.metadata || {},
    })

    if (error) {
      console.error('[useConversations] insertMessage failed:', error.message)
      return { data: optimisticMessage, error }
    }

    setConversations(prev => sortConversations(prev.map(c => {
      if (c.id !== conversationId) return c
      const messages = (c.messages || []).map(m => m.id === optimisticMessage.id ? data : m)
      return { ...c, messages, updatedAt: data.timestamp }
    })))

    return { data, error: null }
  }, [addLocalMessage, conversations, currentUser?.id, isAuthenticated, supabase])

  const markConversationRead = useCallback(async (conversationId) => {
    if (!currentUser?.id) return

    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c
      const messages = (c.messages || []).map(m => (
        m.senderId !== currentUser.id && !m.read ? { ...m, read: true, readAt: new Date().toISOString() } : m
      ))
      return { ...c, messages }
    }))

    if (!isAuthenticated) return
    const { error } = await dbMarkConversationRead(supabase, conversationId, currentUser.id)
    if (error) {
      console.error('[useConversations] markConversationRead failed:', error.message)
      refreshConversations()
    }
  }, [currentUser?.id, isAuthenticated, refreshConversations, supabase])

  return {
    conversations,
    setConversations,
    dbAvailable,
    refreshConversations,
    createConversation,
    createConversationForUsers,
    addMessage,
    markConversationRead,
  }
}
