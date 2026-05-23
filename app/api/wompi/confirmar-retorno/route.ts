import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, supabaseAnonKey, supabaseUrl } from '@/lib/supabase'
import {
  WOMPI_PLANES,
  getWompiApiUrl,
  getWompiPublicKey,
  leerReferencia,
} from '@/lib/wompi'

type WompiTransactionResponse = {
  data?: {
    id?: string
    reference?: string
    status?: string
    amount_in_cents?: number
    currency?: string
  }
}

function calcularVencimiento() {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 30)
  return fecha.toISOString()
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'No hay una sesion activa' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const transactionId = String(body.transactionId ?? '')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'No encontramos el ID de la transaccion de Wompi' },
        { status: 400 }
      )
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Sesion invalida o expirada' },
        { status: 401 }
      )
    }

    const response = await fetch(`${getWompiApiUrl()}/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${getWompiPublicKey()}`,
      },
    })
    const transactionResponse = (await response.json()) as WompiTransactionResponse
    const transaction = transactionResponse.data

    if (!response.ok || !transaction?.reference) {
      return NextResponse.json(
        { error: 'No pudimos consultar la transaccion en Wompi' },
        { status: 502 }
      )
    }

    if (transaction.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `La transaccion aun no esta aprobada. Estado: ${transaction.status}` },
        { status: 409 }
      )
    }

    const referencia = leerReferencia(transaction.reference)

    if (!referencia || referencia.usuarioId !== userData.user.id) {
      return NextResponse.json(
        { error: 'La transaccion no pertenece a esta cuenta' },
        { status: 403 }
      )
    }

    const plan = WOMPI_PLANES[referencia.plan]
    const montoEsperado = plan.precioCop * 100

    if (transaction.amount_in_cents !== montoEsperado || transaction.currency !== 'COP') {
      return NextResponse.json(
        { error: 'El monto de Wompi no coincide con el plan seleccionado' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const datosSuscripcion = {
      plan: referencia.plan,
      estado: 'activa',
      fecha_vencimiento: calcularVencimiento(),
    }

    const { data: existente, error: consultaError } = await supabase
      .from('suscripciones')
      .select('usuario_id')
      .eq('usuario_id', userData.user.id)
      .maybeSingle()

    if (consultaError) {
      return NextResponse.json(
        { error: consultaError.message },
        { status: 500 }
      )
    }

    const { error } = existente
      ? await supabase
        .from('suscripciones')
        .update(datosSuscripcion)
        .eq('usuario_id', userData.user.id)
      : await supabase
        .from('suscripciones')
        .insert([
          {
            usuario_id: userData.user.id,
            nombre_negocio: 'Nuevo negocio',
            email: userData.user.email ?? 'pendiente@oborobooking.local',
            telefono: 'Pendiente',
            whatsapp_enviado: false,
            fecha_inicio: new Date().toISOString(),
            ...datosSuscripcion,
          },
        ])

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      activada: true,
      plan: referencia.plan,
      estado: 'activa',
    })
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo confirmar el pago con Wompi'

    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
