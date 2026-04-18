// ─── Sib Content Moderation Engine ──────────────────────────────────────────
//
// Detects profanity and inappropriate content across:
//   - exact words
//   - leet speak / symbol substitutions (f@ck, ph*ck)
//   - spaced evasion (f u c k)
//   - repeated characters (fuuuck)
//   - altered spellings (phuck)
//
// Exports:
//   moderateContent(text, context)  → { blocked, flagged, reason }
//   moderateUsername(username)       → { blocked, reason }
//   moderateAll(fields)             → { blocked, flagged, results }
// ────────────────────────────────────────────────────────────────────────────

// ── Character substitution map (leet speak + common evasions) ───────────────
const CHAR_MAP = {
  '@': 'a', '4': 'a', '^': 'a', '∆': 'a',
  '8': 'b',
  '(': 'c', '<': 'c', '{': 'c', '¢': 'c',
  '3': 'e', '€': 'e', '£': 'e',
  'ph': 'f',
  '6': 'g', '9': 'g',
  '#': 'h',
  '!': 'i', '1': 'i', '|': 'i', 'l': 'l',
  '0': 'o', 'ø': 'o',
  '5': 's', '$': 's', 'z': 's',
  '+': 't', '7': 't',
  'v': 'v', '\\/': 'v',
  'vv': 'w',
  '%': 'x',
  '¥': 'y',
  '2': 'z',
}

// Multi-char substitutions applied before single-char
const MULTI_CHAR_SUBS = [
  ['ph', 'f'],
  ['vv', 'w'],
  ['\\/', 'v'],
  ['ck', 'k'],
  ['kk', 'k'],
]

/**
 * Normalise text for profanity detection:
 * 1. Lowercase
 * 2. Remove zero-width and invisible unicode
 * 3. Strip spaces/separators between letters (catches "f u c k")
 * 4. Apply multi-char substitutions
 * 5. Apply single-char leet substitutions
 * 6. Collapse repeated chars (fuuuuck → fuck)
 */
function normalise(raw) {
  let t = raw.toLowerCase()

  // Remove zero-width chars, combining marks
  t = t.replace(/[\u200B-\u200D\uFEFF\u00AD\u034F\u2060\u2061-\u2064\u180E]/g, '')

  // Remove common separators between single characters (detects "f.u.c.k", "f-u-c-k", "f_u_c_k")
  // Only collapse when we see single letter + separator + single letter patterns
  t = t.replace(/\b(\w)\s+(?=\w\b)/g, '$1')  // collapse single-char spacing

  // Apply multi-char subs first
  for (const [from, to] of MULTI_CHAR_SUBS) {
    t = t.split(from).join(to)
  }

  // Apply single-char subs
  let out = ''
  for (const ch of t) {
    out += CHAR_MAP[ch] || ch
  }

  // Collapse repeated characters (3+ → 2): fuuuck → fuuck, then patterns match
  out = out.replace(/(.)\1{2,}/g, '$1$1')
  // Further collapse doubles for matching: fuuck → fuck
  out = out.replace(/(.)\1/g, (match, ch) => {
    // Keep doubles that are legitimate (ll, ss, ee, oo, etc.)
    const LEGIT_DOUBLES = new Set(['l', 's', 'e', 'o', 'f', 't', 'p', 'r', 'n', 'm'])
    return LEGIT_DOUBLES.has(ch) ? match : ch
  })

  // Strip remaining non-alpha (dots, dashes, underscores, asterisks between letters)
  out = out.replace(/[^a-z]/g, '')

  return out
}

/**
 * Also create a "light" normalisation that only lowercases + strips spaces/symbols
 * for detecting spaced-out profanity like "f u c k" in the original text.
 */
function stripToAlpha(raw) {
  return raw.toLowerCase().replace(/[^a-z]/g, '')
}

// ── Profanity word lists ────────────────────────────────────────────────────
// Organised by severity: hard-block terms and soft-flag terms.

