import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'
import { CitaRecordatorio, sendAppointmentReminder } from '@/lib/whatsapp'

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
      .eq('ID', citaId)
      .eq('ID_Usuario', userData.user.id)
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
