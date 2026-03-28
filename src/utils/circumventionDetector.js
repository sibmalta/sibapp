// ─── Sib Anti-Circumvention Detection Engine ───────────────────────────────

// Direct contact keywords
const CONTACT_KEYWORDS = [
  'phone', 'number', 'call me', 'call us', 'ring me', 'text me', 'text us',
  'whatsapp', 'whats app', 'w app', 'wapp', 'wa ', ' wa\n',
  'instagram', 'insta', ' ig ', '\nig\n', 'ig:', 'ig -',
  'snapchat', 'snap', 'telegram', 'tg ',
  'viber', 'signal', 'messenger', 'fb messenger',
  'email me', 'email us', 'gmail', 'hotmail', 'yahoo', 'outlook',
  'facebook', ' fb ', 'twitter', 'tiktok',
  'dm me', 'dms', 'direct message', 'pm me', 'slide',
]

// Meetup / off-platform transaction language
const MEETUP_KEYWORDS = [
  'meet up', 'meetup', 'meet in person', 'meet there', 'meet here',
  'in person', 'face to face', 'face-to-face',
  'pay cash', 'pay in cash', 'cash only', 'cash deal', 'cash in hand',
  'pay me directly', 'pay directly', 'pay outside',
  'collect from', 'collect it', 'pick up from', 'pick-up', 'pickup from',
  'drop off', 'drop it off', 'hand deliver',
]

// Bypass language
const BYPASS_KEYWORDS = [
  'cheaper outside', 'better price outside', 'better price direct',
  'avoid the fee', 'avoid fee', 'avoid fees', 'skip the fee', 'no fees',
  'outside the app', 'outside sib', 'off the app', 'off app', 'off-app',
  'without the app', 'without sib', 'bypass', 'around the fee',
  'save on fee', 'save fees', 'no commission',
]

// Intent phrases — no hard keyword but intent is off-platform
const INTENT_PHRASES = [
  'message me elsewhere', 'reach me elsewhere', 'contact me elsewhere',
  "i'll send details", "i'll send you details", 'send you my details',
  "let's do this directly", "do this directly", "sort this directly",
  "let's sort it out", 'another way', 'different way', 'other platform',
  'outside of here', 'not through here', 'not on here',
]

// ─── Pattern helpers ────────────────────────────────────────────────────────

// Spaced-out digits: "9 9 1 2 3 4 5 6" — 5+ digits with spaces between them
const SPACED_DIGITS_RE = /(\d[\s.,-]{1,3}){4,}\d/

// Number words in sequence — 4+ consecutive number words
const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten']
const NUMBER_WORDS_RE = new RegExp(
  `\\b(${NUMBER_WORDS.join('|')})(\\s+(${NUMBER_WORDS.join('|')})){3,}\\b`,
  'i'
)

// Email-like pattern (with spaces or not): word @ word . word
const EMAIL_RE = /\b[\w.+-]+\s*@\s*[\w.-]+\s*\.\s*\w+\b/i

// Bare @ symbol (social handle)
const AT_SYMBOL_RE = /@\w/

// Phone number — at least 7 digits possibly separated by spaces/dots/dashes
const PHONE_RE = /(\+?\d[\s.\-()]{0,2}){7,}/

// ─── Main detector ──────────────────────────────────────────────────────────

/**
 * Analyses a message string.
 * Returns { flagged: boolean, reasons: string[], severity: 'warn' | 'block' }
 */
export function analyseMessage(raw) {
  const text = raw.toLowerCase().trim()
  const reasons = []

  // 1. Direct contact keywords
  for (const kw of CONTACT_KEYWORDS) {
    if (text.includes(kw)) {
      reasons.push(`Contains contact reference ("${kw.trim()}")`)
      break
    }
  }

  // 2. Meetup / cash keywords
  for (const kw of MEETUP_KEYWORDS) {
    if (text.includes(kw)) {
      reasons.push(`Suggests off-platform meetup or cash deal`)
      break
    }
  }

  // 3. Bypass language
  for (const kw of BYPASS_KEYWORDS) {
    if (text.includes(kw)) {
      reasons.push(`Suggests bypassing Sib ("${kw.trim()}")`)
      break
    }
  }

  // 4. Intent phrases
  for (const phrase of INTENT_PHRASES) {
    if (text.includes(phrase)) {
      reasons.push(`Suggests moving conversation off-platform`)
      break
    }
  }

  // 5. Spaced-out digits (phone number obfuscation)
  if (SPACED_DIGITS_RE.test(text)) {
    reasons.push(`Possible phone number (digits spaced out)`)
  }

  // 6. Number words
  if (NUMBER_WORDS_RE.test(text)) {
    reasons.push(`Possible number written as words`)
  }

  // 7. Email pattern
  if (EMAIL_RE.test(raw)) {
    reasons.push(`Looks like an email address`)
  }

  // 8. @ handle
  if (AT_SYMBOL_RE.test(raw)) {
    reasons.push(`Contains a social handle (@)`)
  }

  // 9. Phone number pattern
  if (PHONE_RE.test(raw.replace(/[€£$]/g, ''))) {
    reasons.push(`Looks like a phone number`)
  }

  const flagged = reasons.length > 0
  // Multiple reasons or bypass = block; single soft reason = warn
  const severity = (reasons.length >= 2 || reasons.some(r => r.includes('bypass') || r.includes('email') || r.includes('phone')))
    ? 'block'
    : 'warn'

  return { flagged, reasons, severity }
}
