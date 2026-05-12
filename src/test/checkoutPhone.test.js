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

    expect(checkout).toContain('getDeliveryPhoneError(phone, phoneCountryCode)')
    expect(checkout).toContain('phoneInputRef.current?.focus()')
    expect(checkout).toContain('buyerPhone: normalizePhoneNumber(phone, phoneCountryCode)')
    expect(bundleCheckout).toContain('getDeliveryPhoneError(phone, phoneCountryCode)')
    expect(bundleCheckout).toContain('phoneInputRef.current?.focus()')
    expect(bundleCheckout).toContain('buyerPhone: normalizePhoneNumber(phone, phoneCountryCode)')
  })

  it('prefills checkout phone from saved address or profile phone', () => {
    const checkout = readFileSync(resolve(root, 'src/pages/CheckoutPage.jsx'), 'utf8')
    const bundleCheckout = readFileSync(resolve(root, 'src/pages/BundleCheckoutPage.jsx'), 'utf8')

    expect(checkout).toContain("splitPhoneNumber(savedAddress.phone || currentUser?.phone || '')")
    expect(checkout).toContain('splitPhoneNumber(currentUser.phone)')
    expect(bundleCheckout).toContain("splitPhoneNumber(savedAddress.phone || currentUser?.phone || '')")
    expect(bundleCheckout).toContain('splitPhoneNumber(currentUser.phone)')
  })

  it('renders country code selectors on single and bundle checkout', () => {
    const checkout = readFileSync(resolve(root, 'src/pages/CheckoutPage.jsx'), 'utf8')
    const bundleCheckout = readFileSync(resolve(root, 'src/pages/BundleCheckoutPage.jsx'), 'utf8')
    const helpers = readFileSync(resolve(root, 'src/lib/checkoutPayment.js'), 'utf8')

    expect(checkout).toContain('COUNTRY_CALLING_CODES.map')
    expect(bundleCheckout).toContain('COUNTRY_CALLING_CODES.map')
    expect(helpers).toContain("{ country: 'Malta', code: '+356' }")
    expect(helpers).toContain("{ country: 'United Kingdom', code: '+44' }")
    expect(helpers).toContain("{ country: 'Italy', code: '+39' }")
  })

  it('does not show old Malta-only phone wording', () => {
    const checkoutHelpers = readFileSync(resolve(root, 'src/lib/checkoutPayment.js'), 'utf8')
    const checkout = readFileSync(resolve(root, 'src/pages/CheckoutPage.jsx'), 'utf8')
    const bundleCheckout = readFileSync(resolve(root, 'src/pages/BundleCheckoutPage.jsx'), 'utf8')

    expect(`${checkoutHelpers}\n${checkout}\n${bundleCheckout}`).not.toContain('Enter a valid Malta phone number')
    expect(checkoutHelpers).toContain('Enter a valid phone number.')
  })
})
