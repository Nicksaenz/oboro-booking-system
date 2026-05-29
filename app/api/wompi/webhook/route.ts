import { NextResponse } from 'next/server'
import { registrarPagoAprobado } from '@/lib/suscripcionesPago'
import {
  WOMPI_PLANES,
  getWompiEventSecret,
  leerReferencia,
  sha256,
} from '@/lib/wompi'

type WompiEvento = {
  event?: string
  data?: {
    transaction?: {
      id?: string
      amount_in_cents?: number
      currency?: string
      reference?: string
      status?: string
    }
  }
  signature?: {
    properties?: string[]
    checksum?: string
  }
  timestamp?: number
}

function leerPropiedad(objeto: unknown, ruta: string) {
  return ruta.split('.').reduce<unknown>((actual, parte) => {
    if (actual && typeof actual === 'object' && parte in actual) {
      return (actual as Record<string, unknown>)[parte]
    }

    return undefined
  }, objeto)
}

function validarChecksum(evento: WompiEvento, headerChecksum: string | null) {
  const properties = evento.signature?.properties
  const checksum = headerChecksum ?? evento.signature?.checksum

  if (!properties?.length || !checksum || !evento.timestamp) {
    return false
  }

  const valores = properties
    .map((propiedad) => leerPropiedad(evento.data, propiedad))
    .join('')
  const calculado = sha256(`${valores}${evento.timestamp}${getWompiEventSecret()}`)

  return calculado.toLowerCase() === checksum.toLowerCase()
}

export async function POST(request: Request) {
  const evento = (await request.json()) as WompiEvento
  const headerChecksum = request.headers.get('x-event-checksum')

  if (!validarChecksum(evento, headerChecksum)) {
    return NextResponse.json(
      { error: 'Checksum invalido' },
      { status: 401 }
    )
  }

  if (evento.event !== 'transaction.updated') {
    return NextResponse.json({ received: true })
  }

  const transaction = evento.data?.transaction

  if (!transaction?.reference || transaction.status !== 'APPROVED') {
    return NextResponse.json({ received: true })
  }

  const referencia = leerReferencia(transaction.reference)

  if (!referencia) {
    return NextResponse.json({ received: true })
  }

  const plan = WOMPI_PLANES[referencia.plan]
  const montoEsperado = plan.precioCop * 100

  if (
    transaction.amount_in_cents !== montoEsperado ||
    transaction.currency !== 'COP'
  ) {
    return NextResponse.json(
      { error: 'Monto de transaccion no coincide con el plan' },
      { status: 400 }
    )
  }

  try {
    await registrarPagoAprobado({
      usuarioId: referencia.usuarioId,
      plan: referencia.plan,
      transactionId: transaction.id,
      reference: transaction.reference,
      amountInCents: transaction.amount_in_cents,
      currency: transaction.currency,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo registrar el pago' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
