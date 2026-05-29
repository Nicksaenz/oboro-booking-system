import { createHash } from 'node:crypto'

export type WompiPlan = 'basico' | 'pro' | 'business'

export const WOMPI_PLANES: Record<
  WompiPlan,
  { nombre: string; precioCop: number; descripcion: string }
> = {
  basico: {
    nombre: 'Basico',
    precioCop: 40000,
    descripcion: 'Agenda, QR, Google Maps, clientes, servicios y recordatorios automaticos.',
  },
  pro: {
    nombre: 'Pro',
    precioCop: 90000,
    descripcion: 'Mas equipo, confirmacion, resenas, ranking e historial de clientes.',
  },
  business: {
    nombre: 'Business',
    precioCop: 120000,
    descripcion: 'Finanzas Business, gastos por categoria, utilidad y liquidaciones avanzadas.',
  },
}

export function esWompiPlan(plan: unknown): plan is WompiPlan {
  return typeof plan === 'string' && plan in WOMPI_PLANES
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export function getWompiPublicKey() {
  const publicKey = process.env.WOMPI_PUBLIC_KEY

  if (!publicKey) {
    throw new Error('Falta configurar WOMPI_PUBLIC_KEY')
  }

  return publicKey
}

export function getWompiIntegritySecret() {
  const secret = process.env.WOMPI_INTEGRITY_SECRET

  if (!secret) {
    throw new Error('Falta configurar WOMPI_INTEGRITY_SECRET')
  }

  return secret
}

export function getWompiEventSecret() {
  return process.env.WOMPI_EVENT_SECRET ?? getWompiIntegritySecret()
}

export function getWompiCheckoutUrl() {
  return process.env.WOMPI_CHECKOUT_URL ?? 'https://checkout.wompi.co/p/'
}

export function getWompiApiUrl() {
  const publicKey = getWompiPublicKey()

  if (publicKey.startsWith('pub_test_')) {
    return 'https://sandbox.wompi.co/v1'
  }

  return 'https://production.wompi.co/v1'
}

export function generarReferencia(usuarioId: string, plan: WompiPlan) {
  return `oboro-${usuarioId}-${plan}-${Date.now()}`
}

export function leerReferencia(reference: string) {
  const [, usuarioId, planRaw] = reference.match(/^oboro-(.+)-(basico|pro|premium|business)-\d+$/) ?? []
  const plan = planRaw === 'premium' ? 'business' : planRaw

  if (!usuarioId || !esWompiPlan(plan)) {
    return null
  }

  return {
    usuarioId,
    plan,
  }
}

export function sha256(valor: string) {
  return createHash('sha256').update(valor).digest('hex')
}

export function firmarCheckout({
  reference,
  amountInCents,
  currency,
}: {
  reference: string
  amountInCents: number
  currency: 'COP'
}) {
  return sha256(
    `${reference}${amountInCents}${currency}${getWompiIntegritySecret()}`
  )
}

export function construirUrlCheckout({
  reference,
  amountInCents,
  customerEmail,
  signature,
}: {
  reference: string
  amountInCents: number
  customerEmail: string
  signature: string
}) {
  const url = new URL(getWompiCheckoutUrl())
  url.searchParams.set('public-key', getWompiPublicKey())
  url.searchParams.set('currency', 'COP')
  url.searchParams.set('amount-in-cents', String(amountInCents))
  url.searchParams.set('reference', reference)
  url.searchParams.set('signature:integrity', signature)
  url.searchParams.set('customer-data:email', customerEmail)

  const appUrl = getAppUrl()

  if (appUrl.startsWith('https://')) {
    url.searchParams.set('redirect-url', `${appUrl}/suscripcion?wompi=retorno`)
  }

  return url.toString()
}
