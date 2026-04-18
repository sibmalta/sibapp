/**
 * mockData.js — re-exports canonical data from seedData.js for backward compatibility.
 *
 * NOTE: This file is not actively imported by any component. It exists solely as
 * a safety net for any future code that references the old MOCK_* names.
 * The canonical data lives in seedData.js (33 items across 8 categories).
 */
import { SEED_USERS, SEED_LISTINGS } from './seedData'

export const MOCK_USERS = SEED_USERS

export const MOCK_LISTINGS = SEED_LISTINGS


export const MOCK_ORDERS = [
  {
    id: 'ord1',
    buyerId: 'u4',
    sellerId: 'u3',
    listingId: 'l3',
    deliveryMethod: 'dropoff',
    address: '12 St. Anne St, Msida',
    itemPrice: 65,
    platformFee: 6.50,
    deliveryFee: 4.25,
    totalPrice: 75.75,
    trackingStatus: 'delivered',
    createdAt: '2024-10-30T14:00:00Z',
  },
]

export const MOCK_CONVERSATIONS = []
