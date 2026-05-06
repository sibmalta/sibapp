import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  canInsertDisputeEvidence,
  canReadDisputeMessage,
  disputeMessageToRow,
  getDisputeMessagesForDispute,
  getEvidenceSenderRole,
  isActiveDisputeStatus,
  rowToDisputeMessage,
  sortDisputesForAdmin,
} from '../lib/disputes'
import { rowToDispute, disputeToRow } from '../lib/db/orders'

describe('dispute handling helpers', () => {
  it('treats open and review statuses as active payout blockers', () => {
    expect(isActiveDisputeStatus('open')).toBe(true)
    expect(isActiveDisputeStatus('in_review')).toBe(true)
    expect(isActiveDisputeStatus('under_review')).toBe(true)
    expect(isActiveDisputeStatus('resolved_buyer')).toBe(false)
    expect(isActiveDisputeStatus('closed')).toBe(false)
  })

  it('sorts admin disputes with active disputes first and newest first', () => {
    const sorted = sortDisputesForAdmin([
      { id: 'closed-new', status: 'closed', createdAt: '2026-04-28T12:00:00.000Z' },
      { id: 'open-old', status: 'open', createdAt: '2026-04-27T12:00:00.000Z' },
      { id: 'review-new', status: 'in_review', createdAt: '2026-04-28T10:00:00.000Z' },
    ])

    expect(sorted.map(dispute => dispute.id)).toEqual(['review-new', 'open-old', 'closed-new'])
  })

  it('maps dispute listing/details/admin fields to and from Supabase rows', () => {
    const row = disputeToRow({
      orderId: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      listingId: 'listing-1',
      details: 'Item arrived damaged',
      adminNotes: 'Needs photos',
      resolvedAt: null,
    })

    expect(row).toMatchObject({
      order_id: 'order-1',
      listing_id: 'listing-1',
      details: 'Item arrived damaged',
      admin_notes: 'Needs photos',
      resolved_at: null,
    })

    expect(rowToDispute({
      id: 'dispute-1',
      ...row,
      status: 'open',
      created_at: '2026-04-28T12:00:00.000Z',
    })).toMatchObject({
      id: 'dispute-1',
      orderId: 'order-1',
      listingId: 'listing-1',
      details: 'Item arrived damaged',
      adminNotes: 'Needs photos',
    })
  })

  it('maps legacy dispute description to details without writing a description column', () => {
    const row = disputeToRow({
      orderId: 'order-1',
      reason: 'Admin review',
      description: 'Needs admin review',
      adminMessages: [],
    })

    expect(row).toMatchObject({
      order_id: 'order-1',
      reason: 'Admin review',
      details: 'Needs admin review',
      admin_messages: [],
    })
    expect(row).not.toHaveProperty('description')
  })

  it('maps dispute message rows without using disputes.messages arrays', () => {
    const row = disputeMessageToRow({
      disputeId: 'dispute-1',
      orderId: 'order-1',
      senderProfileId: 'buyer-1',
      senderRole: 'buyer',
      message: 'Photo evidence attached',
      attachments: [{ path: 'photo.jpg' }],
    })

    expect(row).toEqual({
      dispute_id: 'dispute-1',
      order_id: 'order-1',
      sender_profile_id: 'buyer-1',
      sender_role: 'buyer',
      message: 'Photo evidence attached',
      attachments: [{ path: 'photo.jpg' }],
    })
    expect(rowToDisputeMessage({ id: 'message-1', ...row, created_at: '2026-05-06T10:00:00.000Z' })).toMatchObject({
      id: 'message-1',
      disputeId: 'dispute-1',
      senderRole: 'buyer',
      message: 'Photo evidence attached',
    })

    expect(disputeMessageToRow({ attachments: { path: 'not-an-array' } })).toEqual({ attachments: [] })
    expect(rowToDisputeMessage({ attachments: { path: 'not-an-array' } }).attachments).toEqual([])
  })

  it('sorts dispute message timeline chronologically', () => {
    const messages = getDisputeMessagesForDispute([
      { id: 'late', disputeId: 'dispute-1', createdAt: '2026-05-06T11:00:00.000Z' },
      { id: 'other', disputeId: 'dispute-2', createdAt: '2026-05-06T09:00:00.000Z' },
      { id: 'early', disputeId: 'dispute-1', createdAt: '2026-05-06T10:00:00.000Z' },
    ], 'dispute-1')

    expect(messages.map(message => message.id)).toEqual(['early', 'late'])
  })

  it('allows only participants or admins to read and submit dispute evidence', () => {
    const dispute = { buyerId: 'buyer-1', sellerId: 'seller-1' }

    expect(canReadDisputeMessage({ dispute, currentUserId: 'buyer-1' })).toBe(true)
    expect(canReadDisputeMessage({ dispute, currentUserId: 'other-user' })).toBe(false)
    expect(canReadDisputeMessage({ dispute, currentUserId: 'admin-1', isAdmin: true })).toBe(true)

    expect(getEvidenceSenderRole({ dispute, currentUserId: 'buyer-1' })).toBe('buyer')
    expect(getEvidenceSenderRole({ dispute, currentUserId: 'seller-1' })).toBe('seller')
    expect(getEvidenceSenderRole({ dispute, currentUserId: 'other-user' })).toBe(null)

    expect(canInsertDisputeEvidence({ dispute, currentUserId: 'buyer-1', senderRole: 'buyer' })).toBe(true)
    expect(canInsertDisputeEvidence({ dispute, currentUserId: 'buyer-1', senderRole: 'seller' })).toBe(false)
    expect(canInsertDisputeEvidence({ dispute, currentUserId: 'other-user', senderRole: 'buyer' })).toBe(false)
  })

  it('defines dispute_messages RLS and central open_dispute_case workflow', () => {
    const root = resolve(__dirname, '..', '..')
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260506190000_dispute_workflow_messages.sql'), 'utf8')
    const appContext = readFileSync(resolve(root, 'src/context/AppContext.jsx'), 'utf8')
    const adminPage = readFileSync(resolve(root, 'src/pages/AdminPage.jsx'), 'utf8')
    const orderDetail = readFileSync(resolve(root, 'src/pages/OrderDetailPage.jsx'), 'utf8')

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.dispute_messages')
    expect(migration).toContain("sender_role TEXT NOT NULL CHECK (sender_role IN ('buyer', 'seller', 'admin', 'system'))")
    expect(migration).toContain('dispute_messages_attachments_array_check')
    expect(migration).toContain("CHECK (jsonb_typeof(attachments) = 'array')")
    expect(migration).toContain('dispute_messages_participant_read')
    expect(migration).toContain('dispute_messages_participant_insert_evidence')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.open_dispute_case')
    expect(migration).toContain("v_source := 'admin'")
    expect(migration).toContain("v_source := 'buyer'")
    expect(migration).toContain("v_source := 'seller'")
    expect(migration).toContain('Dispute opened')
    expect(migration).toContain('Please provide evidence for order')
    expect(migration).toContain("payout_status = 'disputed'")
    expect(migration).not.toContain('admin_messages')

    expect(appContext).toContain('dbCreateDisputeCase')
    expect(appContext).toContain('dbCreateDisputeMessage')
    expect(appContext).not.toContain('disputes.messages')
    expect(adminPage).toContain('Dispute timeline / evidence')
    expect(adminPage).toContain('Add admin message')
    expect(orderDetail).toContain('Dispute under review')
    expect(orderDetail).toContain('Provide Evidence')
    expect(orderDetail).toContain('Submit evidence')
  })
})
