import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isValidPasswordRecoveryCode } from '@/lib/passwordRecovery'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const code = String(body.code ?? '').trim()
    const password = String(body.password ?? '')

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Escribe un correo valido.' },
        { status: 400 }
      )
    }

    if (!isValidPasswordRecoveryCode(email, code)) {
      return NextResponse.json(
        { error: 'El codigo no es valido o ya vencio.' },
        { status: 400 }
      )
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `La nueva contrasena debe tener minimo ${MIN_PASSWORD_LENGTH} caracteres.` },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: suscripcion, error } = await supabase
      .from('suscripciones')
      .select('usuario_id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!suscripcion?.usuario_id) {
      return NextResponse.json(
        { error: 'No encontramos una cuenta activa para ese correo.' },
        { status: 404 }
      )
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      suscripcion.usuario_id,
      { password }
    )

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      mensaje: 'Contrasena actualizada. Ya puedes iniciar sesion.',
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cambiar la contrasena.' },
      { status: 500 }
    )
  }
}
