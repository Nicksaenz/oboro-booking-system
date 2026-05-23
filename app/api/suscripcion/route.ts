import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

const PLANES_PERMITIDOS = ['trial', 'basico', 'pro', 'business', 'premium'] as const
type Plan = (typeof PLANES_PERMITIDOS)[number]

function limpiarTexto(valor: unknown, respaldo = '') {
  return typeof valor === 'string' ? valor.trim() : respaldo
}

export async function GET(request: Request) {
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
    const supabaseAdmin = getSupabaseAdmin()

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Sesion invalida o expirada' },
        { status: 401 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('suscripciones')
      .select('estado, fecha_vencimiento, plan, nombre_negocio, telefono')
      .eq('usuario_id', userData.user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ suscripcion: data })
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'No hay una sesion activa para crear la suscripcion' },
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
    const supabaseAdmin = getSupabaseAdmin()

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Sesion invalida o expirada' },
        { status: 401 }
      )
    }

    const usuarioId = userData.user.id
    const email = limpiarTexto(body.email, userData.user.email ?? '').toLowerCase()
    const nombreNegocio = limpiarTexto(body.nombre_negocio, 'Nuevo negocio')
    const telefono = limpiarTexto(body.telefono, 'Pendiente')
    const planSolicitado = limpiarTexto(body.plan, 'trial') as Plan

    if (!email || !PLANES_PERMITIDOS.includes(planSolicitado)) {
      return NextResponse.json(
        { error: 'Datos de suscripcion invalidos' },
        { status: 400 }
      )
    }

    const { data: suscripcionExistente, error: consultaError } = await supabaseAdmin
      .from('suscripciones')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()

    if (consultaError) {
      return NextResponse.json(
        { error: consultaError.message },
        { status: 500 }
      )
    }

    if (suscripcionExistente) {
      return NextResponse.json({
        mensaje: 'La suscripcion ya existia',
        suscripcion: suscripcionExistente,
      })
    }

    const fechaInicio = new Date()
    const fechaVencimiento = new Date(fechaInicio)
    fechaVencimiento.setDate(fechaInicio.getDate() + 30)

    const { data, error } = await supabaseAdmin
      .from('suscripciones')
      .insert([
        {
          usuario_id: usuarioId,
          nombre_negocio: nombreNegocio,
          email,
          telefono,
          plan: planSolicitado,
          estado: 'trial',
          fecha_inicio: fechaInicio.toISOString(),
          fecha_vencimiento: fechaVencimiento.toISOString(),
          whatsapp_enviado: false,
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      mensaje: 'Suscripcion creada correctamente',
      suscripcion: data,
    })
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
