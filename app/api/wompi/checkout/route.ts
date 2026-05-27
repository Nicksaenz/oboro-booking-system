import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  WOMPI_PLANES,
  construirUrlCheckout,
  esWompiPlan,
  firmarCheckout,
  generarReferencia,
} from '@/lib/wompi'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'No hay una sesion activa' },
        { status: 401 }
      )
    }

    const planSolicitado = body.plan

    if (!esWompiPlan(planSolicitado)) {
      return NextResponse.json(
        { error: 'Selecciona un plan valido' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user?.email) {
      return NextResponse.json(
        { error: 'Sesion invalida o expirada' },
        { status: 401 }
      )
    }

    const plan = WOMPI_PLANES[planSolicitado]
    const amountInCents = plan.precioCop * 100
    const reference = generarReferencia(userData.user.id, planSolicitado)
    const signature = firmarCheckout({
      reference,
      amountInCents,
      currency: 'COP',
    })
    const supabaseAdmin = getSupabaseAdmin()

    await supabaseAdmin
      .from('suscripciones')
      .update({
        estado: 'pendiente_pago',
      })
      .eq('usuario_id', userData.user.id)

    return NextResponse.json({
      url: construirUrlCheckout({
        reference,
        amountInCents,
        customerEmail: userData.user.email,
        signature,
      }),
      reference,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'No se pudo iniciar el pago'

    return NextResponse.json(
      { error: mensaje },
      { status: 500 }
    )
  }
}
