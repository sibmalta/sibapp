import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ShipmentTracker, {
  getCustomerDeliveryStatusLabel,
  getMyConvenienceDeliveryEstimateLabel,
} from '../components/ShipmentTracker'

describe('ShipmentTracker', () => {
  it('renders the MYConvenience courier delivery timeline with customer-friendly states', () => {
    const { container } = render(
      <ShipmentTracker
        shipment={{
          status: 'dropped_off',
          deliveryType: 'locker_collection',
          dropoffConfirmedAt: '2026-05-09T09:30:00Z',
        }}
      />
    )

    expect(screen.getByText('Awaiting drop-off')).toBeInTheDocument()
    expect(screen.getAllByText('Dropped off').length).toBeGreaterThan(0)
    expect(screen.getByText('In transit')).toBeInTheDocument()
    expect(screen.getByText('Delivery attempted')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText('Parcel has been dropped off and is awaiting courier pickup.')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('Awaiting collection')
    expect(container).not.toHaveTextContent('Ready for collection')
  })

  it('maps legacy collection statuses away from buyer collection wording', () => {
    expect(getCustomerDeliveryStatusLabel('ready_for_collection')).toBe('In transit')
    expect(getCustomerDeliveryStatusLabel('awaiting_shipment')).toBe('Awaiting drop-off')
    expect(getCustomerDeliveryStatusLabel('awaiting_collection')).toBe('Awaiting drop-off')
  })

  it('renders same-day and next-day MYConvenience estimates from Malta drop-off time', () => {
    expect(getMyConvenienceDeliveryEstimateLabel('2026-05-09T09:30:00+02:00')).toBe('Estimated delivery: same-day delivery attempt')
    expect(getMyConvenienceDeliveryEstimateLabel('2026-05-09T12:30:00+02:00')).toBe('Estimated delivery: next-day delivery attempt')
  })
})
