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

    expect(screen.getAllByText('MYConvenience drop-off').length).toBeGreaterThan(0)
    expect(screen.getAllByText('The seller will drop off your parcel at a MYConvenience location for courier collection.').length).toBeGreaterThan(0)
    expect(screen.getByText('Estimated delivery: same day if the seller drops off before 12pm, or next day if dropped off after 12pm.')).toBeInTheDocument()
    expect(screen.getByText("You'll receive updates once the seller drops off the parcel and courier collection begins.")).toBeInTheDocument()
    expect(container).not.toHaveTextContent('Choose a MYConvenience location')
    expect(container).not.toHaveTextContent('Select MYConvenience location')
  })
})
