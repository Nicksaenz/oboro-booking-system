import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

function limpiarTexto(valor: unknown, respaldo = '') {
  return typeof valor === 'string' ? valor.trim() : respaldo
}

function obtenerRangoMes(mes: string | null) {
  const ahora = new Date()
  const mesSeguro = mes && /^\d{4}-\d{2}$/.test(mes)
    ? mes
    : `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  const inicio = `${mesSeguro}-01`
  const finDate = new Date(`${inicio}T00:00:00`)
  finDate.setMonth(finDate.getMonth() + 1)
  const fin = finDate.toISOString().slice(0, 10)

  return { mes: mesSeguro, inicio, fin }
}

async function tienePlanBusiness(usuarioId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('suscripciones')
    .select('plan, estado, fecha_vencimiento')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (error || !data) return false

  const plan = String(data.plan ?? '').toLowerCase()
  const estado = String(data.estado ?? '').toLowerCase()
  const vence = data.fecha_vencimiento
    ? new Date(data.fecha_vencimiento).getTime()
    : Date.now()

  return (
    ['business', 'premium'].includes(plan) &&
    ['trial', 'activa', 'activo', 'pagada', 'paid'].includes(estado) &&
    vence >= Date.now()
  )
}

async function obtenerUsuario(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return null

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
  const { data, error } = await supabaseAuth.auth.getUser()

  if (error || !data.user) return null

  return data.user
}

export async function GET(request: Request) {
  try {
    const user = await obtenerUsuario(request)

    if (!user) {
      return NextResponse.json({ error: 'Sesion invalida.' }, { status: 401 })
    }

    if (!(await tienePlanBusiness(user.id))) {
      return NextResponse.json(
        { error: 'Finanzas esta disponible en el plan Business.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const rango = obtenerRangoMes(searchParams.get('mes'))
    const supabase = getSupabaseAdmin()

    const [{ data: citas, error: citasError }, { data: gastos, error: gastosError }] =
      await Promise.all([
        supabase
          .from('Citas')
          .select(`
            ID,
            Fecha,
            Hora,
            Estado,
            Clientes:ID_Cliente (
              Nombre
            ),
            SERVICIOS:ID_Servicio (
              "Nombre del servicio",
              "Precio del servicio"
            ),
            Empleados:ID_Empleado (
              ID,
              Nombre
            )
          `)
          .eq('ID_Usuario', user.id)
          .gte('Fecha', rango.inicio)
          .lt('Fecha', rango.fin)
          .neq('Estado', 'cancelada')
          .order('Fecha', { ascending: true }),
        supabase
          .from('gastos')
          .select('id, fecha, categoria, descripcion, monto, created_at')
          .eq('usuario_id', user.id)
          .gte('fecha', rango.inicio)
          .lt('fecha', rango.fin)
          .order('fecha', { ascending: false }),
      ])

    if (citasError) {
      return NextResponse.json({ error: citasError.message }, { status: 500 })
    }

    if (gastosError) {
      return NextResponse.json({
        mes: rango.mes,
        citas: citas ?? [],
        gastos: [],
        gastosPendientes: true,
      })
    }

    return NextResponse.json({
      mes: rango.mes,
      citas: citas ?? [],
      gastos: gastos ?? [],
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar finanzas.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await obtenerUsuario(request)

    if (!user) {
      return NextResponse.json({ error: 'Sesion invalida.' }, { status: 401 })
    }

    if (!(await tienePlanBusiness(user.id))) {
      return NextResponse.json(
        { error: 'Finanzas esta disponible en el plan Business.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const fecha = limpiarTexto(body.fecha)
    const categoria = limpiarTexto(body.categoria, 'General')
    const descripcion = limpiarTexto(body.descripcion)
    const monto = Number(body.monto)

    if (!fecha || !descripcion || !Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { error: 'Completa fecha, descripcion y valor del gasto.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('gastos')
      .insert([
        {
          usuario_id: user.id,
          fecha,
          categoria,
          descripcion,
          monto,
        },
      ])
      .select('id, fecha, categoria, descripcion, monto, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ gasto: data })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo guardar el gasto.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await obtenerUsuario(request)

    if (!user) {
      return NextResponse.json({ error: 'Sesion invalida.' }, { status: 401 })
    }

    if (!(await tienePlanBusiness(user.id))) {
      return NextResponse.json(
        { error: 'Finanzas esta disponible en el plan Business.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Falta el gasto.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id)
      .eq('usuario_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo eliminar el gasto.' },
      { status: 500 }
    )
  }
}
