import { supabase } from '@/lib/supabase'

export type RolEquipo = 'admin' | 'operativo' | 'lectura'

export type ContextoEquipo = {
  usuarioId: string
  negocioId: string
  empleadoId?: string | null
  email: string
  rol: RolEquipo
  esAdmin: boolean
  puedeOperar: boolean
  soloLectura: boolean
}

type AccesoEquipo = {
  id: string
  negocio_id: string
  usuario_id: string | null
  empleado_id?: string | null
  email: string
  rol: RolEquipo
  activo: boolean
}

export async function obtenerContextoEquipo(): Promise<ContextoEquipo | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user

  if (!user?.id || !user.email) {
    return null
  }

  const { data: accesos } = await supabase
    .from('equipo_accesos')
    .select('*')
    .eq('activo', true)
    .or(`usuario_id.eq.${user.id},email.eq.${user.email.toLowerCase()}`)
    .limit(1)

  const acceso = (accesos?.[0] as AccesoEquipo | undefined) ?? null

  if (acceso && !acceso.usuario_id) {
    await supabase
      .from('equipo_accesos')
      .update({ usuario_id: user.id })
      .eq('id', acceso.id)
  }

  const rol = acceso?.rol ?? 'admin'
  const negocioId = acceso?.negocio_id ?? user.id

  return {
    usuarioId: user.id,
    negocioId,
    empleadoId: acceso?.empleado_id ?? null,
    email: user.email,
    rol,
    esAdmin: rol === 'admin',
    puedeOperar: rol === 'admin' || rol === 'operativo',
    soloLectura: rol === 'lectura',
  }
}

export function mensajePermiso(accion = 'hacer cambios') {
  return `Tu acceso es de solo lectura. No puedes ${accion}. Pide al administrador del negocio que lo haga.`
}
