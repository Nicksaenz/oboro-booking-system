import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { CitaRecordatorio, sendAppointmentReminder } from '@/lib/whatsapp'

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

  for (const cita of citas) {
    try {
      const respuesta = await sendAppointmentReminder(cita)

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
