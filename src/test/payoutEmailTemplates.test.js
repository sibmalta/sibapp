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

    expect(buyerProtection).toContain('sendTransactionalEmailOnce')
    expect(buyerProtection).toContain("'payout_setup_required'")
    expect(buyerProtection).toContain("'payout_released'")
    expect(buyerProtection).toContain(".eq('email_type', type)")
    expect(buyerProtection).toContain(".eq('related_entity_id', relatedEntityId)")
  })
})
