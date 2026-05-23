import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
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

function calcularVencimiento() {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 30)
  return fecha.toISOString()
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

  if (transaction.amount_in_cents !== montoEsperado) {
    return NextResponse.json(
      { error: 'Monto de transaccion no coincide con el plan' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()
  const datosSuscripcion = {
    plan: referencia.plan,
    estado: 'activa',
    fecha_vencimiento: calcularVencimiento(),
  }

  const { data: existente, error: consultaError } = await supabase
    .from('suscripciones')
    .select('usuario_id')
    .eq('usuario_id', referencia.usuarioId)
    .maybeSingle()

  if (consultaError) {
    return NextResponse.json(
      { error: consultaError.message },
      { status: 500 }
    )
  }

  const { error } = existente
    ? await supabase
    .from('suscripciones')
      .update(datosSuscripcion)
      .eq('usuario_id', referencia.usuarioId)
    : await supabase
      .from('suscripciones')
      .insert([
        {
          usuario_id: referencia.usuarioId,
          nombre_negocio: 'Nuevo negocio',
          email: 'pendiente@oborobooking.local',
          telefono: 'Pendiente',
          whatsapp_enviado: false,
          fecha_inicio: new Date().toISOString(),
          ...datosSuscripcion,
        },
      ])

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
