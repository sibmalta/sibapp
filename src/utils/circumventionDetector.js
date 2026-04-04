// ─── Sib Anti-Circumvention Detection Engine v2 ────────────────────────────

// ── Leet-speak / Unicode normaliser ────────────────────────────────────────
const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', '\x24': 's', '!': 'i',
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c',
  '\u0443': 'y', '\u0445': 'x', '\u04bb': 'h',
}
function normalise(raw) {
  let out = ''
  for (const ch of raw) {
    out += LEET_MAP[ch] || ch
  }
  out = out.replace(/(.)\1{2,}/g, '$1$1')
  out = out.replace(/[\u200B-\u200D\uFEFF]/g, '')
  return out.toLowerCase()
}

// ── Keyword lists ──────────────────────────────────────────────────────────

const CONTACT_KEYWORDS = [
  'phone', 'number', 'call me', 'call us', 'ring me', 'text me', 'text us',
  'whatsapp', 'whats app', 'whatsap', 'w app', 'wapp', 'wa me',
  'wats app', 'watsapp', 'whatssapp', 'what sapp',
  'instagram', 'insta', ' ig ', 'ig:', 'ig -', 'ig@',
  'snapchat', 'snap me', 'snap chat',
  'telegram', 'tg ', 'tg:', 'telegrm',
  'viber', 'signal app', 'signal me',
  'messenger', 'fb messenger', 'fb msg',
  'email me', 'email us', 'gmail', 'hotmail', 'yahoo', 'outlook', 'protonmail',
  'icloud.com', 'mail.com', 'ymail',
  'facebook', ' fb ', 'twitter', 'tiktok', 'linkedin',
  'dm me', 'dms', 'direct message', 'pm me', "pm'd",
  'slide into', 'hmu', 'hit me up',
  'contact me', 'contact us', 'reach me', 'reach out to me',
  'message me on', 'msg me on', 'write me on', 'find me on',
  'add me on', 'follow me on', 'my handle', 'my page',
  'my profile on', 'my account on',
]

const MEETUP_KEYWORDS = [
  'meet up', 'meetup', 'meet in person', 'meet there', 'meet here',
  'in person', 'face to face', 'face-to-face',
  'pay cash', 'pay in cash', 'cash only', 'cash deal', 'cash in hand',
  'pay me directly', 'pay directly', 'pay outside', 'bank transfer',
  'wire me', 'revolut me', 'revolut', 'paypal me', 'paypal', 'venmo',
  'collect from', 'collect it', 'pick up from', 'pick-up', 'pickup from',
  'drop off', 'drop it off', 'hand deliver',
  'i can come', 'come and get', 'come collect',
]

const BYPASS_KEYWORDS = [
  'cheaper outside', 'better price outside', 'better price direct',
  'avoid the fee', 'avoid fee', 'avoid fees', 'skip the fee', 'no fees',
  'save the fee', 'save on fees', 'without the fee', 'without fees',
  'outside the app', 'outside sib', 'off the app', 'off app', 'off-app',
  'without the app', 'without sib', 'bypass', 'around the fee',
  'save on fee', 'no commission', 'skip commission',
  'cut out the middleman', 'no middleman',
  'deal directly', 'deal direct', 'directly between us',
  'just between us', 'keep it between us',
  'off platform', 'off-platform', 'offplatform',
]

const INTENT_PHRASES = [
  'message me elsewhere', 'reach me elsewhere', 'contact me elsewhere',
  "i'll send details", "i'll send you details", 'send you my details',
  "let's do this directly", 'do this directly', 'sort this directly',
  "let's sort it out", 'another way', 'different way', 'other platform',
  'outside of here', 'not through here', 'not on here',
  'easier if we', 'quicker if we', 'faster if we',
  'better off just', 'better if we just',
  "i'll give you my", "here's my",
  'take this elsewhere', 'move this elsewhere',
  'continue elsewhere', 'talk elsewhere',
  'other channel', 'different channel',
]

// ── Pattern helpers ────────────────────────────────────────────────────────

const SPACED_DIGITS_RE = /(\d[\s.,()\-]{1,3}){4,}\d/

const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten']
const NUMBER_WORDS_RE = new RegExp(
  `\\b(${NUMBER_WORDS.join('|')})(\\s+(${NUMBER_WORDS.join('|')})){3,}\\b`, 'i'
)

const EMAIL_RE = /\b[\w.+\-]+\s*[@\uFF20]\s*[\w.\-]+\s*[.\u3002]\s*\w{2,}\b/i

const HANDLE_RE = /[@\uFF20]\s*[a-zA-Z_][\w.]{2,}/

const PHONE_RE = /(\+?\d[\s.\-()/]{0,3}){7,}/

