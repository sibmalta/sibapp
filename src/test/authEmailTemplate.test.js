import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..')

describe('Supabase auth email template', () => {
  it('keeps Confirm signup branding aligned with Sib transactional emails', () => {
    const template = readFileSync(resolve(root, 'supabase/email-templates/confirm-signup.html'), 'utf8')
    const sendEmail = readFileSync(resolve(root, 'supabase/functions/send-email/index.ts'), 'utf8')

    expect(sendEmail).toContain("const LOGO_URL = 'https://sibmalta.com/assets/sib-3.png'")
    expect(template).toContain('https://sibmalta.com/assets/sib-3.png')
    expect(template).toContain('Confirm your Sib account')
    expect(template).toContain('Confirm email')
    expect(template).toContain('{{ .ConfirmationURL }}')
    expect(template).toContain('{{ .SiteURL }}')
    expect(template).not.toContain('Verify Email')
    expect(template).not.toContain('Verify your email')
    expect(template).not.toContain("Malta's Second-Hand Marketplace")
    expect(template).not.toContain('<svg')
  })
})
