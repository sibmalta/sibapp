import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  isMaintenanceAllowedPath,
  isMaintenanceAuthBypass,
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

  it('supports emergency auth-page-only bypass query', () => {
    expect(isMaintenanceAuthBypass('/login', '?maintenanceBypass=1')).toBe(true)
    expect(isMaintenanceAuthBypass('/signin', '?maintenanceBypass=1')).toBe(true)
    expect(isMaintenanceAuthBypass('/signup', '?maintenanceBypass=1')).toBe(true)
    expect(isMaintenanceAuthBypass('/auth', '?maintenanceBypass=1')).toBe(true)
    expect(isMaintenanceAuthBypass('/', '?maintenanceBypass=1')).toBe(false)
    expect(isMaintenanceAuthBypass('/browse', '?maintenanceBypass=1')).toBe(false)
  })

  it('renders login routes outside the maintenance gate', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
    const loginRouteIndex = app.indexOf('<Route path="/login" element={<AuthPage />} />')
    const normalAppRouteIndex = app.indexOf('<Route path="/" element={<Layout />}>')

    expect(loginRouteIndex).toBeGreaterThan(-1)
    expect(normalAppRouteIndex).toBeGreaterThan(-1)
    expect(loginRouteIndex).toBeLessThan(normalAppRouteIndex)
    expect(app).not.toContain('<MaintenanceGate>')
    expect(app).not.toContain('MaintenanceGate><Layout')
  })
})
