import { describe, expect, it } from 'vitest'
import { getDeliveryEligibility } from '../lib/deliveryEligibility'

describe('Sib Express delivery eligibility', () => {
  it('allows under-5kg lightweight parcels', () => {
    expect(getDeliveryEligibility({
      category: 'fashion',
      subcategory: 'tops',
      deliverySize: 'small',
      lockerEligible: true,
    })).toMatchObject({ eligible: true, reason: 'eligible' })
  })

  it('blocks over-5kg or bulky parcels with launch copy', () => {
    expect(getDeliveryEligibility({
      category: 'fashion',
      subcategory: 'tops',
      deliverySize: 'bulky',
      lockerEligible: false,
    })).toMatchObject({
      eligible: false,
      reason: 'over_weight_limit',
      buyerMessage: 'Sib delivery for larger items is coming soon.',
    })
  })

  it('blocks Furniture by default', () => {
    expect(getDeliveryEligibility({
      category: 'furniture',
      subcategory: 'tables',
      deliverySize: 'small',
      lockerEligible: true,
    })).toMatchObject({ eligible: false, reason: 'bulky_category' })
  })

  it('allows Kids clothing but blocks Pushchairs & Prams', () => {
    expect(getDeliveryEligibility({
      category: 'kids-baby',
      subcategory: 'kids_clothing',
      deliverySize: 'small',
      lockerEligible: true,
    })).toMatchObject({ eligible: true, reason: 'eligible' })

    expect(getDeliveryEligibility({
      category: 'kids',
      subcategory: 'pushchairs',
      deliverySize: 'small',
      lockerEligible: true,
    })).toMatchObject({ eligible: false, reason: 'bulky_category' })
  })

  it('can require sellers to explicitly choose a parcel size', () => {
    expect(getDeliveryEligibility({
      category: 'sports',
      subcategory: 'football',
      lockerEligible: null,
    }, { requireExplicitParcelSize: true })).toMatchObject({
      eligible: false,
      reason: 'missing_weight',
    })
  })
})
