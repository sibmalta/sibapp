import { ensureFreshSupabaseSession } from './supabase'

export async function askSibSupport({ message, orderId, context } = {}) {
  const session = await ensureFreshSupabaseSession()
  if (!session?.access_token) {
    throw new Error('Please log in to use Sib Support.')
  }

  const response = await fetch('/api/ai/support', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      message,
      orderId: orderId || null,
      context: context || null,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Sib Support is unavailable right now.')
  }

  return data
}
