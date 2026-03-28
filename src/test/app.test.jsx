import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SEED_LISTINGS, SEED_USERS } from '../data/seed'

describe('Seed data', () => {
  it('has listings', () => {
    expect(SEED_LISTINGS.length).toBeGreaterThan(0)
  })

  it('every listing has required fields', () => {
    SEED_LISTINGS.forEach(listing => {
      expect(listing.id).toBeTruthy()
      expect(listing.title).toBeTruthy()
      expect(typeof listing.price).toBe('number')
      expect(listing.images.length).toBeGreaterThan(0)
      expect(listing.status).toBeTruthy()
    })
  })

  it('has users', () => {
    expect(SEED_USERS.length).toBeGreaterThan(0)
  })

  it('every user has required fields', () => {
    SEED_USERS.forEach(user => {
      expect(user.id).toBeTruthy()
      expect(user.name).toBeTruthy()
      expect(user.email).toBeTruthy()
    })
  })

  it('at least one admin user exists', () => {
    const admin = SEED_USERS.find(u => u.isAdmin)
    expect(admin).toBeTruthy()
  })
})
