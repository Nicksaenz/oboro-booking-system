import crypto from 'crypto'

const ROTATION_HOURS = 6
const ROTATION_MS = ROTATION_HOURS * 60 * 60 * 1000

function getPinSecret() {
  return (
    process.env.FINANZAS_ADMIN_SECRET ||
    process.env.FINANZAS_ADMIN_PIN ||
    'oboro-finanzas-local'
  )
}

function getWindow(date = new Date()) {
  return Math.floor(date.getTime() / ROTATION_MS)
}

function buildPin(windowId: number) {
  const digest = crypto
    .createHmac('sha256', getPinSecret())
    .update(`finanzas:${windowId}`)
    .digest('hex')
  const number = parseInt(digest.slice(0, 10), 16) % 1000000

  return `OB-${String(number).padStart(6, '0')}`
}

export function getCurrentFinancePin(date = new Date()) {
  const windowId = getWindow(date)
  const expiresAt = new Date((windowId + 1) * ROTATION_MS)

  return {
    pin: buildPin(windowId),
    expiresAt: expiresAt.toISOString(),
    rotationHours: ROTATION_HOURS,
  }
}

export function isValidFinancePin(value: string | null) {
  if (!value) return false

  const normalized = value.trim().toUpperCase()
  const windowId = getWindow()

  return [windowId, windowId - 1].some(
    (candidate) => normalized === buildPin(candidate)
  )
}
