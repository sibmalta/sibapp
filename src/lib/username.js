export const USERNAME_PATTERN = /^[a-z0-9._]+$/
export const USERNAME_MIN_LENGTH = 2
export const USERNAME_MAX_LENGTH = 24

export function normalizeUsernameInput(value = '') {
  return String(value)
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

export function validateUsername(value = '') {
  const username = normalizeUsernameInput(value)

  if (!username) return { valid: false, username, error: 'Required' }
  if (username.length < USERNAME_MIN_LENGTH) {
    return { valid: false, username, error: `Min. ${USERNAME_MIN_LENGTH} characters` }
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { valid: false, username, error: `Max. ${USERNAME_MAX_LENGTH} characters` }
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { valid: false, username, error: 'Only lowercase letters, numbers, . and _' }
  }

  return { valid: true, username, error: null }
}
