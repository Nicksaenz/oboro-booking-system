import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'
import { sendAppointmentReminder } from '@/lib/whatsapp'

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'No hay una sesion activa' },
        { status: 401 }
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
    const { data: suscripcion, error } = await supabase
      .from('suscripciones')
      .select('nombre_negocio, telefono')
      .eq('usuario_id', userData.user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!suscripcion?.telefono || suscripcion.telefono === 'Pendiente') {
      return NextResponse.json(
        { error: 'Tu cuenta no tiene un WhatsApp guardado para enviar la prueba' },
        { status: 400 }
      )
    }

    const respuesta = await sendAppointmentReminder({
      ID: 'prueba',
      Fecha: new Date().toISOString().slice(0, 10),
      Hora: '08:00',
      Estado: 'prueba',
      Clientes: {
        Nombre: suscripcion.nombre_negocio || 'Oboro Booking',
        Numero: suscripcion.telefono,
      },
      SERVICIOS: {
        'Nombre del servicio': 'Recordatorio de prueba',
      },
      Empleados: {
        Nombre: 'Oboro Booking',
      },
    })

    return NextResponse.json({
      enviado: true,
      respuesta,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo enviar el WhatsApp de prueba'

    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
