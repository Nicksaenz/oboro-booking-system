import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'
import { isValidFinancePin } from '@/lib/finanzasPin'

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

type UsuarioAutenticado = {
  id: string
  email?: string
}

async function obtenerContextoServidor(user: UsuarioAutenticado) {
  const supabase = getSupabaseAdmin()
  const email = user.email?.toLowerCase() ?? ''
  const { data } = await supabase
    .from('equipo_accesos')
    .select('negocio_id, rol, activo')
    .eq('activo', true)
    .or(`usuario_id.eq.${user.id},email.eq.${email}`)
    .limit(1)

  const acceso = data?.[0]

  return {
    negocioId: acceso?.negocio_id ?? user.id,
    rol: (acceso?.rol ?? 'admin') as 'admin' | 'operativo' | 'lectura',
  }
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

function puedeEditarFinanzas(request: Request) {
  const pinConfigured =
    process.env.FINANZAS_ADMIN_SECRET || process.env.FINANZAS_ADMIN_PIN

  if (!pinConfigured) return true

  return isValidFinancePin(request.headers.get('x-finanzas-admin-pin'))
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

    const contexto = await obtenerContextoServidor(user)

    if (contexto.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Finanzas solo esta disponible para el administrador.' },
        { status: 403 }
      )
    }

    if (!(await tienePlanBusiness(contexto.negocioId))) {
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
          .eq('ID_Usuario', contexto.negocioId)
          .gte('Fecha', rango.inicio)
          .lt('Fecha', rango.fin)
          .neq('Estado', 'cancelada')
          .order('Fecha', { ascending: true }),
        supabase
          .from('gastos')
          .select('id, fecha, categoria, descripcion, monto, created_at')
          .eq('usuario_id', contexto.negocioId)
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

    const contexto = await obtenerContextoServidor(user)

    if (contexto.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el administrador puede editar finanzas.' },
        { status: 403 }
      )
    }

    if (!(await tienePlanBusiness(contexto.negocioId))) {
      return NextResponse.json(
        { error: 'Finanzas esta disponible en el plan Business.' },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (!puedeEditarFinanzas(request)) {
      return NextResponse.json(
        { error: 'Solo el administrador puede editar finanzas.' },
        { status: 403 }
      )
    }

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
          usuario_id: contexto.negocioId,
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

    const contexto = await obtenerContextoServidor(user)

    if (contexto.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el administrador puede editar finanzas.' },
        { status: 403 }
      )
    }

    if (!(await tienePlanBusiness(contexto.negocioId))) {
      return NextResponse.json(
        { error: 'Finanzas esta disponible en el plan Business.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)

    if (!puedeEditarFinanzas(request)) {
      return NextResponse.json(
        { error: 'Solo el administrador puede editar finanzas.' },
        { status: 403 }
      )
    }

    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Falta el gasto.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id)
      .eq('usuario_id', contexto.negocioId)

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
