import { describe, expect, it } from 'vitest'
import {
  isMaintenanceAllowedPath,
  isMaintenanceBypassUser,
  isMaintenanceModeEnabled,
  parseMaintenanceEmails,
} from '../components/MaintenanceGate'

describe('MaintenanceGate helpers', () => {
  it('blocks public users when maintenance mode is enabled', () => {
    expect(isMaintenanceModeEnabled('true')).toBe(true)
    expect(isMaintenanceBypassUser(null, [])).toBe(false)
    expect(isMaintenanceAllowedPath('/browse')).toBe(false)
    expect(isMaintenanceAllowedPath('/')).toBe(false)
  })

  it('allows admin bypass access', () => {
    expect(isMaintenanceBypassUser({ email: 'admin@sibmalta.com', role: 'admin' }, [])).toBe(true)
    expect(isMaintenanceBypassUser({ email: 'ops@sibmalta.com', isAdmin: true }, [])).toBe(true)
    expect(isMaintenanceBypassUser({ email: 'support@sibmalta.com', adminRole: 'super_admin' }, [])).toBe(true)
  })

  it('allows whitelisted tester emails', () => {
    const whitelist = parseMaintenanceEmails('tester@sibmalta.com, qa@sibmalta.com')

    expect(isMaintenanceBypassUser({ email: 'Tester@SibMalta.com' }, whitelist)).toBe(true)
    expect(isMaintenanceBypassUser({ email: 'public@sibmalta.com' }, whitelist)).toBe(false)
  })

  it('blocks standard signed-in users after login', () => {
    const whitelist = parseMaintenanceEmails('tester@sibmalta.com')

    expect(isMaintenanceBypassUser({ email: 'buyer@sibmalta.com', role: 'user' }, whitelist)).toBe(false)
  })

  it('restores normal app access when maintenance mode is disabled', () => {
    expect(isMaintenanceModeEnabled('false')).toBe(false)
    expect(isMaintenanceModeEnabled('')).toBe(false)
    expect(isMaintenanceModeEnabled(undefined)).toBe(false)
  })

  it('preserves auth, callback, scan, and dispute deep-link routes', () => {
    expect(isMaintenanceAllowedPath('/login')).toBe(true)
    expect(isMaintenanceAllowedPath('/signin')).toBe(true)
    expect(isMaintenanceAllowedPath('/signup')).toBe(true)
    expect(isMaintenanceAllowedPath('/auth')).toBe(true)
    expect(isMaintenanceAllowedPath('/auth/callback')).toBe(true)
    expect(isMaintenanceAllowedPath('/forgot-password')).toBe(true)
    expect(isMaintenanceAllowedPath('/reset-password')).toBe(true)
    expect(isMaintenanceAllowedPath('/scan-dropoff')).toBe(true)
    expect(isMaintenanceAllowedPath('/messages/dispute/fa230f1b-1eae-4311-b25d-fb93435a6602')).toBe(true)
  })
})
