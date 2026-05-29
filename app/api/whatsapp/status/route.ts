import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

function configured(name: string) {
  return Boolean(process.env[name])
}

export async function GET(request: Request) {
  const variables = {
    cronSecret: configured('CRON_SECRET'),
    phoneNumberId: configured('META_WHATSAPP_PHONE_NUMBER_ID'),
    accessToken: configured('META_WHATSAPP_ACCESS_TOKEN'),
    verifyToken: configured('META_WHATSAPP_VERIFY_TOKEN'),
    templateName: configured('META_WHATSAPP_TEMPLATE_RECORDATORIO'),
    customerPhotoTemplateName: configured('META_WHATSAPP_TEMPLATE_RECORDATORIO_CLIENTE_FOTO'),
    businessTemplateName: configured('META_WHATSAPP_TEMPLATE_RECORDATORIO_NEGOCIO'),
    recoveryTemplateName: configured('META_WHATSAPP_TEMPLATE_RECUPERACION'),
    templateLanguage: configured('META_WHATSAPP_TEMPLATE_LANGUAGE'),
  }

  const listo =
    variables.cronSecret &&
    variables.phoneNumberId &&
    variables.accessToken &&
    variables.verifyToken &&
    variables.templateName &&
    variables.businessTemplateName &&
    variables.recoveryTemplateName &&
    variables.templateLanguage

  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  let salud = null

  if (token) {
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })
    const { data: userData } = await supabaseAuth.auth.getUser()

    if (userData.user) {
      const supabase = getSupabaseAdmin()
      const { data: acceso } = await supabase
        .from('equipo_accesos')
        .select('negocio_id')
        .eq('activo', true)
        .or(`usuario_id.eq.${userData.user.id},email.eq.${userData.user.email?.toLowerCase() ?? ''}`)
        .limit(1)
      const negocioId = acceso?.[0]?.negocio_id ?? userData.user.id
      const { data: recientes } = await supabase
        .from('whatsapp_recordatorios_envios')
        .select(`
          id,
          estado,
          destinatario,
          minutos_antes,
          enviado_at,
          intento_count,
          ultimo_error,
          Citas:cita_id (
            ID_Usuario,
            Fecha,
            Hora,
            Clientes:ID_Cliente (
              Nombre
            )
          )
        `)
        .eq('Citas.ID_Usuario', negocioId)
        .order('enviado_at', { ascending: false })
        .limit(20)
      const registros = recientes ?? []

      salud = {
        ultimos: registros,
        enviados24h: registros.filter((item) => item.estado === 'enviado').length,
        fallidos24h: registros.filter((item) => item.estado === 'fallido').length,
        ultimoRun: registros[0]?.enviado_at ?? null,
      }
    }
  }

  return NextResponse.json({
    listo,
    schedule: 'Cada 5 minutos revisa citas proximas y envia avisos 20 y 5 minutos antes',
    endpoint: '/api/whatsapp/recordatorios-proximos',
    customerReminderEndpoint: '/api/whatsapp/recordatorios-proximos',
    webhookEndpoint: '/api/whatsapp/webhook',
    template:
      process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO || 'recordatorio_cita',
    customerPhotoTemplate:
      process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO_CLIENTE_FOTO ||
      'sin plantilla con foto',
    businessTemplate:
      process.env.META_WHATSAPP_TEMPLATE_RECORDATORIO_NEGOCIO ||
      'recordatorio_negocio',
    recoveryTemplate:
      process.env.META_WHATSAPP_TEMPLATE_RECUPERACION || 'codigo_recuperacion',
    language: process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || 'es_CO',
    variables,
    salud,
  })
}
