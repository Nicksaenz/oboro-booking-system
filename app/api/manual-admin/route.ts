import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'
import { obtenerPlanOboro } from '@/lib/planes'

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

async function obtenerContextoAdmin(user: { id: string; email?: string }) {
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

export async function GET(request: Request) {
  try {
    const user = await obtenerUsuario(request)

    if (!user) {
      return NextResponse.json({ error: 'Sesion invalida.' }, { status: 401 })
    }

    const contexto = await obtenerContextoAdmin(user)

    if (contexto.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Este manual solo lo puede ver el administrador.' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: suscripcion } = await supabase
      .from('suscripciones')
      .select('plan, nombre_negocio, telefono, fecha_vencimiento')
      .eq('usuario_id', contexto.negocioId)
      .maybeSingle()

    const plan = obtenerPlanOboro(suscripcion?.plan)

    return NextResponse.json({
      negocio: suscripcion?.nombre_negocio ?? 'Tu negocio',
      telefono: suscripcion?.telefono ?? '',
      plan,
      fecha_vencimiento: suscripcion?.fecha_vencimiento ?? null,
      clave_finanzas:
        process.env.FINANZAS_ADMIN_PIN ?? 'No configurada en Vercel',
      app_url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://booking.oborolab.com',
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar el manual admin.' },
      { status: 500 }
    )
  }
}
