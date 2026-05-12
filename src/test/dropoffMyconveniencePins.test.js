import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const root = resolve(__dirname, '..', '..')
const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}))

function parseCsv(text) {
  const rows = []
  let cell = ''
  let row = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted && char === '"' && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (!quoted && char === ',') {
      row.push(cell)
      cell = ''
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      if (row.some(value => value !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }

  const [headers, ...records] = rows
  return records.map(record => Object.fromEntries(headers.map((header, index) => [header, record[index] || ''])))
}

describe('MYConvenience store PIN verification', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it('uses the private CSV store_pin column as a trimmed string PIN', async () => {
    const { identifyPublicDropoffStoreByPin } = await import('../lib/publicDropoffScan')
    const privateCsv = readFileSync(resolve(root, 'private/myconvenience_stores_import_private.csv'), 'utf8')
    const [row] = parseCsv(privateCsv)
    const validPin = row.store_pin

    mockRpc.mockImplementation(async (fn, payload) => {
      if (fn !== 'identify_public_dropoff_store_by_pin') return { data: null, error: new Error('Unexpected RPC') }
      return payload.p_store_pin === validPin
        ? {
            data: {
              valid: true,
              store: {
                id: 'store-1',
                name: row.name,
                address: row.address,
                locality: row.locality,
                pickup_zone: row.pickup_zone,
                store_pin_hash: 'never-expose-this',
              },
            },
            error: null,
          }
        : { data: { valid: false, message: 'Invalid store PIN' }, error: null }
    })

    const { data, error } = await identifyPublicDropoffStoreByPin({ storePin: ` \t${validPin}\n` })

    expect(error).toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('identify_public_dropoff_store_by_pin', { p_store_pin: validPin })
    expect(data).toMatchObject({ name: row.name, locality: row.locality })
    expect(JSON.stringify(data)).not.toContain('store_pin_hash')
    expect(JSON.stringify(data)).not.toContain('never-expose-this')
  })

  it('rejects wrong PINs without querying stores client-side', async () => {
    const { identifyPublicDropoffStoreByPin } = await import('../lib/publicDropoffScan')
    mockRpc.mockResolvedValue({ data: { valid: false, message: 'Invalid store PIN' }, error: null })

    const { data, error } = await identifyPublicDropoffStoreByPin({ storePin: '000000' })

    expect(data).toBeNull()
    expect(error).toMatchObject({ message: 'Invalid store PIN' })
    expect(mockRpc).toHaveBeenCalledWith('identify_public_dropoff_store_by_pin', { p_store_pin: '000000' })
  })

  it('keeps inactive stores blocked and exposes only diagnostic status, not hashes', async () => {
    const { listMyConvenienceStoreDiagnostics } = await import('../lib/publicDropoffScan')
    const migration = readFileSync(resolve(root, 'supabase/migrations/20260512103000_myconvenience_store_diagnostics.sql'), 'utf8')

    mockRpc.mockResolvedValue({
      data: [{
        store_code: 'MYC-TEST-01',
        name: 'MYConvenience Test',
        locality: 'Sliema',
        active: false,
        has_pin_hash: true,
        store_pin_hash: 'secret-hash',
      }],
      error: null,
    })

    const { data, error } = await listMyConvenienceStoreDiagnostics()

    expect(error).toBeNull()
    expect(migration).toContain('WHERE active = true')
    expect(data).toEqual([expect.objectContaining({
      storeCode: 'MYC-TEST-01',
      active: false,
      hasPinHash: true,
    })])
    expect(JSON.stringify(data)).not.toContain('store_pin_hash')
    expect(JSON.stringify(data)).not.toContain('secret-hash')
  })
})
