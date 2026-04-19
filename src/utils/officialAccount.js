/**
 * Helpers for identifying and rendering official Sib staff accounts.
 */

const OFFICIAL_USERNAMES = ['sibadmin']

/** Returns true if the user object belongs to an official Sib account. */
export function isOfficialAccount(user) {
  if (!user) return false
  if (user.isAdmin) return true
  return OFFICIAL_USERNAMES.includes((user.username || '').toLowerCase())
}
