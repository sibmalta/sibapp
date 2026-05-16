import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function file(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

function rowColumns(source) {
  return [...source.matchAll(/\brow\.([a-z0-9_]+)\b/g)]
    .map(match => match[1])
    .filter(column => !['listing', 'listings'].includes(column))
}

function migrationsSql() {
  return readdirSync(resolve(root, 'supabase/migrations'))
    .filter(name => name.endsWith('.sql'))
    .sort()
    .map(name => file(`supabase/migrations/${name}`))
    .join('\n')
    .toLowerCase()
}

describe('orders schema contract', () => {
  it('has migrations for every orders column read or written by the frontend mapper', () => {
    const source = file('src/lib/db/orders.js')
    const orderReadColumns = rowColumns(extractBetween(source, 'export function rowToOrder', 'export function orderToRow'))
    const orderWriteColumns = rowColumns(extractBetween(source, 'export function orderToRow', '// Order CRUD'))
    const columns = [...new Set([...orderReadColumns, ...orderWriteColumns, 'updated_at'])]
    const sql = migrationsSql()

    const missing = columns.filter(column => !sql.includes(column.toLowerCase()))

    expect(missing).toEqual([])
  })

  it('has migrations for every shipments column read or written by shipment enrichment', () => {
    const source = file('src/lib/db/orders.js')
    const shipmentReadColumns = rowColumns(extractBetween(source, 'export function rowToShipment', 'export function shipmentToRow'))
    const shipmentWriteColumns = rowColumns(extractBetween(source, 'export function shipmentToRow', '// Shipment CRUD'))
    const columns = [...new Set([...shipmentReadColumns, ...shipmentWriteColumns, 'updated_at'])]
    const sql = migrationsSql()

    const missing = columns.filter(column => !sql.includes(column.toLowerCase()))

    expect(missing).toEqual([])
  })

  it('keeps a single current repair migration for recurring live orders schema drift', () => {
    const repair = file('supabase/migrations/20260516120000_orders_schema_contract_repair.sql')

    expect(repair).toContain('ADD COLUMN IF NOT EXISTS address JSONB')
    expect(repair).toContain('ADD COLUMN IF NOT EXISTS buyer_full_name TEXT')
    expect(repair).toContain('ADD COLUMN IF NOT EXISTS payment_flow_type TEXT')
    expect(repair).toContain('ADD COLUMN IF NOT EXISTS seller_stripe_account_id TEXT')
    expect(repair).toContain('ADD COLUMN IF NOT EXISTS dropoff_store_name TEXT')
    expect(repair).toContain('ADD COLUMN IF NOT EXISTS delivery_timing TEXT')
    expect(repair).toContain('separate_charge_then_transfer')
    expect(repair).toContain("pg_get_constraintdef(oid) ILIKE '%payment_flow_type%'")
    expect(repair).toContain('NOT VALID')
  })

  it('allows every payment_flow_type value currently written by the app', () => {
    const repair = file('supabase/migrations/20260516120000_orders_schema_contract_repair.sql')
    const sources = [
      file('src/context/AppContext.jsx'),
      file('src/lib/db/orders.js'),
      file('supabase/functions/create-payment-intent/index.ts'),
      file('supabase/functions/stripe-webhook/index.ts'),
    ].join('\n')

    const writtenValues = [...sources.matchAll(/payment[_Ff]low[Tt]ype['"]?\s*:\s*['"]([^'"]+)['"]/g)]
      .map(match => match[1])
      .filter(value => !value.includes('{'))
    const metadataDefaults = [...sources.matchAll(/payment_flow_type\s*\|\|\s*['"]([^'"]+)['"]/g)]
      .map(match => match[1])

    const values = [...new Set([...writtenValues, ...metadataDefaults])]
    expect(values).toEqual(expect.arrayContaining(['separate_charge', 'separate_charge_then_transfer']))
    for (const value of values) {
      expect(repair).toContain(`'${value}'`)
    }
  })

  it('documents the production migration ordering requirement', () => {
    const notes = file('DEPLOYMENT_NOTES.md')

    expect(notes).toContain('Production must run migration `20260516120000_orders_schema_contract_repair.sql` before/with app deploy.')
  })
})
