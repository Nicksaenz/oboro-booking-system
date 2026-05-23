import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

function limpiarTexto(valor: unknown, respaldo = '') {
  return typeof valor === 'string' ? valor.trim() : respaldo
}

async function obtenerUsuario(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return { error: 'No hay una sesion activa', status: 401 as const }
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
  const { data, error } = await supabaseAuth.auth.getUser()

  if (error || !data.user) {
    return { error: 'Sesion invalida o expirada', status: 401 as const }
  }

  return { user: data.user }
}

export async function GET(request: Request) {
  const usuario = await obtenerUsuario(request)

  if ('error' in usuario) {
    return NextResponse.json(
      { error: usuario.error },
      { status: usuario.status }
    )
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('whatsapp_configuraciones')
    .select(`
      telefono_negocio,
      phone_number_id,
      access_token,
      template_recordatorio,
      template_language,
      activo
    `)
    .eq('usuario_id', usuario.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    configuracion: data
      ? {
        telefono_negocio: data.telefono_negocio,
        phone_number_id: data.phone_number_id,
        access_token_configurado: Boolean(data.access_token),
        template_recordatorio: data.template_recordatorio,
        template_language: data.template_language,
        activo: data.activo,
      }
      : null,
  })
}

export async function POST(request: Request) {
  const usuario = await obtenerUsuario(request)

  if ('error' in usuario) {
    return NextResponse.json(
      { error: usuario.error },
      { status: usuario.status }
    )
  }

  const body = await request.json()
  const phoneNumberId = limpiarTexto(body.phone_number_id)
  const accessToken = limpiarTexto(body.access_token)
  const telefonoNegocio = limpiarTexto(body.telefono_negocio)
  const templateRecordatorio = limpiarTexto(
    body.template_recordatorio,
    'recordatorio_cita'
  )
  const templateLanguage = limpiarTexto(body.template_language, 'es_CO')

  const supabase = getSupabaseAdmin()
  const { data: existente, error: consultaError } = await supabase
    .from('whatsapp_configuraciones')
    .select('access_token')
    .eq('usuario_id', usuario.user.id)
    .maybeSingle()

  if (consultaError) {
    return NextResponse.json({ error: consultaError.message }, { status: 500 })
  }

  const tokenFinal = accessToken || existente?.access_token

  if (!phoneNumberId || !tokenFinal || !telefonoNegocio) {
    return NextResponse.json(
      {
        error:
          'Completa el numero del negocio, Phone Number ID y Access Token.',
      },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('whatsapp_configuraciones')
    .upsert(
      {
        usuario_id: usuario.user.id,
        telefono_negocio: telefonoNegocio,
        phone_number_id: phoneNumberId,
        access_token: tokenFinal,
        template_recordatorio: templateRecordatorio,
        template_language: templateLanguage,
        activo: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'usuario_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
      guardado: true,
    configuracion: {
      telefono_negocio: telefonoNegocio,
      phone_number_id: phoneNumberId,
      access_token_configurado: true,
      template_recordatorio: templateRecordatorio,
      template_language: templateLanguage,
      activo: true,
    },
  })
}
