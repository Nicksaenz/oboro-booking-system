import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  CitaRecordatorio,
  sendAppointmentReminder,
  WhatsAppCredentials,
} from '@/lib/whatsapp'

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
        Nombre,
        Numero
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

  const citas = (data || []) as CitaRecordatorio[]
  const resultados = []
  const credencialesPorUsuario = new Map<string, WhatsAppCredentials | null>()

  async function obtenerCredenciales(usuarioId?: string) {
    if (!usuarioId) return null

    if (credencialesPorUsuario.has(usuarioId)) {
      return credencialesPorUsuario.get(usuarioId) ?? null
    }

    const { data: configuracion } = await supabase
      .from('whatsapp_configuraciones')
      .select('phone_number_id, access_token, template_recordatorio, template_language, activo')
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    const credentials = configuracion?.activo
      ? {
        phoneNumberId: configuracion.phone_number_id,
        accessToken: configuracion.access_token,
        templateName: configuracion.template_recordatorio,
        languageCode: configuracion.template_language,
      }
      : null

    credencialesPorUsuario.set(usuarioId, credentials)

    return credentials
  }

  for (const cita of citas) {
    try {
      const credentials = await obtenerCredenciales(cita.ID_Usuario)

      if (!credentials) {
        throw new Error('El negocio no tiene WhatsApp Business conectado')
      }

      const respuesta = await sendAppointmentReminder(cita, credentials)

      resultados.push({
        citaId: cita.ID,
        enviado: true,
        respuesta,
      })
    } catch (sendError) {
      resultados.push({
        citaId: cita.ID,
        enviado: false,
        error:
          sendError instanceof Error
            ? sendError.message
            : 'No se pudo enviar el recordatorio',
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
