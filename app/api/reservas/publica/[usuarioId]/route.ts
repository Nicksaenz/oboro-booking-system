import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const ESTADOS_VALIDOS = ['trial', 'activa', 'activo', 'pagada', 'paid']
const PLANES_CON_AGENDA_PUBLICA = ['pro', 'business', 'premium']

function limpiarTexto(valor: unknown, respaldo = '') {
  return typeof valor === 'string' ? valor.trim() : respaldo
}

function suscripcionVigente(suscripcion: any) {
  const estado = String(suscripcion?.estado ?? '').toLowerCase()
  const vence = suscripcion?.fecha_vencimiento
    ? new Date(suscripcion.fecha_vencimiento).getTime()
    : Date.now()

  return ESTADOS_VALIDOS.includes(estado) && vence >= Date.now()
}

function tieneAgendaPublica(suscripcion: any) {
  return PLANES_CON_AGENDA_PUBLICA.includes(
    String(suscripcion?.plan ?? '').toLowerCase()
  )
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const { usuarioId } = await context.params
    const supabase = getSupabaseAdmin()

    const { data: suscripcion, error: suscripcionError } = await supabase
      .from('suscripciones')
      .select('nombre_negocio, estado, fecha_vencimiento, plan')
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    if (suscripcionError) {
      return NextResponse.json({ error: suscripcionError.message }, { status: 500 })
    }

    if (!suscripcionVigente(suscripcion) || !tieneAgendaPublica(suscripcion)) {
      return NextResponse.json(
        { error: 'Este negocio no tiene reservas publicas activas.' },
        { status: 404 }
      )
    }

    const [{ data: servicios }, { data: empleados }] = await Promise.all([
      supabase
        .from('SERVICIOS')
        .select('ID, "Nombre del servicio", "Precio del servicio", "DuraciÃ³n en minutos", ACTIVO')
        .eq('ID DE USUARIO', usuarioId)
        .eq('ACTIVO', true)
        .order('Nombre del servicio', { ascending: true }),
      supabase
        .from('Empleados')
        .select('ID, Nombre, Cargo, Activo')
        .eq('ID de Usuario', usuarioId)
        .eq('Activo', true)
        .order('Nombre', { ascending: true }),
    ])

    return NextResponse.json({
      negocio: {
        nombre: suscripcion?.nombre_negocio ?? 'Oboro Booking',
      },
      servicios: servicios ?? [],
      empleados: empleados ?? [],
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar la agenda publica.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const { usuarioId } = await context.params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const nombre = limpiarTexto(body.nombre)
    const numero = limpiarTexto(body.numero)
    const email = limpiarTexto(body.email)
    const servicioId = limpiarTexto(body.servicioId)
    const empleadoId = limpiarTexto(body.empleadoId)
    const fecha = limpiarTexto(body.fecha)
    const hora = limpiarTexto(body.hora)

    if (!nombre || !numero || !servicioId || !empleadoId || !fecha || !hora) {
      return NextResponse.json(
        { error: 'Faltan datos para crear la reserva.' },
        { status: 400 }
      )
    }

    const { data: suscripcion } = await supabase
      .from('suscripciones')
      .select('estado, fecha_vencimiento, plan')
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    if (!suscripcionVigente(suscripcion) || !tieneAgendaPublica(suscripcion)) {
      return NextResponse.json(
        { error: 'Este negocio no tiene reservas publicas activas.' },
        { status: 403 }
      )
    }

    const { data: citaExistente } = await supabase
      .from('Citas')
      .select('ID')
      .eq('ID_Usuario', usuarioId)
      .eq('Fecha', fecha)
      .eq('Hora', hora)
      .eq('ID_Empleado', empleadoId)
      .neq('Estado', 'cancelada')
      .maybeSingle()

    if (citaExistente) {
      return NextResponse.json(
        { error: 'Ese horario ya fue reservado. Elige otro.' },
        { status: 409 }
      )
    }

    const { data: clienteExistente } = await supabase
      .from('Clientes')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('Numero', numero)
      .maybeSingle()

    let clienteId = clienteExistente?.id

    if (!clienteId) {
      const { data: clienteNuevo, error: clienteError } = await supabase
        .from('Clientes')
        .insert([
          {
            Nombre: nombre,
            Numero: numero,
            Email: email,
            Notas: 'Cliente creado desde agenda publica.',
            usuario_id: usuarioId,
          },
        ])
        .select('id')
        .single()

      if (clienteError) {
        return NextResponse.json({ error: clienteError.message }, { status: 500 })
      }

      clienteId = clienteNuevo.id
    }

    const { data: cita, error: citaError } = await supabase
      .from('Citas')
      .insert([
        {
          ID_Cliente: clienteId,
          ID_Servicio: servicioId,
          ID_Empleado: empleadoId,
          Fecha: fecha,
          Hora: hora,
          Estado: 'pendiente',
          ID_Usuario: usuarioId,
        },
      ])
      .select('ID')
      .single()

    if (citaError) {
      return NextResponse.json({ error: citaError.message }, { status: 500 })
    }

    return NextResponse.json({
      mensaje: 'Reserva creada correctamente.',
      citaId: cita.ID,
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo crear la reserva.' },
      { status: 500 }
    )
  }
}
