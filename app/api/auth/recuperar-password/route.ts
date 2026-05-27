import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  getPasswordRecoveryCode,
  getPasswordRecoveryExpiration,
} from '@/lib/passwordRecovery'
import {
  getReminderTemplateLanguage,
  normalizeWhatsAppNumber,
  sendWhatsAppTemplate,
} from '@/lib/whatsapp'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.length <= 4) return 'tu WhatsApp registrado'

  return `***${digits.slice(-4)}`
}

async function sendRecoveryCode(to: string, code: string) {
  return sendWhatsAppTemplate({
    to,
    templateName:
      process.env.META_WHATSAPP_TEMPLATE_RECUPERACION ||
      'codigo_recuperacion',
    languageCode: getReminderTemplateLanguage(),
    parameters: [{ type: 'text', text: code }],
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Escribe un correo valido.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: suscripcion, error } = await supabase
      .from('suscripciones')
      .select('usuario_id, telefono')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!suscripcion?.usuario_id) {
      return NextResponse.json({
        ok: true,
        mensaje:
          'Si el correo existe, enviaremos un codigo al WhatsApp registrado.',
      })
    }

    const telefono = normalizeWhatsAppNumber(suscripcion.telefono)

    if (!telefono) {
      return NextResponse.json(
        {
          error:
            'Esta cuenta no tiene WhatsApp registrado. Contacta a Oboro Lab para recuperar el acceso.',
        },
        { status: 400 }
      )
    }

    const code = getPasswordRecoveryCode(email)

    try {
      await sendRecoveryCode(telefono, code)
    } catch (sendError) {
      return NextResponse.json(
        {
          error:
            sendError instanceof Error
              ? sendError.message
              : 'No se pudo enviar el codigo por WhatsApp.',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      destino: maskPhone(telefono),
      expiresAt: getPasswordRecoveryExpiration(),
      mensaje: 'Enviamos un codigo de seguridad al WhatsApp registrado.',
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo iniciar la recuperacion.' },
      { status: 500 }
    )
  }
}
