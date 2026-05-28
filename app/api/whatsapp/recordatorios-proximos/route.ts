import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  CitaRecordatorio,
  sendAppointmentReminder,
  sendBusinessAppointmentReminder,
} from '@/lib/whatsapp'

type CitaProxima = CitaRecordatorio & {
  ID_Usuario: string
}

type SuscripcionNegocio = {
  usuario_id: string
  nombre_negocio?: string | null
  telefono?: string | null
  plan?: string | null
  estado?: string | null
  fecha_vencimiento?: string | null
}

const RECORDATORIOS_MINUTOS = [20, 5]
const VENTANA_MINUTOS = 2
const ESTADOS_ACTIVOS = ['pendiente', 'confirmada']

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) return false

  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

function getBogotaParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return {
    fecha: `${value('year')}-${value('month')}-${value('day')}`,
  }
}

function parseAppointmentDate(fecha: string, hora: string) {
  const horaNormalizada = hora.length === 5 ? `${hora}:00` : hora

  return new Date(`${fecha}T${horaNormalizada}-05:00`)
}

function getMinutosParaCita(cita: CitaProxima, ahora: Date) {
  const fechaCita = parseAppointmentDate(cita.Fecha, cita.Hora)

  return Math.round((fechaCita.getTime() - ahora.getTime()) / 60_000)
}

function getRecordatorioPendiente(minutosParaCita: number) {
  return RECORDATORIOS_MINUTOS.find(
    (minutos) => Math.abs(minutosParaCita - minutos) <= VENTANA_MINUTOS
  )
}

function tieneAutomatizaciones(suscripcion?: SuscripcionNegocio) {
  const plan = String(suscripcion?.plan ?? '').toLowerCase()
  const estado = String(suscripcion?.estado ?? '').toLowerCase()
  const vence = suscripcion?.fecha_vencimiento
    ? new Date(suscripcion.fecha_vencimiento).getTime()
    : Date.now()

  return (
    ['pro', 'business', 'premium'].includes(plan) &&
    ['activa', 'activo', 'pagada', 'paid'].includes(estado) &&
    vence >= Date.now()
  )
}

async function yaFueEnviado({
  supabase,
  citaId,
  destinatario,
  minutosAntes,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  citaId: string
  destinatario: 'cliente' | 'negocio'
  minutosAntes: number
}) {
  const { data } = await supabase
    .from('whatsapp_recordatorios_envios')
    .select('id')
    .eq('cita_id', citaId)
    .eq('destinatario', destinatario)
    .eq('minutos_antes', minutosAntes)
    .maybeSingle()

  return Boolean(data)
}

async function registrarEnvio({
  supabase,
  citaId,
  destinatario,
  minutosAntes,
  respuesta,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  citaId: string
  destinatario: 'cliente' | 'negocio'
  minutosAntes: number
  respuesta: unknown
}) {
  await supabase.from('whatsapp_recordatorios_envios').insert([
    {
      cita_id: citaId,
      destinatario,
      minutos_antes: minutosAntes,
      respuesta,
    },
  ])
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
  const ahora = new Date()
  const { fecha } = getBogotaParts(ahora)

  const { data, error } = await supabase
    .from('Citas')
    .select(`
      ID,
      ID_Usuario,
      Fecha,
      Hora,
      Estado,
      Clientes:ID_Cliente (
        Nombre,
        Numero
      ),
      SERVICIOS:ID_Servicio (
        "Nombre del servicio"
      ),
      Empleados:ID_Empleado (
        Nombre,
        foto_url
      )
    `)
    .eq('Fecha', fecha)
    .in('Estado', ESTADOS_ACTIVOS)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const citas = ((data || []) as CitaProxima[])
    .map((cita) => ({
      cita,
      minutosParaCita: getMinutosParaCita(cita, ahora),
    }))
    .filter(({ minutosParaCita }) => getRecordatorioPendiente(minutosParaCita))

  const usuarioIds = [...new Set(citas.map(({ cita }) => cita.ID_Usuario))]
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

  for (const { cita, minutosParaCita } of citas) {
    const minutosAntes = getRecordatorioPendiente(minutosParaCita)
    const suscripcion = suscripcionesPorUsuario.get(cita.ID_Usuario)

    if (!minutosAntes) continue

    if (!tieneAutomatizaciones(suscripcion)) {
      resultados.push({
        citaId: cita.ID,
        minutosAntes,
        enviadoCliente: false,
        enviadoNegocio: false,
        error: 'El plan no incluye recordatorios automaticos.',
      })
      continue
    }

    const resultado = {
      citaId: cita.ID,
      minutosAntes,
      enviadoCliente: false,
      enviadoNegocio: false,
      errores: [] as string[],
    }

    try {
      const enviado = await yaFueEnviado({
        supabase,
        citaId: cita.ID,
        destinatario: 'cliente',
        minutosAntes,
      })

      if (!enviado) {
        const respuesta = await sendAppointmentReminder(cita)

        await registrarEnvio({
          supabase,
          citaId: cita.ID,
          destinatario: 'cliente',
          minutosAntes,
          respuesta,
        })
        resultado.enviadoCliente = true
      }
    } catch (sendError) {
      resultado.errores.push(
        sendError instanceof Error
          ? sendError.message
          : 'No se pudo enviar el recordatorio al cliente'
      )
    }

    try {
      const enviado = await yaFueEnviado({
        supabase,
        citaId: cita.ID,
        destinatario: 'negocio',
        minutosAntes,
      })

      if (!enviado) {
        const respuesta = await sendBusinessAppointmentReminder({
          to: suscripcion?.telefono ?? '',
          negocio: suscripcion?.nombre_negocio ?? 'tu negocio',
          cliente: cita.Clientes?.Nombre ?? 'cliente',
          fecha: cita.Fecha,
          hora: cita.Hora,
          servicio: cita.SERVICIOS?.['Nombre del servicio'] ?? 'servicio',
          empleado: cita.Empleados?.Nombre ?? 'equipo',
        })

        await registrarEnvio({
          supabase,
          citaId: cita.ID,
          destinatario: 'negocio',
          minutosAntes,
          respuesta,
        })
        resultado.enviadoNegocio = true
      }
    } catch (sendError) {
      resultado.errores.push(
        sendError instanceof Error
          ? sendError.message
          : 'No se pudo enviar el recordatorio al negocio'
      )
    }

    resultados.push(resultado)
  }

  return NextResponse.json({
    fecha,
    revisadas: citas.length,
    enviadosCliente: resultados.filter((resultado) => resultado.enviadoCliente).length,
    enviadosNegocio: resultados.filter((resultado) => resultado.enviadoNegocio).length,
    resultados,
  })
}
