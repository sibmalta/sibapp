import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkUsernameAvailability } from '../lib/db/profiles'
import { normalizeUsernameInput, validateUsername } from '../lib/username'

function makeSupabaseMock({ rpcData, rpcError = null, lookupRows = [], lookupError = null } = {}) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: lookupRows, error: lookupError })),
  }

  return {
    rpc: vi.fn(async () => ({ data: rpcData, error: rpcError })),
    from: vi.fn(() => chain),
    chain,
  }
}

describe('signup username handling', () => {
  it('preserves an available entered username after predictable normalization', async () => {
    const supabase = makeSupabaseMock({ rpcData: true })

    expect(normalizeUsernameInput(' @Vic.Statz ')).toBe('vic.statz')
    expect(validateUsername('vic.statz')).toMatchObject({ valid: true, username: 'vic.statz' })

    const result = await checkUsernameAvailability(supabase, ' @Vic.Statz ')

    expect(result).toMatchObject({ available: true, username: 'vic.statz' })
    expect(supabase.rpc).toHaveBeenCalledWith('is_username_available', { p_username: 'vic.statz' })
  })

  it('reports duplicate usernames before signup instead of appending a suffix', async () => {
    const supabase = makeSupabaseMock({ rpcData: false })

    const result = await checkUsernameAvailability(supabase, 'vicstatz')

    expect(result).toMatchObject({ available: false, username: 'vicstatz' })
  })

  it('falls back to direct profile lookup if the availability RPC is not deployed yet', async () => {
    const supabase = makeSupabaseMock({
      rpcData: null,
      rpcError: { message: 'function public.is_username_available does not exist' },
      lookupRows: [{ id: 'profile-1', username: 'vicstatz' }],
    })

    const result = await checkUsernameAvailability(supabase, 'vicstatz')

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(supabase.chain.eq).toHaveBeenCalledWith('username', 'vicstatz')
    expect(result).toMatchObject({ available: false, username: 'vicstatz' })
  })

  it('rejects invalid usernames without querying Supabase', async () => {
    const supabase = makeSupabaseMock({ rpcData: true })

    const result = await checkUsernameAvailability(supabase, 'bad-name!')

    expect(result).toMatchObject({
      available: false,
      username: 'bad-name!',
      reason: 'Only lowercase letters, numbers, . and _',
    })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('uses a strict database trigger for concurrent duplicate signups and profile retries', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/supabasemigrations20260512104500_strict_signup_usernames.sql'),
      'utf8'
    )

    expect(migration).toContain('profiles_username_lower_unique')
    expect(migration).toContain("RAISE EXCEPTION 'username_already_taken'")
    expect(migration).toContain('ON CONFLICT (id) DO NOTHING')
    expect(migration).not.toContain('MD5(NEW.id')
    expect(migration).not.toContain("_attempt := _base || '_'")
  })
})
