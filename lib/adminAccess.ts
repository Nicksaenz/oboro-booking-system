import { isValidFinancePin } from './finanzasPin'

export function isValidAdminAccess(value: string | null) {
  const configured =
    process.env.CRM_ADMIN_SECRET ||
    process.env.FINANZAS_ADMIN_PIN ||
    process.env.FINANZAS_ADMIN_SECRET

  if (!configured) return false

  const normalized = value?.trim()

  if (!normalized) return false

  return normalized === configured || isValidFinancePin(normalized)
}
