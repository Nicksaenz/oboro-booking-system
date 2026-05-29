import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'
import { CitaRecordatorio, sendAppointmentReminder } from '@/lib/whatsapp'

async function obtenerAcceso({
  supabase,
  usuarioId,
  email,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  usuarioId: string
  email?: string
}) {
  const correo = email?.toLowerCase() ?? ''
  const { data } = await supabase
    .from('equipo_accesos')
    .select('negocio_id, empleado_id, rol, activo')
    .eq('activo', true)
    .or(`usuario_id.eq.${usuarioId},email.eq.${correo}`)
    .limit(1)
  const acceso = data?.[0]

  return {
    negocioId: acceso?.negocio_id ?? usuarioId,
    empleadoId: acceso?.empleado_id ?? null,
    rol: acceso?.rol ?? 'admin',
    puedeOperar: ['admin', 'operativo'].includes(acceso?.rol ?? 'admin'),
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'No hay una sesion activa' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const citaId = String(body.citaId ?? '')

    if (!citaId) {
      return NextResponse.json(
        { error: 'Selecciona una cita valida' },
        { status: 400 }
      )
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Sesion invalida o expirada' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()
    const acceso = await obtenerAcceso({
      supabase,
      usuarioId: userData.user.id,
      email: userData.user.email,
    })

    if (!acceso.puedeOperar) {
      return NextResponse.json(
        { error: 'Tu acceso es de solo lectura.' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('Citas')
      .select(`
        ID,
        ID_Usuario,
        ID_Empleado,
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
      .eq('ID', citaId)
      .eq('ID_Usuario', acceso.negocioId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No encontramos esa cita en tu cuenta' },
        { status: 404 }
      )
    }

    if (acceso.rol !== 'admin' && data.ID_Empleado !== acceso.empleadoId) {
      return NextResponse.json(
        { error: 'Solo puedes recordar citas asignadas a tu empleado.' },
        { status: 403 }
      )
    }

    const respuesta = await sendAppointmentReminder(
      data as CitaRecordatorio
    )

    return NextResponse.json({
      enviado: true,
      citaId,
      respuesta,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo enviar el recordatorio'

    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
