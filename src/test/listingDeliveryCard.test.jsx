import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListingDeliveryCard } from '../pages/ListingPage'

describe('ListingDeliveryCard', () => {
  it('shows locker price for locker eligible listings', () => {
    render(<ListingDeliveryCard listing={{ lockerEligible: true }} />)

    expect(screen.getByText('Delivery €4.50')).toBeInTheDocument()
    expect(screen.getByText('Locker €3.25')).toBeInTheDocument()
    expect(screen.getByText('Tracked delivery handled via MaltaPost.')).toBeInTheDocument()
  })

  it('hides locker price for non-locker eligible listings and keeps delivery visible', () => {
    render(<ListingDeliveryCard listing={{ lockerEligible: false }} />)

    expect(screen.getByText('Delivery €4.50')).toBeInTheDocument()
    expect(screen.getByText('Locker not available for this item')).toBeInTheDocument()
    expect(screen.queryByText('Locker €3.25')).not.toBeInTheDocument()
  })

  it('does not render stale MaltaPost API integration copy', () => {
    const { container } = render(<ListingDeliveryCard listing={{ lockerEligible: true }} />)

    expect(container).not.toHaveTextContent('API integration will be added later')
  })
})
