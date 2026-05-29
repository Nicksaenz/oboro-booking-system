import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { construirDisponibilidad, horarioEstaDisponible } from '@/lib/agenda'

const ESTADOS_VALIDOS = ['activa', 'activo', 'pagada', 'paid']
const PLANES_CON_AGENDA_PUBLICA = ['trial', 'basico', 'pro', 'business', 'premium']

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
      .select('nombre_negocio, foto_negocio_url, estado, fecha_vencimiento, plan')
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

    const [{ data: servicios }, { data: empleados }, { data: citas }] = await Promise.all([
      supabase
        .from('SERVICIOS')
        .select('ID, "Nombre del servicio", "Precio del servicio", ACTIVO')
        .eq('ID DE USUARIO', usuarioId)
        .eq('ACTIVO', true)
        .order('Nombre del servicio', { ascending: true }),
      supabase
        .from('Empleados')
        .select('ID, Nombre, Cargo, Activo, foto_url')
        .eq('ID de Usuario', usuarioId)
        .eq('Activo', true)
        .order('Nombre', { ascending: true }),
      supabase
        .from('Citas')
        .select('ID, Fecha, Hora, Estado, ID_Empleado')
        .eq('ID_Usuario', usuarioId)
        .gte('Fecha', new Date().toISOString().slice(0, 10))
        .in('Estado', ['pendiente', 'confirmada']),
    ])
    const { data: resenas } = await supabase
      .from('empleado_resenas')
      .select('empleado_id, cliente_nombre, calificacion, comentario, created_at')
      .eq('negocio_id', usuarioId)
      .eq('visible', true)
      .order('created_at', { ascending: false })

    const resenasPorEmpleado = new Map<
      string,
      {
        total: number
        cantidad: number
        comentarios: {
          cliente_nombre: string
          calificacion: number
          comentario: string
          created_at: string
        }[]
      }
    >()

    for (const resena of resenas ?? []) {
      const actual = resenasPorEmpleado.get(resena.empleado_id) ?? {
        total: 0,
        cantidad: 0,
        comentarios: [],
      }
      const comentario = String(resena.comentario ?? '').trim()

      resenasPorEmpleado.set(resena.empleado_id, {
        total: actual.total + Number(resena.calificacion ?? 0),
        cantidad: actual.cantidad + 1,
        comentarios: comentario
          ? [
              ...actual.comentarios,
              {
                cliente_nombre: resena.cliente_nombre ?? 'Cliente',
                calificacion: Number(resena.calificacion ?? 0),
                comentario,
                created_at: resena.created_at,
              },
            ].slice(0, 3)
          : actual.comentarios,
      })
    }

    const empleadosConPerfil = (empleados ?? []).map((empleado) => {
      const resumen = resenasPorEmpleado.get(empleado.ID)
      const rating = resumen?.cantidad
        ? Number((resumen.total / resumen.cantidad).toFixed(1))
        : null

      return {
        ...empleado,
        rating,
        resenas: resumen?.cantidad ?? 0,
        comentarios: resumen?.comentarios ?? [],
        disponibilidad: construirDisponibilidad({
          empleadoId: empleado.ID,
          citas: citas ?? [],
        }).slice(0, 36),
      }
    })

    return NextResponse.json({
      negocio: {
        nombre: suscripcion?.nombre_negocio ?? 'Oboro Booking',
        foto_url: suscripcion?.foto_negocio_url ?? null,
      },
      servicios: servicios ?? [],
      empleados: empleadosConPerfil,
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

    const { data: citasEmpleado } = await supabase
      .from('Citas')
      .select('ID, Fecha, Hora, Estado, ID_Empleado')
      .eq('ID_Usuario', usuarioId)
      .eq('ID_Empleado', empleadoId)
      .gte('Fecha', new Date().toISOString().slice(0, 10))
      .in('Estado', ['pendiente', 'confirmada'])

    if (
      !horarioEstaDisponible({
        empleadoId,
        fecha,
        hora,
        citas: citasEmpleado ?? [],
      })
    ) {
      return NextResponse.json(
        { error: 'Ese horario no esta disponible. Elige otro.' },
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
