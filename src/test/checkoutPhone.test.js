import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('checkout delivery phone UX', () => {
  it('shows delivery phone helper copy on single and bundle checkout', () => {
    const checkout = readFileSync(resolve(root, 'src/pages/CheckoutPage.jsx'), 'utf8')
    const bundleCheckout = readFileSync(resolve(root, 'src/pages/BundleCheckoutPage.jsx'), 'utf8')

    expect(checkout).toContain('Delivery driver may contact you about your delivery.')
    expect(checkout).toContain('We only use this for delivery purposes.')
    expect(bundleCheckout).toContain('Delivery driver may contact you about your delivery.')
    expect(bundleCheckout).toContain('We only use this for delivery purposes.')
  })

  it('enforces and normalizes buyer phone before storing delivery snapshots', () => {
    const checkout = readFileSync(resolve(root, 'src/pages/CheckoutPage.jsx'), 'utf8')
    const bundleCheckout = readFileSync(resolve(root, 'src/pages/BundleCheckoutPage.jsx'), 'utf8')

    expect(checkout).toContain('getDeliveryPhoneError(phone)')
    expect(checkout).toContain('phoneInputRef.current?.focus()')
    expect(checkout).toContain('buyerPhone: normalizePhoneNumber(phone)')
    expect(bundleCheckout).toContain('getDeliveryPhoneError(phone)')
    expect(bundleCheckout).toContain('phoneInputRef.current?.focus()')
    expect(bundleCheckout).toContain('buyerPhone: normalizePhoneNumber(phone)')
  })

  it('prefills checkout phone from saved address or profile phone', () => {
    const checkout = readFileSync(resolve(root, 'src/pages/CheckoutPage.jsx'), 'utf8')
    const bundleCheckout = readFileSync(resolve(root, 'src/pages/BundleCheckoutPage.jsx'), 'utf8')

    expect(checkout).toContain("setPhone(savedAddress.phone || currentUser?.phone || '')")
    expect(checkout).toContain('setPhone(currentUser.phone)')
    expect(bundleCheckout).toContain("setPhone(savedAddress.phone || currentUser?.phone || '')")
    expect(bundleCheckout).toContain('setPhone(currentUser.phone)')
  })

  it('does not show old Malta-only phone wording', () => {
    const checkoutHelpers = readFileSync(resolve(root, 'src/lib/checkoutPayment.js'), 'utf8')
    const checkout = readFileSync(resolve(root, 'src/pages/CheckoutPage.jsx'), 'utf8')
    const bundleCheckout = readFileSync(resolve(root, 'src/pages/BundleCheckoutPage.jsx'), 'utf8')

    expect(`${checkoutHelpers}\n${checkout}\n${bundleCheckout}`).not.toContain('Enter a valid Malta phone number')
    expect(checkoutHelpers).toContain('Enter a valid phone number.')
  })
})
