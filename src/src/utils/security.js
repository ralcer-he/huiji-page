export async function hashPIN(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'huiji_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPIN(pin, hash) {
  const inputHash = await hashPIN(pin)
  return inputHash === hash
}

export const PIN_SETTINGS_KEY = 'pinHash'
export const PIN_ENABLED_KEY = 'pinEnabled'
export const PIN_ATTEMPTS_KEY = 'pinFailedAttempts'
export const PIN_LOCKOUT_UNTIL_KEY = 'pinLockoutUntil'

export const MAX_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000
