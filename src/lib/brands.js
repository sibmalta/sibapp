/**
 * Canonical brand dictionary for Sib marketplace.
 *
 * Keys are lowercase brand names; values are the display-canonical form.
 * Used for:
 *  - Autocomplete suggestions on the sell page
 *  - Normalising user input before saving
 *  - Consistent brand filters & recommendation scoring
 */

const CANONICAL_BRANDS = {
  // ── Fast fashion & high street ──────────────────────────────
  'zara':             'Zara',
  'h&m':              'H&M',
  'mango':            'Mango',
  'pull & bear':      'Pull & Bear',
  'pull and bear':    'Pull & Bear',
  'pull&bear':        'Pull & Bear',
  'bershka':          'Bershka',
  'stradivarius':     'Stradivarius',
  'massimo dutti':    'Massimo Dutti',
  'uniqlo':           'Uniqlo',
  'asos':             'ASOS',
  'primark':          'Primark',
  'topshop':          'Topshop',
  'topman':           'Topman',
  'forever 21':       'Forever 21',
  'forever21':        'Forever 21',
  'shein':            'SHEIN',
  'boohoo':           'Boohoo',
  'plt':              'PrettyLittleThing',
  'prettylittlething':'PrettyLittleThing',
  'missguided':       'Missguided',
  'river island':     'River Island',
  'next':             'Next',
  'cos':              'COS',
  'arket':            'ARKET',
  '& other stories':  '& Other Stories',
  'other stories':    '& Other Stories',
  'monki':            'Monki',
  'weekday':          'Weekday',

  // ── Sportswear ─────────────────────────────────────────────
  'nike':             'Nike',
  'adidas':           'Adidas',
  'puma':             'Puma',
  'reebok':           'Reebok',
  'new balance':      'New Balance',
  'under armour':     'Under Armour',
  'asics':            'ASICS',
  'fila':             'FILA',
  'the north face':   'The North Face',
  'north face':       'The North Face',
  'columbia':         'Columbia',
  'patagonia':        'Patagonia',

  // ── Streetwear / skate ─────────────────────────────────────
  'converse':         'Converse',
  'vans':             'Vans',
  'champion':         'Champion',
  'carhartt':         'Carhartt',
  'carhartt wip':     'Carhartt WIP',
  'supreme':          'Supreme',
  'stussy':           'Stüssy',
  'stüssy':           'Stüssy',
  'dickies':          'Dickies',

  // ── Denim & American classics ──────────────────────────────
  "levi's":           "Levi's",
  'levis':            "Levi's",
  'wrangler':         'Wrangler',
  'lee':              'Lee',
  'gap':              'GAP',
  'old navy':         'Old Navy',
  'american eagle':   'American Eagle',
  'hollister':        'Hollister',
  'abercrombie':      'Abercrombie & Fitch',
  'abercrombie & fitch': 'Abercrombie & Fitch',

  // ── Premium / designer accessible ──────────────────────────
  'ralph lauren':     'Ralph Lauren',
  'polo ralph lauren':'Ralph Lauren',
  'tommy hilfiger':   'Tommy Hilfiger',
  'tommy':            'Tommy Hilfiger',
  'calvin klein':     'Calvin Klein',
  'ck':               'Calvin Klein',
  'hugo boss':        'Hugo Boss',
  'boss':             'Hugo Boss',
  'lacoste':          'Lacoste',
  'michael kors':     'Michael Kors',
  'ted baker':        'Ted Baker',
  'karen millen':     'Karen Millen',
  'french connection':'French Connection',
  'fcuk':             'French Connection',
  'superdry':         'Superdry',
  'gant':             'GANT',
  'fred perry':       'Fred Perry',
  'barbour':          'Barbour',
  'jack wolfskin':    'Jack Wolfskin',

  // ── Luxury / designer ─────────────────────────────────────
  'gucci':            'Gucci',
  'prada':            'Prada',
  'louis vuitton':    'Louis Vuitton',
  'lv':               'Louis Vuitton',
  'chanel':           'Chanel',
  'dior':             'Dior',
  'balenciaga':       'Balenciaga',
  'versace':          'Versace',
  'burberry':         'Burberry',
  'saint laurent':    'Saint Laurent',
  'ysl':              'Saint Laurent',
  'valentino':        'Valentino',
  'givenchy':         'Givenchy',
  'fendi':            'Fendi',
  'bottega veneta':   'Bottega Veneta',
  'celine':           'Celine',
  'hermes':           'Hermès',
  'hermès':           'Hermès',
  'armani':           'Armani',
  'emporio armani':   'Emporio Armani',
  'dolce & gabbana':  'Dolce & Gabbana',
  'd&g':              'Dolce & Gabbana',
  'moncler':          'Moncler',
  'off-white':        'Off-White',
  'off white':        'Off-White',
  'stone island':     'Stone Island',
  'dsquared2':        'Dsquared2',
  'kenzo':            'Kenzo',
  'moschino':         'Moschino',
  'vivienne westwood':'Vivienne Westwood',
  'alexander mcqueen':'Alexander McQueen',

  // ── Shoes ──────────────────────────────────────────────────
  'dr. martens':      'Dr. Martens',
  'dr martens':       'Dr. Martens',
  'birkenstock':      'Birkenstock',
  'clarks':           'Clarks',
  'timberland':       'Timberland',
  'skechers':         'Skechers',
  'crocs':            'Crocs',
  'jordan':           'Jordan',
  'air jordan':       'Jordan',

  // ── Accessories & other ────────────────────────────────────
  'ray-ban':          'Ray-Ban',
  'ray ban':          'Ray-Ban',
  'rayban':           'Ray-Ban',
  'oakley':           'Oakley',
  'pandora':          'Pandora',
  'swarovski':        'Swarovski',
  'casio':            'Casio',
  'fossil':           'Fossil',
  'daniel wellington':'Daniel Wellington',

  // ── Kids ───────────────────────────────────────────────────
  'petit bateau':     'Petit Bateau',
  'carter\'s':        "Carter's",
  'carters':          "Carter's",
  'mothercare':       'Mothercare',
  'mini boden':       'Mini Boden',
  'boden':            'Boden',
  'joules':           'Joules',

  // ── Special values ─────────────────────────────────────────
  'vintage':          'Vintage',
  'handmade':         'Handmade',
  'no brand':         'No Brand',
  'unbranded':        'No Brand',
}

/**
 * Deduplicated list of canonical brand names, sorted alphabetically.
 * Used for autocomplete dropdown and filter lists.
 */
export const BRAND_LIST = [...new Set(Object.values(CANONICAL_BRANDS))].sort()

/**
 * Normalise a brand string to its canonical form.
 *
 * - Known brands → exact canonical casing (e.g. "nike" → "Nike", "gap" → "GAP")
 * - Unknown brands → trimmed + smart title-case
 *
 * @param {string} raw - The raw brand string from user input
 * @returns {string} Normalised brand name
 */
export function normalizeBrand(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const key = trimmed.toLowerCase()

  // Check canonical dictionary
  if (CANONICAL_BRANDS[key]) {
    return CANONICAL_BRANDS[key]
  }

  // Unknown brand — apply smart title-case
  // Preserve all-caps short words (2-3 chars) as-is if user typed them uppercase
  return trimmed
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (!word) return ''
      // Keep all-caps short words like "UK", "EU"
      if (word.length <= 3 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export default CANONICAL_BRANDS