const HARD_BLOCK_TERMS = [
  // Core profanity
  'fuck', 'fucker', 'fuckers', 'fucked', 'fucking', 'fucks', 'fuckoff',
  'motherfucker', 'motherfuckers', 'motherfucking',
  'shit', 'shits', 'shitty', 'shitted', 'shitting', 'bullshit', 'horseshit', 'dipshit', 'shithead',
  'ass', 'asshole', 'assholes', 'arsehole', 'arseholes', 'arse',
  'bitch', 'bitches', 'bitchy', 'bitching', 'sonofabitch',
  'bastard', 'bastards',
  'dick', 'dickhead', 'dickheads', 'dicks',
  'cock', 'cocks', 'cocksucker', 'cocksuckers',
  'cunt', 'cunts',
  'pussy', 'pussies',
  'whore', 'whores', 'whorish',
  'slut', 'sluts', 'slutty',
  'nigger', 'niggers', 'nigga', 'niggas',
  'faggot', 'faggots', 'fag', 'fags',
  'retard', 'retards', 'retarded',
  'twat', 'twats',
  'wanker', 'wankers', 'wank',
  'prick', 'pricks',
  'bollocks', 'bellend', 'bellends',
  'tosser', 'tossers',
  // Sexual
  'blowjob', 'blowjobs', 'handjob', 'handjobs',
  'dildo', 'dildos',
  'jizz', 'cum', 'cumshot',
  'orgasm', 'orgasms',
  'porn', 'porno', 'pornography',
  // Slurs & hate
  'chink', 'chinks',
  'spic', 'spics', 'spick', 'spicks',
  'kike', 'kikes',
  'tranny', 'trannies',
  'dyke', 'dykes',
  // Drugs (hard)
  'cocaine', 'heroin', 'meth', 'methamphetamine',
  // Violence
  'killurself', 'killyourself', 'kys',
]

const SOFT_FLAG_TERMS = [
  // Mildly inappropriate — flag for admin review but don't hard-block
  'damn', 'damned', 'damnit',
  'crap', 'crappy',
  'hell',
  'piss', 'pissed', 'pissing',
  'boob', 'boobs', 'booby',
  'butt', 'butthole',
  'dumb', 'dumbass',
  'idiot', 'idiots', 'idiotic',
  'moron', 'morons', 'moronic',
  'stupid',
  'loser', 'losers',
  'suck', 'sucks', 'sucker',
  'screw', 'screwed', 'screwing',
  'wtf', 'stfu', 'lmfao',
]

// ── Username-specific additional blocks ─────────────────────────────────────
// These are also blocked in usernames on top of the above
const USERNAME_EXTRA_BLOCKS = [
  'admin', 'sib', 'sibmalta', 'support', 'moderator', 'mod',
  'official', 'staff', 'system', 'root', 'helpdesk',
  'sexy', 'xxx', 'nsfw', 'nude', 'nudes', 'naked',
  'dealer', 'drugs', 'weed', 'cannabis',
  'hitler', 'nazi', 'nazis',
  'isis', 'alqaeda', 'terrorist',
  'onlyfans',
]

// ── Build lookup sets for fast matching ─────────────────────────────────────

const hardBlockSet = new Set(HARD_BLOCK_TERMS)
const softFlagSet = new Set(SOFT_FLAG_TERMS)
const usernameBlockSet = new Set([...HARD_BLOCK_TERMS, ...USERNAME_EXTRA_BLOCKS])

// ── Detection functions ─────────────────────────────────────────────────────

/**
 * Check if normalised text contains any term from a word set.
 * Uses substring matching to catch embedded profanity.
 */
function findMatch(normalisedText, wordSet) {
  for (const term of wordSet) {
    if (normalisedText.includes(term)) {
      return term
    }
  }
  return null
}

/**
 * More precise word-boundary check for short terms that could cause false positives.
 * For terms ≤ 3 chars, require word boundaries; for longer terms, substring is fine.
 */
