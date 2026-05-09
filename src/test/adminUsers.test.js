import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adminUpdateProfile, rowToUser, userToRow } from '../lib/db/profiles'

function createProfileUpdateMock({ responseRow, error = null } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      calls.push(['from', table])
      return {
        update(row) {
          calls.push(['update', row])
          return this
        },
        eq(column, value) {
          calls.push(['eq', column, value])
          return this
        },
        select() {
          calls.push(['select'])
          return this
        },
        single: async () => ({ data: responseRow || null, error }),
      }
    },
  }
}

describe('admin user seller badges', () => {
  it('maps legacy trusted seller and verified vintage values from profile rows', () => {
    const user = rowToUser({
      id: 'seller-1',
      username: 'seller',
      seller_badges: ['verified_vintage', 'unknown_badge'],
      is_trusted_seller: true,
    })

    expect(user.sellerBadges).toEqual(['verified_vintage_seller', 'trusted_seller'])
  })

  it('writes only allowed seller badges to profiles.seller_badges', () => {
    expect(userToRow({
      sellerBadges: ['trusted_seller', 'verified_vintage', 'verified_seller', 'not_allowed'],
    }).seller_badges).toEqual(['trusted_seller', 'verified_vintage_seller', 'verified_seller'])
  })

  it('admin can add trusted seller badge and receives saved profile row', async () => {
    const supabase = createProfileUpdateMock({
      responseRow: {
        id: 'seller-1',
        username: 'seller',
        seller_badges: ['trusted_seller'],
      },
    })

    const { data, error } = await adminUpdateProfile(supabase, 'seller-1', {
      sellerBadges: ['trusted_seller'],
    })

    expect(error).toBeNull()
    expect(data.sellerBadges).toEqual(['trusted_seller'])
    expect(supabase.calls).toContainEqual(['update', expect.objectContaining({
      seller_badges: ['trusted_seller'],
    })])
    expect(supabase.calls).toContainEqual(['eq', 'id', 'seller-1'])
  })

  it('admin can remove trusted seller badge', async () => {
    const supabase = createProfileUpdateMock({
      responseRow: {
        id: 'seller-1',
        username: 'seller',
        seller_badges: [],
      },
    })

    const { data, error } = await adminUpdateProfile(supabase, 'seller-1', {
      sellerBadges: [],
    })

    expect(error).toBeNull()
    expect(data.sellerBadges).toEqual([])
    expect(supabase.calls).toContainEqual(['update', expect.objectContaining({
      seller_badges: [],
    })])
  })

  it('admin can add verified vintage seller badge', async () => {
    const supabase = createProfileUpdateMock({
      responseRow: {
        id: 'seller-1',
        username: 'seller',
        seller_badges: ['verified_vintage_seller'],
      },
    })

    const { data, error } = await adminUpdateProfile(supabase, 'seller-1', {
      sellerBadges: ['verified_vintage_seller'],
    })

    expect(error).toBeNull()
    expect(data.sellerBadges).toEqual(['verified_vintage_seller'])
  })

  it('failed update returns error and no saved profile row', async () => {
    const supabase = createProfileUpdateMock({
      error: { message: 'permission denied' },
    })

    const { data, error } = await adminUpdateProfile(supabase, 'seller-1', {
      sellerBadges: ['trusted_seller'],
    })

    expect(data).toBeNull()
    expect(error.message).toBe('permission denied')
  })

  it('migration adds DB persistence and blocks non-admin self-grants', () => {
    const root = resolve(__dirname, '..', '..')
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260509100000_profile_seller_badges.sql'), 'utf8')

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS seller_badges jsonb')
    expect(migration).toContain("CHECK (public.valid_seller_badges(seller_badges))")
    expect(migration).toContain("CREATE POLICY \"profiles_admin_update\"")
    expect(migration).toContain('prevent_profile_badge_self_grant')
    expect(migration).toContain('Only admins can update seller badges')
  })
})
