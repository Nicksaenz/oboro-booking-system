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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resenaId: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No hay una sesion activa' }, { status: 401 })
    }

    const admin = await obtenerAdmin(token)

    if (!admin) {
      return NextResponse.json({ error: 'Solo el administrador puede remover resenas.' }, { status: 403 })
    }

    const { resenaId } = await context.params
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('empleado_resenas')
      .delete()
      .eq('id', resenaId)
      .eq('negocio_id', admin.negocioId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mensaje: 'Resena removida.' })
  } catch {
    return NextResponse.json({ error: 'No se pudo remover la resena.' }, { status: 500 })
  }
}
