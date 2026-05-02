import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListingDeliveryCard, ListingSellerBadges } from '../pages/ListingPage'

describe('ListingDeliveryCard', () => {
  it('shows locker price for locker eligible listings', () => {
    render(<ListingDeliveryCard listing={{ lockerEligible: true }} />)

    expect(screen.getByText('Locker €3.25')).toBeInTheDocument()
    expect(screen.getByText('Home delivery is currently unavailable for new orders.')).toBeInTheDocument()
  })

  it('hides locker price for non-locker eligible listings', () => {
    render(<ListingDeliveryCard listing={{ category: 'sports', subcategory: 'cycling', lockerEligible: false }} />)

    expect(screen.getByText('Locker not available for this item')).toBeInTheDocument()
    expect(screen.queryByText('Locker €3.25')).not.toBeInTheDocument()
  })

  it('shows locker price for legacy fashion listings with unknown locker eligibility', () => {
    render(<ListingDeliveryCard listing={{ category: 'fashion', subcategory: 'tops', lockerEligible: null }} />)

    expect(screen.getByText(/Locker .*3\.25/)).toBeInTheDocument()
    expect(screen.queryByText('Locker not available for this item')).not.toBeInTheDocument()
  })

  it('shows locker price for pre-fix default false Fashion > Coats & Jackets listings', () => {
    render(
      <ListingDeliveryCard
        listing={{
          category: 'fashion',
          subcategory: 'coats',
          lockerEligible: false,
          createdAt: '2026-04-26T12:00:00.000Z',
        }}
      />
    )

    expect(screen.getByText(/Locker .*3\.25/)).toBeInTheDocument()
    expect(screen.queryByText('Locker not available for this item')).not.toBeInTheDocument()
  })

  it('respects explicit false even for normally locker-fit fashion listings', () => {
    render(<ListingDeliveryCard listing={{ category: 'fashion', subcategory: 'tops', lockerEligible: false }} />)

    expect(screen.getByText('Locker not available for this item')).toBeInTheDocument()
    expect(screen.queryByText(/Locker .*3\.25/)).not.toBeInTheDocument()
  })

  it('does not render stale MaltaPost API integration copy', () => {
    const { container } = render(<ListingDeliveryCard listing={{ lockerEligible: true }} />)

    expect(container).not.toHaveTextContent('API integration will be added later')
    expect(container).not.toHaveTextContent('MaltaPost fulfilment')
    expect(container).not.toHaveTextContent('Tracked delivery handled via MaltaPost')
  })
})

describe('ListingSellerBadges', () => {
  it('shows New seller when the seller has no reviews', () => {
    render(
      <ListingSellerBadges
        seller={{ reviewCount: 0, createdAt: '2024-01-01T00:00:00.000Z' }}
        listing={{ category: 'fashion' }}
        now={new Date('2026-04-27T00:00:00.000Z')}
      />
    )

    expect(screen.getByText('New seller')).toBeInTheDocument()
  })

  it('shows Verified when the seller profile is verified', () => {
    render(
      <ListingSellerBadges
        seller={{ reviewCount: 5, verified: true, createdAt: '2024-01-01T00:00:00.000Z' }}
        listing={{ category: 'fashion' }}
        now={new Date('2026-04-27T00:00:00.000Z')}
      />
    )

    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('does not promote MaltaPost as an active seller badge', () => {
    render(
      <ListingSellerBadges
        seller={{ reviewCount: 5, createdAt: '2024-01-01T00:00:00.000Z' }}
        listing={{ category: 'fashion' }}
        now={new Date('2026-04-27T00:00:00.000Z')}
      />
    )

    expect(screen.queryByText('Ships with MaltaPost')).not.toBeInTheDocument()
  })
})
