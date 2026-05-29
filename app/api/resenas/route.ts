import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

async function obtenerAdmin(token: string) {
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
    .select('negocio_id, rol, activo')
    .eq('activo', true)
    .or(`usuario_id.eq.${userData.user.id},email.eq.${userData.user.email.toLowerCase()}`)
    .limit(1)
  const acceso = accesos?.[0]
  const rol = acceso?.rol ?? 'admin'

  if (rol !== 'admin') return null

  return {
    negocioId: acceso?.negocio_id ?? userData.user.id,
  }
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No hay una sesion activa' }, { status: 401 })
    }

    const admin = await obtenerAdmin(token)

    if (!admin) {
      return NextResponse.json({ error: 'Solo el administrador puede ver resenas.' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('empleado_resenas')
      .select('id, empleado_id, cliente_nombre, calificacion, comentario, visible, created_at')
      .eq('negocio_id', admin.negocioId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ resenas: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar las resenas.' }, { status: 500 })
  }
}
