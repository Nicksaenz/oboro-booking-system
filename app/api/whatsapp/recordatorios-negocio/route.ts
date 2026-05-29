import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendBusinessAppointmentReminder } from '@/lib/whatsapp'

type CitaNegocio = {
  ID: string
  ID_Usuario: string
  Fecha: string
  Hora: string
  Clientes?: {
    Nombre?: string
  } | null
  SERVICIOS?: {
    'Nombre del servicio'?: string
  } | null
  Empleados?: {
    Nombre?: string
  } | null
}

type SuscripcionNegocio = {
  usuario_id: string
  nombre_negocio?: string | null
  telefono?: string | null
  plan?: string | null
  estado?: string | null
  fecha_vencimiento?: string | null
}

function formatDateForSupabase(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getTomorrowDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return formatDateForSupabase(date)
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) return false

  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

function tieneAutomatizaciones(suscripcion?: SuscripcionNegocio) {
  const plan = String(suscripcion?.plan ?? '').toLowerCase()
  const estado = String(suscripcion?.estado ?? '').toLowerCase()
  const vence = suscripcion?.fecha_vencimiento
    ? new Date(suscripcion.fecha_vencimiento).getTime()
    : Date.now()

  return (
    ['basico', 'pro', 'business', 'premium'].includes(plan) &&
    ['activa', 'activo', 'pagada', 'paid'].includes(estado) &&
    vence >= Date.now()
  )
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Falta configurar CRON_SECRET' },
      { status: 503 }
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const fecha = getTomorrowDate()

  const { data, error } = await supabase
    .from('Citas')
    .select(`
      ID,
      ID_Usuario,
      Fecha,
      Hora,
      Estado,
      Clientes:ID_Cliente (
        Nombre
      ),
      SERVICIOS:ID_Servicio (
        "Nombre del servicio"
      ),
      Empleados:ID_Empleado (
        Nombre
      )
    `)
    .eq('Fecha', fecha)
    .in('Estado', ['pendiente', 'confirmada'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const citas = (data || []) as CitaNegocio[]
  const usuarioIds = [...new Set(citas.map((cita) => cita.ID_Usuario))]
  const { data: suscripciones, error: suscripcionesError } = usuarioIds.length
    ? await supabase
      .from('suscripciones')
      .select('usuario_id, nombre_negocio, telefono, plan, estado, fecha_vencimiento')
      .in('usuario_id', usuarioIds)
    : { data: [], error: null }

  if (suscripcionesError) {
    return NextResponse.json(
      { error: suscripcionesError.message },
      { status: 500 }
    )
  }

  const suscripcionesPorUsuario = new Map(
    ((suscripciones || []) as SuscripcionNegocio[]).map((suscripcion) => [
      suscripcion.usuario_id,
      suscripcion,
    ])
  )
  const resultados = []

  for (const cita of citas) {
    const suscripcion = suscripcionesPorUsuario.get(cita.ID_Usuario)

    if (!tieneAutomatizaciones(suscripcion)) {
      resultados.push({
        citaId: cita.ID,
        usuarioId: cita.ID_Usuario,
        enviado: false,
        error: 'El plan no incluye recordatorio automatico al negocio.',
      })
      continue
    }

    try {
      const respuesta = await sendBusinessAppointmentReminder({
        to: suscripcion?.telefono ?? '',
        negocio: suscripcion?.nombre_negocio ?? 'tu negocio',
        cliente: cita.Clientes?.Nombre ?? 'cliente',
        fecha: cita.Fecha,
        hora: cita.Hora,
        servicio: cita.SERVICIOS?.['Nombre del servicio'] ?? 'servicio',
        empleado: cita.Empleados?.Nombre ?? 'equipo',
      })

      resultados.push({
        citaId: cita.ID,
        usuarioId: cita.ID_Usuario,
        enviado: true,
        respuesta,
      })
    } catch (sendError) {
      resultados.push({
        citaId: cita.ID,
        usuarioId: cita.ID_Usuario,
        enviado: false,
        error:
          sendError instanceof Error
            ? sendError.message
            : 'No se pudo enviar el recordatorio al negocio',
      })
    }
  }

  return NextResponse.json({
    fecha,
    total: citas.length,
    enviados: resultados.filter((resultado) => resultado.enviado).length,
    resultados,
  })
}
