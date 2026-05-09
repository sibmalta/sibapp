import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DeliveryMethodSelector from '../components/DeliveryMethodSelector'

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
})
