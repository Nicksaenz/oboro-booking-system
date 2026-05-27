import crypto from 'crypto'

const CODE_TTL_MINUTES = 10
const CODE_WINDOW_MS = CODE_TTL_MINUTES * 60 * 1000

function getRecoverySecret() {
  return (
    process.env.PASSWORD_RESET_SECRET ||
    process.env.CRON_SECRET ||
    process.env.FINANZAS_ADMIN_SECRET ||
    'oboro-password-recovery-local'
  )
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function windowFor(date = new Date()) {
  return Math.floor(date.getTime() / CODE_WINDOW_MS)
}

export function getPasswordRecoveryCode(email: string, date = new Date()) {
  const digest = crypto
    .createHmac('sha256', getRecoverySecret())
    .update(`${normalizeEmail(email)}:${windowFor(date)}`)
    .digest('hex')
  const number = parseInt(digest.slice(0, 10), 16) % 1000000

  return String(number).padStart(6, '0')
}

export function isValidPasswordRecoveryCode(email: string, code: string) {
  const normalizedCode = code.replace(/\D/g, '')
  const currentWindow = windowFor()

  return [currentWindow, currentWindow - 1].some((candidate) => {
    const date = new Date(candidate * CODE_WINDOW_MS)
    return getPasswordRecoveryCode(email, date) === normalizedCode
  })
}

export function getPasswordRecoveryExpiration(date = new Date()) {
  return new Date((windowFor(date) + 1) * CODE_WINDOW_MS).toISOString()
}