function findMatchPrecise(normalisedText, alphaStripped, wordSet) {
  const SHORT_THRESHOLD = 4
  for (const term of wordSet) {
    if (term.length < SHORT_THRESHOLD) {
      // Use word-boundary regex on the alpha-stripped version
      const re = new RegExp(`(^|[^a-z])${term}([^a-z]|$)`)
      if (re.test(normalisedText) || re.test(alphaStripped)) {
        return term
      }
    } else {
      if (normalisedText.includes(term) || alphaStripped.includes(term)) {
        return term
      }
    }
  }
  return null
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Moderate a single piece of content.
 *
 * @param {string} text - Raw user input
 * @param {'username'|'bio'|'title'|'description'|'tag'|'message'} context
 * @returns {{ blocked: boolean, flagged: boolean, reason: string|null, matchedTerm: string|null }}
 */
export function moderateContent(text, context = 'general') {
  if (!text || typeof text !== 'string') {
    return { blocked: false, flagged: false, reason: null, matchedTerm: null }
  }

  const normalised = normalise(text)
  const alphaOnly = stripToAlpha(text)

  // For usernames: zero tolerance
  if (context === 'username') {
    const match = findMatchPrecise(normalised, alphaOnly, usernameBlockSet)
    if (match) {
      return {
        blocked: true,
        flagged: false,
        reason: 'This username is not allowed',
        matchedTerm: match,
      }
    }
    return { blocked: false, flagged: false, reason: null, matchedTerm: null }
  }

  // Hard block check
  const hardMatch = findMatchPrecise(normalised, alphaOnly, hardBlockSet)
  if (hardMatch) {
    return {
      blocked: true,
      flagged: false,
      reason: 'This content is not allowed',
      matchedTerm: hardMatch,
    }
  }

  // Soft flag check (borderline — allow but flag for admin)
  const softMatch = findMatchPrecise(normalised, alphaOnly, softFlagSet)
  if (softMatch) {
    return {
      blocked: false,
      flagged: true,
      reason: null,
      matchedTerm: softMatch,
    }
  }

  return { blocked: false, flagged: false, reason: null, matchedTerm: null }
}

/**
 * Convenience: moderate a username specifically (strict mode).
 *
 * @param {string} username
 * @returns {{ blocked: boolean, reason: string|null }}
 */
export function moderateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { blocked: false, reason: null }
  }
  const result = moderateContent(username, 'username')
  return { blocked: result.blocked, reason: result.reason }
}

/**
 * Moderate multiple fields at once.
 *
 * @param {Object} fields - e.g. { title: 'My Listing', description: '...', tags: ['tag1','tag2'] }
 * @param {string} context - default context for all fields
 * @returns {{ blocked: boolean, flagged: boolean, results: Object, firstBlockedField: string|null, blockReason: string|null }}
 */
export function moderateAll(fields, context = 'general') {
  const results = {}
  let anyBlocked = false
  let anyFlagged = false
  let firstBlockedField = null
  let blockReason = null

  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      // Handle arrays (e.g. tags)
      const arrayResults = value.map(v => moderateContent(String(v), field === 'tags' ? 'tag' : context))
      const blockedItem = arrayResults.find(r => r.blocked)
      const flaggedItem = arrayResults.find(r => r.flagged)
      results[field] = {
        blocked: !!blockedItem,
        flagged: !!flaggedItem,
        reason: blockedItem?.reason || null,
      }
      if (blockedItem && !anyBlocked) {
        anyBlocked = true
        firstBlockedField = field
        blockReason = blockedItem.reason
      }
      if (flaggedItem) anyFlagged = true
    } else if (typeof value === 'string' && value.trim()) {
      const fieldContext = field === 'username' ? 'username' : (field === 'bio' ? 'bio' : context)
      const result = moderateContent(value, fieldContext)
      results[field] = result
      if (result.blocked && !anyBlocked) {
        anyBlocked = true
        firstBlockedField = field
        blockReason = result.reason
      }
      if (result.flagged) anyFlagged = true
    } else {
      results[field] = { blocked: false, flagged: false, reason: null, matchedTerm: null }
    }
  }

  return {
    blocked: anyBlocked,
    flagged: anyFlagged,
    results,
    firstBlockedField,
    blockReason,
  }
}

// ── Exported for testing ────────────────────────────────────────────────────
export { normalise as _normalise, stripToAlpha as _stripToAlpha }
