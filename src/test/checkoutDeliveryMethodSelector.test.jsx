import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DeliveryMethodSelector from '../components/DeliveryMethodSelector'
import { isLockerEligible } from '../lib/lockerEligibility'

describe('DeliveryMethodSelector', () => {
  it('explains MYConvenience delivery without asking buyers to choose a store', () => {
    const onSelect = vi.fn()

    const { container } = render(
      <DeliveryMethodSelector
        selected="locker_collection"
        onSelect={onSelect}
        lockerEligible
      />
    )

    expect(screen.getAllByText('Delivery to your door').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Seller drops off at MYConvenience\. Sib arranges delivery to your door/).length).toBeGreaterThan(0)
    expect(screen.getByText('Delivery fee €3.50')).toBeInTheDocument()
    expect(screen.getByText('Estimated delivery: same day if the seller drops off before 12pm, or next day if dropped off after 12pm.')).toBeInTheDocument()
    expect(screen.getByText("You'll receive updates as your order moves through delivery.")).toBeInTheDocument()
    expect(container).not.toHaveTextContent('Choose a MYConvenience location')
    expect(container).not.toHaveTextContent('Select MYConvenience location')
    expect(container).not.toHaveTextContent('motorcycle courier')
    expect(container).not.toHaveTextContent('courier collection')
    expect(container).not.toHaveTextContent('Delivered via MYConvenience')
  })

  it('shows Sib delivery for normal Kids & Baby listings', () => {
    const onSelect = vi.fn()
    const lockerEligible = isLockerEligible({
      category: 'kids-baby',
      subcategory: 'baby_clothing',
      lockerEligible: null,
    })

    render(
      <DeliveryMethodSelector
        selected="locker_collection"
        onSelect={onSelect}
        lockerEligible={lockerEligible}
      />
    )

    expect(screen.getAllByText('Delivery to your door').length).toBeGreaterThan(0)
    expect(screen.queryByText('Sib delivery for larger items is coming soon.')).not.toBeInTheDocument()
  })

  it('keeps unsupported categories blocked in checkout delivery selection', () => {
    const onSelect = vi.fn()
    const lockerEligible = isLockerEligible({
      category: 'furniture',
      subcategory: 'tables',
      lockerEligible: null,
    })

    render(
      <DeliveryMethodSelector
        selected="locker_collection"
        onSelect={onSelect}
        lockerEligible={lockerEligible}
      />
    )

    expect(screen.getByText('Sib delivery for larger items is coming soon.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delivery to your door/i })).not.toBeInTheDocument()
  })
})
