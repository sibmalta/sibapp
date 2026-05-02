import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..')

describe('payout email wiring', () => {
  it('supports the seller payout setup required template', () => {
    const sendEmail = readFileSync(resolve(root, 'supabase/functions/send-email/index.ts'), 'utf8')

    expect(sendEmail).toContain("| 'payout_setup_required'")
    expect(sendEmail).toContain("subject: 'Action needed: receive your Sib payout'")
    expect(sendEmail).toContain("btn('Complete payout setup', buildAppUrl('/seller/payout-settings'))")
  })

  it('sends payout emails from buyer-protection with per-order dedupe', () => {
    const buyerProtection = readFileSync(resolve(root, 'supabase/functions/buyer-protection/index.ts'), 'utf8')
    const sendEmail = readFileSync(resolve(root, 'supabase/functions/send-email/index.ts'), 'utf8')

    expect(buyerProtection).toContain('sendTransactionalEmailOnce')
    expect(buyerProtection).toContain("'payout_setup_required'")
    expect(buyerProtection).toContain("'payout_sent'")
    expect(buyerProtection).toContain(".eq('dedupe_key', dedupeKey)")
    expect(buyerProtection).not.toContain(".eq('related_entity_id', relatedEntityId)")
    expect(sendEmail).toContain('email_type: payload.type')
    expect(sendEmail).toContain('duplicate_dedupe_key')
  })

  it('adds a production-safe email_logs dedupe key migration', () => {
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260502100000_email_logs_dedupe_key.sql'), 'utf8')

    expect(migration).toContain('add column if not exists metadata jsonb')
    expect(migration).toContain('add column if not exists dedupe_key text')
    expect(migration).toContain('email_logs_dedupe_key_unique')
    expect(migration).toContain('where dedupe_key is not null')
  })

  it('uses deterministic per-order payout dedupe keys', () => {
    const buyerProtection = readFileSync(resolve(root, 'supabase/functions/buyer-protection/index.ts'), 'utf8')
    const sendEmail = readFileSync(resolve(root, 'supabase/functions/send-email/index.ts'), 'utf8')

    expect(buyerProtection).toContain("payoutEmailDedupeKey('payout_setup_required', order)")
    expect(buyerProtection).toContain("payoutEmailDedupeKey('payout_sent', order)")
    expect(buyerProtection).toContain('`${type}:${order.id}:${order.seller_id}`')
    expect(sendEmail).toContain("await logEmail(payload, subject, 'sent', resendData.id)")
  })
})