const MALTA_PHONE_RE = /(\+?\s*3\s*5\s*6[\s.\-]*)?\b[279]\s*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d\b/

const URL_RE = /(?:https?:\/\/|www\.)[^\s]{4,}/i

const SPELLED_PLATFORMS_RE = /\b[wW]\s*[hH]\s*[aA]\s*[tT]\s*[sS]\s*[aA]\s*[pP]{1,2}\b|\b[iI]\s*[nN]\s*[sS]\s*[tT]\s*[aA]\s*[gG]\s*[rR]\s*[aA]\s*[mM]\b|\b[tT]\s*[eE]\s*[lL]\s*[eE]\s*[gG]\s*[rR]\s*[aA]\s*[mM]\b/

// ── Violation Tracker ──────────────────────────────────────────────────────
const STORAGE_KEY = 'sib_violations'
const MAX_VIOLATIONS_BEFORE_RESTRICT = 5
const RESTRICTION_DURATION_MS = 15 * 60 * 1000

function getViolationState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { count: 0, timestamps: [], restrictedUntil: null }
  } catch {
    return { count: 0, timestamps: [], restrictedUntil: null }
  }
}

function saveViolationState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* noop */ }
}

export function recordViolation() {
  const state = getViolationState()
  const now = Date.now()
  state.count += 1
  state.timestamps.push(now)
  if (state.timestamps.length > 20) state.timestamps = state.timestamps.slice(-20)
  const recent = state.timestamps.filter(t => now - t < 30 * 60 * 1000)
  if (recent.length >= MAX_VIOLATIONS_BEFORE_RESTRICT) {
    state.restrictedUntil = now + RESTRICTION_DURATION_MS
  }
  saveViolationState(state)
  return state
}

export function getRestriction() {
  const state = getViolationState()
  if (!state.restrictedUntil) return null
  const remaining = state.restrictedUntil - Date.now()
  if (remaining <= 0) {
    state.restrictedUntil = null
    saveViolationState(state)
    return null
  }
  return { until: state.restrictedUntil, remainingMs: remaining }
}

export function getViolationCount() {
  return getViolationState().count
}

// ── Main detector ──────────────────────────────────────────────────────────

/**
 * Analyses a message string.
 * Returns { flagged, reasons, severity ('warn'|'block'), categories }
 */
export function analyseMessage(raw) {
  const text = normalise(raw)
  const reasons = []
  const categories = []

  for (const kw of CONTACT_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      reasons.push(`Contains contact reference ("${kw.trim()}")`)
      categories.push('contact')
      break
    }
  }

  for (const kw of MEETUP_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      reasons.push(`Suggests off-platform meetup or cash deal`)
      categories.push('meetup')
      break
    }
  }

  for (const kw of BYPASS_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      reasons.push(`Suggests bypassing Sib ("${kw.trim()}")`)
      categories.push('bypass')
      break
    }
  }

  for (const phrase of INTENT_PHRASES) {
    if (text.includes(phrase.toLowerCase())) {
      reasons.push(`Suggests moving conversation off-platform`)
      categories.push('intent')
      break
    }
  }

  if (SPACED_DIGITS_RE.test(raw)) {
    reasons.push(`Possible phone number (spaced digits)`)
    categories.push('phone')
  }

  if (NUMBER_WORDS_RE.test(text)) {
    reasons.push(`Possible number written as words`)
    categories.push('phone')
  }

  if (EMAIL_RE.test(raw)) {
    reasons.push(`Contains an email address`)
    categories.push('email')
  }

  if (HANDLE_RE.test(raw)) {
    reasons.push(`Contains a social media handle (@)`)
    categories.push('handle')
  }

  const sanitised = raw.replace(/[€£$]/g, '')
  if (PHONE_RE.test(sanitised) || MALTA_PHONE_RE.test(sanitised)) {
    if (!categories.includes('phone')) {
      reasons.push(`Contains a phone number`)
      categories.push('phone')
    }
  }

  if (SPELLED_PLATFORMS_RE.test(raw)) {
    reasons.push(`Platform name spelled with spaces (evasion attempt)`)
    categories.push('evasion')
  }

  const urlMatch = raw.match(URL_RE)
  if (urlMatch && !urlMatch[0].includes('sib.')) {
    reasons.push(`Contains an external link`)
    categories.push('url')
  }

  const flagged = reasons.length > 0
  const hardCategories = ['phone', 'email', 'bypass', 'evasion', 'url']
  const hasHard = categories.some(c => hardCategories.includes(c))
  const severity = (reasons.length >= 2 || hasHard) ? 'block' : 'warn'

  return { flagged, reasons, severity, categories }
}
