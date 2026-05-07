import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupportTicket } from '../../api/support/tickets.js'

const root = resolve(__dirname, '..', '..')
const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://supabase.test')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('support ticket workflow', () => {
  it('migration creates support_tickets with RLS and attachment bucket', () => {
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260507130000_support_tickets.sql'), 'utf8')

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.support_tickets')
    expect(migration).toContain('ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('auth.uid() = user_id')
    expect(migration).toContain('public.is_admin()')
    expect(migration).toContain('support-ticket-attachments')
    expect(migration).toContain('jsonb_typeof(attachment_urls) = ')
  })

  it('creates a ticket for the authenticated user and triggers support email', async () => {
    const calls = []
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
      const href = String(url)
      calls.push({ url: href, init })

      if (href.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: USER_ID, email: 'buyer@example.com', user_metadata: { name: 'Buyer Test' } })
      }
      if (href.includes('/rest/v1/orders')) {
        return jsonResponse([{
          id: ORDER_ID,
          order_ref: 'SIB-12345',
          buyer_id: USER_ID,
          seller_id: 'seller-1',
          listing_title: 'Dress',
          status: 'paid',
        }])
      }
      if (href.includes('/rest/v1/support_tickets')) {
        return jsonResponse([{
          id: 'ticket-1',
          user_id: USER_ID,
          name: 'Buyer Test',
          email: 'buyer@example.com',
          category: 'Refund request',
          subject: 'Refund help',
          message: 'Please help',
          order_id: ORDER_ID,
          attachment_urls: [],
          ai_conversation: [],
          status: 'open',
          created_at: '2026-05-07T10:00:00.000Z',
        }])
      }
      if (href.includes('/functions/v1/send-email')) {
        return jsonResponse({ success: true, emailSent: true, subject: '[Sib Support] Refund request - Order SIB-12345' })
      }
      throw new Error(`Unexpected fetch: ${href}`)
    }))

    const result = await createSupportTicket({
      accessToken: 'user-token',
      body: {
        name: 'Buyer Test',
        email: 'buyer@example.com',
        category: 'Refund request',
        subject: 'Refund help',
        message: 'Please help',
        orderId: ORDER_ID,
        aiConversation: [{ role: 'user', text: 'I want a refund' }],
      },
    })

    expect(result.ticket.id).toBe('ticket-1')
    expect(calls.some(call => call.url.includes('/rest/v1/support_tickets') && call.init.method === 'POST')).toBe(true)
    expect(calls.some(call => call.url.includes('/functions/v1/send-email'))).toBe(true)
    const emailCall = calls.find(call => call.url.includes('/functions/v1/send-email'))
    expect(JSON.parse(emailCall.init.body)).toMatchObject({
      type: 'support_ticket',
      to: 'info@sibmalta.com',
    })
  })

  it('rejects unrelated order ids for ticket creation', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
      const href = String(url)
      if (href.endsWith('/auth/v1/user')) return jsonResponse({ id: USER_ID, email: 'buyer@example.com' })
      if (href.includes('/rest/v1/orders')) {
        return jsonResponse([{ id: ORDER_ID, buyer_id: 'other-user', seller_id: 'seller-1' }])
      }
      if (href.includes('/rest/v1/support_tickets')) {
        const inserted = JSON.parse(init.body || '[{}]')?.[0] || {}
        return jsonResponse([{ id: 'ticket-unauthorized-order', ...inserted }])
      }
      if (href.includes('/functions/v1/send-email')) return jsonResponse({ success: true, emailSent: true })
      return jsonResponse({})
    }))

    const result = await createSupportTicket({
      accessToken: 'user-token',
      body: {
        name: 'Buyer Test',
        email: 'buyer@example.com',
        category: 'Order issue',
        subject: 'Help',
        message: 'Please help',
        orderId: ORDER_ID,
      },
    })

    expect(result.ticket.order_id).toBeNull()
  })
})
