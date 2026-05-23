import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const ACCIONES = {
  confirmar: 'confirmada',
  cancelar: 'cancelada',
} as const

export async function POST(
  request: Request,
  context: { params: Promise<{ citaId: string }> }
) {
  try {
    const { citaId } = await context.params
    const body = await request.json()
    const accion = String(body.accion ?? '') as keyof typeof ACCIONES
    const estado = ACCIONES[accion]

    if (!estado) {
      return NextResponse.json(
        { error: 'Accion no valida.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
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
