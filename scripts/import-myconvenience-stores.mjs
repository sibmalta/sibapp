import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_CSV = 'private/myconvenience_stores_import_private.csv'

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

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const csvPath = path.resolve(process.cwd(), process.argv[2] || DEFAULT_CSV)
const supabaseUrl = requiredEnv('SUPABASE_URL')
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const csv = await fs.readFile(csvPath, 'utf8')
const rows = parseCsv(csv)
const storeCodes = new Set(rows.map(row => row.store_code))
const activePins = rows.filter(row => row.active !== 'false').map(row => row.store_pin)

if (storeCodes.size !== rows.length) {
  throw new Error('Duplicate store_code found in import CSV')
}
if (new Set(activePins).size !== activePins.length) {
  throw new Error('Duplicate active store PIN found in import CSV')
}

for (const row of rows) {
  const { error } = await supabase.rpc('upsert_myconvenience_store', {
    p_store_code: row.store_code,
    p_name: row.name,
    p_address: row.address,
    p_locality: row.locality,
    p_pickup_zone: row.pickup_zone || null,
    p_active: row.active !== 'false',
    p_phone: row.phone || null,
    p_opening_hours: row.opening_hours || null,
    p_notes: row.notes || null,
    p_store_pin: row.store_pin,
  })

  if (error) {
    throw new Error(`Failed to import ${row.store_code}: ${error.message}`)
  }
}

console.log(`Imported ${rows.length} MYConvenience stores from ${csvPath}`)
