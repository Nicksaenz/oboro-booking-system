import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'
import { sendReviewRequest } from '@/lib/whatsapp'

async function obtenerAcceso(token: string) {
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
  const supabase = getSupabaseAdmin()
  const { data: userData, error } = await supabaseAuth.auth.getUser()

  if (error || !userData.user?.id || !userData.user.email) return null

  const { data: accesos } = await supabase
    .from('equipo_accesos')
    .select('negocio_id, empleado_id, rol, activo')
    .eq('activo', true)
    .or(`usuario_id.eq.${userData.user.id},email.eq.${userData.user.email.toLowerCase()}`)
    .limit(1)
  const acceso = accesos?.[0]

  return {
    usuarioId: userData.user.id,
    negocioId: acceso?.negocio_id ?? userData.user.id,
    empleadoId: acceso?.empleado_id ?? null,
    rol: acceso?.rol ?? 'admin',
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No hay una sesion activa' }, { status: 401 })
    }

    const body = await request.json()
    const citaId = String(body.citaId ?? '')

    if (!citaId) {
      return NextResponse.json({ error: 'Selecciona una cita valida' }, { status: 400 })
    }

    const acceso = await obtenerAcceso(token)

    if (!acceso || !['admin', 'operativo'].includes(acceso.rol)) {
      return NextResponse.json({ error: 'No tienes permiso para completar citas.' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const { data: cita, error } = await supabase
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
          Nombre
        )
      `)
      .eq('ID', citaId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!cita || cita.ID_Usuario !== acceso.negocioId) {
      return NextResponse.json({ error: 'No encontramos esta cita.' }, { status: 404 })
    }

    if (acceso.rol !== 'admin' && cita.ID_Empleado !== acceso.empleadoId) {
      return NextResponse.json(
        { error: 'Solo el empleado asignado puede completar esta cita.' },
        { status: 403 }
      )
    }

    const cliente = Array.isArray(cita.Clientes) ? cita.Clientes[0] : cita.Clientes
    const servicio = Array.isArray(cita.SERVICIOS) ? cita.SERVICIOS[0] : cita.SERVICIOS
    const empleado = Array.isArray(cita.Empleados) ? cita.Empleados[0] : cita.Empleados
    const origin = new URL(request.url).origin
    const reviewUrl = `${origin}/reserva/${cita.ID}`
    const respuesta = await sendReviewRequest({
      to: cliente?.Numero ?? '',
      cliente: cliente?.Nombre ?? 'cliente',
      servicio: servicio?.['Nombre del servicio'] ?? 'servicio',
      empleado: empleado?.Nombre ?? 'equipo',
      reviewUrl,
    })

    return NextResponse.json({
      enviado: true,
      reviewUrl,
      respuesta,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo enviar la solicitud de resena'

    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
