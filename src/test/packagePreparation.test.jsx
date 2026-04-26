import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PackagePreparationModal from '../components/PackagePreparationModal'

let mockApp

vi.mock('../context/AppContext', () => ({
  useApp: () => mockApp,
}))

describe('PackagePreparationModal', () => {
  beforeEach(() => {
    mockApp = {
      pendingPackagePreparationOffer: {
        id: 'offer-1',
        listingId: 'listing-1',
      },
      dismissPackagePreparationPrompt: vi.fn(),
      markOfferPackagePrepared: vi.fn().mockResolvedValue({ ok: true }),
      getListingById: vi.fn(() => ({ id: 'listing-1', title: 'Vintage jacket' })),
      showToast: vi.fn(),
    }
  })

  it('shows the MaltaPost package preparation checklist', () => {
    render(<PackagePreparationModal />)

    expect(screen.getByText('Prepare your package for MaltaPost pickup')).toBeInTheDocument()
    expect(screen.getByText('Package the item securely')).toBeInTheDocument()
    expect(screen.getByText('Remove old shipping labels/barcodes')).toBeInTheDocument()
    expect(screen.getByText('Attach the Sib/MaltaPost label when provided')).toBeInTheDocument()
    expect(screen.getByText('Keep the package ready at the pickup address')).toBeInTheDocument()
    expect(screen.getByText('Hand it only to MaltaPost or an approved courier')).toBeInTheDocument()
  })

  it('marks the offer package as prepared from the CTA', async () => {
    render(<PackagePreparationModal />)

    fireEvent.click(screen.getByRole('button', { name: "I’ve prepared the package" }))

    await waitFor(() => {
      expect(mockApp.markOfferPackagePrepared).toHaveBeenCalledWith('offer-1')
    })
    expect(mockApp.showToast).toHaveBeenCalledWith('Package marked ready for MaltaPost pickup.')
  })
})
