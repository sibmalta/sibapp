import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MakeOfferModal from '../components/MakeOfferModal'

const listing = {
  id: 'listing-1',
  title: 'Leather boots',
  price: 50,
  brand: 'Sib',
  size: '40.5',
  images: ['https://example.com/boots.jpg'],
}

describe('MakeOfferModal', () => {
  it('clears stale duplicate errors before a successful new offer submission', async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValueOnce({ error: 'You already have an active offer on this item.' })
      .mockResolvedValueOnce({ offer: { id: 'offer-2' } })

    render(<MakeOfferModal listing={listing} onSubmit={onSubmit} onClose={vi.fn()} />)

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: /send offer/i }))

    expect(await screen.findByText('You already have an active offer on this item.')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '31' } })
    fireEvent.click(screen.getByRole('button', { name: /send offer/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      expect(screen.queryByText('You already have an active offer on this item.')).not.toBeInTheDocument()
    })
  })
})
