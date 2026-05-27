import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

const PLANES_PERMITIDOS = ['trial', 'basico', 'pro', 'business', 'premium'] as const
const ESTADOS_ACTIVOS = ['activa', 'activo', 'pagada', 'paid']
type Plan = (typeof PLANES_PERMITIDOS)[number]

function limpiarTexto(valor: unknown, respaldo = '') {
  return typeof valor === 'string' ? valor.trim() : respaldo
}

function limpiarFotoNegocio(valor: unknown) {
  if (typeof valor !== 'string') return ''

  const foto = valor.trim()
  if (!foto) return ''
  if (!foto.startsWith('data:image/')) return ''
  if (foto.length > 750_000) return ''

  return foto
}

function columnaFotoNoExiste(error?: { message?: string } | null) {
  return String(error?.message ?? '')
    .toLowerCase()
    .includes('foto_negocio_url')
}

function suscripcionActiva(suscripcion?: { estado?: string | null; fecha_vencimiento?: string | null } | null) {
  const estado = String(suscripcion?.estado ?? '').toLowerCase()
  const vence = suscripcion?.fecha_vencimiento
    ? new Date(suscripcion.fecha_vencimiento).getTime()
    : 0

  return ESTADOS_ACTIVOS.includes(estado) && vence >= Date.now()
}

async function obtenerContextoSuscripcion(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  usuarioId: string,
  email?: string
) {
  const correo = email?.toLowerCase() ?? ''
  const { data } = await supabaseAdmin
    .from('equipo_accesos')
    .select('negocio_id, rol, activo')
    .eq('activo', true)
    .or(`usuario_id.eq.${usuarioId},email.eq.${correo}`)
    .limit(1)

  const acceso = data?.[0]

  return {
    negocioId: acceso?.negocio_id ?? usuarioId,
    rol: acceso?.rol ?? 'admin',
  }
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

    const contexto = await obtenerContextoSuscripcion(
      supabaseAdmin,
      userData.user.id,
      userData.user.email
    )

    let { data, error } = await supabaseAdmin
      .from('suscripciones')
      .select('estado, fecha_vencimiento, plan, nombre_negocio, telefono, foto_negocio_url')
      .eq('usuario_id', contexto.negocioId)
      .maybeSingle()

    if (error && columnaFotoNoExiste(error)) {
      const fallback = await supabaseAdmin
        .from('suscripciones')
        .select('estado, fecha_vencimiento, plan, nombre_negocio, telefono')
        .eq('usuario_id', contexto.negocioId)
        .maybeSingle()

      data = fallback.data ? { ...fallback.data, foto_negocio_url: null } : null
      error = fallback.error
    }

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      suscripcion: data,
      acceso: {
        negocio_id: contexto.negocioId,
        rol: contexto.rol,
        es_admin_principal: contexto.negocioId === userData.user.id,
      },
    })
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
    const esPruebaGratis = body.prueba_gratis === true

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
      const planExistente = limpiarTexto(suscripcionExistente.plan).toLowerCase() as Plan
      const estadoExistente = String(suscripcionExistente.estado ?? '').toLowerCase()
      const planParaPrueba =
        PLANES_PERMITIDOS.includes(planExistente) && planExistente !== 'trial'
          ? planExistente
          : planSolicitado
      const puedeActivarPruebaPendiente =
        esPruebaGratis &&
        estadoExistente === 'pendiente' &&
        !suscripcionActiva(suscripcionExistente)

      if (puedeActivarPruebaPendiente) {
        const fechaInicioTrial = new Date()
        const fechaVencimientoTrial = new Date(fechaInicioTrial)
        fechaVencimientoTrial.setDate(fechaInicioTrial.getDate() + 7)

        const { data: trialActivado, error: activacionError } = await supabaseAdmin
          .from('suscripciones')
          .update({
            plan: planParaPrueba,
            estado: 'activa',
            fecha_inicio: fechaInicioTrial.toISOString(),
            fecha_vencimiento: fechaVencimientoTrial.toISOString(),
          })
          .eq('usuario_id', usuarioId)
          .select()
          .single()

        if (activacionError) {
          return NextResponse.json(
            { error: activacionError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          mensaje: 'Prueba gratis del plan activada correctamente',
          suscripcion: trialActivado,
        })
      }

      return NextResponse.json({
        mensaje: 'La suscripcion ya existia',
        suscripcion: suscripcionExistente,
      })
    }

    const fechaInicio = new Date()
    const fechaVencimiento = new Date(fechaInicio)
    fechaVencimiento.setDate(fechaInicio.getDate() + (esPruebaGratis ? 7 : 30))

    const { data, error } = await supabaseAdmin
      .from('suscripciones')
      .insert([
        {
          usuario_id: usuarioId,
          nombre_negocio: nombreNegocio,
          email,
          telefono,
          plan: planSolicitado,
          estado: esPruebaGratis ? 'activa' : 'pendiente',
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'No hay una sesion activa para actualizar el negocio' },
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

    const contexto = await obtenerContextoSuscripcion(
      supabaseAdmin,
      userData.user.id,
      userData.user.email
    )

    if (contexto.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el administrador puede editar la identidad del negocio' },
        { status: 403 }
      )
    }

    const nombreNegocio = limpiarTexto(body.nombre_negocio)
    const fotoNegocio = limpiarFotoNegocio(body.foto_negocio_url)
    const quitarFoto = body.quitar_foto === true
    const cambios: Record<string, string | null> = {}

    if (nombreNegocio) {
      cambios.nombre_negocio = nombreNegocio.slice(0, 80)
    }

    if (quitarFoto) {
      cambios.foto_negocio_url = null
    } else if (fotoNegocio) {
      cambios.foto_negocio_url = fotoNegocio
    }

    if (Object.keys(cambios).length === 0) {
      return NextResponse.json(
        { error: 'No hay cambios validos para guardar' },
        { status: 400 }
      )
    }

    let { data, error } = await supabaseAdmin
      .from('suscripciones')
      .update(cambios)
      .eq('usuario_id', contexto.negocioId)
      .select('estado, fecha_vencimiento, plan, nombre_negocio, telefono, foto_negocio_url')
      .single()

    if (error && columnaFotoNoExiste(error) && !('foto_negocio_url' in cambios)) {
      const fallback = await supabaseAdmin
        .from('suscripciones')
        .update(cambios)
        .eq('usuario_id', contexto.negocioId)
        .select('estado, fecha_vencimiento, plan, nombre_negocio, telefono')
        .single()

      data = fallback.data ? { ...fallback.data, foto_negocio_url: null } : null
      error = fallback.error
    }

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      mensaje: 'Perfil del negocio actualizado',
      suscripcion: data,
    })
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
