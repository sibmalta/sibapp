export const EMAIL_VERIFICATION_REQUIRED_MESSAGE = 'Please verify your email to continue.'

export function isEmailVerified(user) {
  if (!user) return false
  if (user.emailVerified === true) return true
  if (user.email_confirmed_at || user.confirmed_at) return true
  if (user.user_metadata?.email_verified === true) return true
  if (user.app_metadata?.provider === 'phone' && !user.email) return true
  return false
}

export function requireVerifiedEmail(user) {
  if (!user?.id) {
    return { ok: false, error: 'Please log in to continue.' }
  }
  if (!isEmailVerified(user)) {
    return { ok: false, error: EMAIL_VERIFICATION_REQUIRED_MESSAGE }
  }
  return { ok: true, error: null }
}
