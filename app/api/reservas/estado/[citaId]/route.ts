import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { construirDisponibilidad, horarioEstaDisponible } from '@/lib/agenda'

const ACCIONES = {
  confirmar: 'confirmada',
  cancelar: 'cancelada',
} as const

export async function GET(
  _request: Request,
  context: { params: Promise<{ citaId: string }> }
) {
  try {
    const { citaId } = await context.params
    const supabase = getSupabaseAdmin()
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
          Nombre
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
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No encontramos esta reserva.' },
        { status: 404 }
      )
    }

    const { data: citasEmpleado } = await supabase
      .from('Citas')
      .select('ID, Fecha, Hora, Estado, ID_Empleado')
      .eq('ID_Usuario', data.ID_Usuario)
      .eq('ID_Empleado', data.ID_Empleado)
      .neq('ID', citaId)
      .gte('Fecha', new Date().toISOString().slice(0, 10))
      .in('Estado', ['pendiente', 'confirmada'])

    return NextResponse.json({
      cita: data,
      disponibilidad: construirDisponibilidad({
        empleadoId: data.ID_Empleado,
        citas: citasEmpleado ?? [],
      }).slice(0, 36),
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar la reserva.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ citaId: string }> }
) {
  try {
    const { citaId } = await context.params
    const body = await request.json()
    const accion = String(body.accion ?? '') as keyof typeof ACCIONES
    const estado = ACCIONES[accion]

    if (
      !estado &&
      String(body.accion ?? '') !== 'reprogramar' &&
      String(body.accion ?? '') !== 'resenar'
    ) {
      return NextResponse.json(
        { error: 'Accion no valida.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (String(body.accion ?? '') === 'resenar') {
      const calificacion = Number(body.calificacion ?? 0)
      const comentario = String(body.comentario ?? '').trim().slice(0, 300)
      const { data: citaActual, error: citaActualError } = await supabase
        .from('Citas')
        .select(`
          ID,
          ID_Usuario,
          ID_Empleado,
          Estado,
          Clientes:ID_Cliente (
            Nombre
          )
        `)
        .eq('ID', citaId)
        .maybeSingle()

      if (citaActualError) {
        return NextResponse.json({ error: citaActualError.message }, { status: 500 })
      }

      if (!citaActual || calificacion < 1 || calificacion > 5) {
        return NextResponse.json(
          { error: 'Selecciona una calificacion valida.' },
          { status: 400 }
        )
      }

      if (citaActual.Estado !== 'completada') {
        return NextResponse.json(
          { error: 'Solo puedes calificar una cita completada.' },
          { status: 409 }
        )
      }

      const cliente = Array.isArray(citaActual.Clientes)
        ? citaActual.Clientes[0]
        : citaActual.Clientes
      const resena = {
        negocio_id: citaActual.ID_Usuario,
        empleado_id: citaActual.ID_Empleado,
        cita_id: citaId,
        cliente_nombre: cliente?.Nombre ?? 'Cliente',
        calificacion,
        comentario,
        visible: true,
      }
      const { data: existente } = await supabase
        .from('empleado_resenas')
        .select('id')
        .eq('cita_id', citaId)
        .maybeSingle()
      const { error } = existente?.id
        ? await supabase
            .from('empleado_resenas')
            .update(resena)
            .eq('id', existente.id)
        : await supabase.from('empleado_resenas').insert([resena])

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        mensaje: 'Gracias por calificar tu experiencia.',
      })
    }

    if (String(body.accion ?? '') === 'reprogramar') {
      const fecha = String(body.fecha ?? '').trim()
      const hora = String(body.hora ?? '').trim()
      const { data: citaActual, error: citaActualError } = await supabase
        .from('Citas')
        .select('ID, ID_Usuario, ID_Empleado')
        .eq('ID', citaId)
        .maybeSingle()

      if (citaActualError) {
        return NextResponse.json({ error: citaActualError.message }, { status: 500 })
      }

      if (!citaActual || !fecha || !hora) {
        return NextResponse.json(
          { error: 'Selecciona un horario valido para reprogramar.' },
          { status: 400 }
        )
      }

      const { data: citasEmpleado } = await supabase
        .from('Citas')
        .select('ID, Fecha, Hora, Estado, ID_Empleado')
        .eq('ID_Usuario', citaActual.ID_Usuario)
        .eq('ID_Empleado', citaActual.ID_Empleado)
        .neq('ID', citaId)
        .gte('Fecha', new Date().toISOString().slice(0, 10))
        .in('Estado', ['pendiente', 'confirmada'])

      if (
        !horarioEstaDisponible({
          empleadoId: citaActual.ID_Empleado,
          fecha,
          hora,
          citas: citasEmpleado ?? [],
        })
      ) {
        return NextResponse.json(
          { error: 'Ese horario no esta disponible.' },
          { status: 409 }
        )
      }

      const { data, error } = await supabase
        .from('Citas')
        .update({ Fecha: fecha, Hora: hora, Estado: 'pendiente' })
        .eq('ID', citaId)
        .select(`
          ID,
          Fecha,
          Hora,
          Estado,
          Clientes:ID_Cliente (
            Nombre
          ),
          SERVICIOS:ID_Servicio (
            "Nombre del servicio"
          )
        `)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        mensaje: 'Tu cita fue reprogramada correctamente.',
        cita: data,
      })
    }

    const { data, error } = await supabase
      .from('Citas')
      .update({ Estado: estado })
      .eq('ID', citaId)
      .select(`
        ID,
        Fecha,
        Hora,
        Estado,
        Clientes:ID_Cliente (
          Nombre
        ),
        SERVICIOS:ID_Servicio (
          "Nombre del servicio"
        )
      `)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No encontramos esta reserva.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      mensaje:
        estado === 'confirmada'
          ? 'Tu cita fue confirmada con exito.'
          : 'Tu cita fue cancelada con exito.',
      cita: data,
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar la reserva.' },
      { status: 500 }
    )
  }
}
