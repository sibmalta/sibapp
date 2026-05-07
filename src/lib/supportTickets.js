import { ensureFreshSupabaseSession, supabase } from './supabase'

const SUPPORT_ATTACHMENT_BUCKET = 'support-ticket-attachments'

function safeFileName(name) {
  return String(name || 'attachment')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 120)
}

export async function uploadSupportAttachments(files = [], userId) {
  const list = Array.from(files || []).slice(0, 5)
  if (!list.length) return []
  const uploaded = []

  for (const file of list) {
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file.name)}`
    const { data, error } = await supabase.storage
      .from(SUPPORT_ATTACHMENT_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
    if (error) throw error
    uploaded.push({
      name: file.name,
      size: file.size,
      type: file.type,
      path: data?.path || path,
    })
  }

  return uploaded
}

export async function createSupportTicket(payload = {}) {
  const session = await ensureFreshSupabaseSession()
  if (!session?.access_token) {
    throw new Error('Please log in to contact Sib support.')
  }

  const response = await fetch('/api/support/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Could not send your support request.')
  }

  return data
}
