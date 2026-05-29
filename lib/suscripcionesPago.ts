import { getSupabaseAdmin } from './supabase'
import type { WompiPlan } from './wompi'

type PagoAprobado = {
  usuarioId: string
  plan: WompiPlan
  transactionId?: string
  reference?: string
  amountInCents?: number
  currency?: string
}

function calcularVencimiento() {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 30)
  return fecha.toISOString()
}

function esColumnaPagoFaltante(error?: { message?: string } | null) {
  const mensaje = String(error?.message ?? '').toLowerCase()

  return [
    'ultimo_pago_at',
    'ultimo_pago_monto_centavos',
    'ultimo_pago_moneda',
    'ultimo_pago_referencia',
    'ultimo_pago_transaccion_id',
    'origen_estado',
  ].some((columna) => mensaje.includes(columna))
}

export async function registrarPagoAprobado({
  usuarioId,
  plan,
  transactionId,
  reference,
  amountInCents,
  currency = 'COP',
}: PagoAprobado) {
  const supabase = getSupabaseAdmin()
  const ahora = new Date().toISOString()
  const datosBase = {
    plan,
    estado: 'pagada',
    fecha_vencimiento: calcularVencimiento(),
  }
  const datosPago = {
    ...datosBase,
    ultimo_pago_at: ahora,
    ultimo_pago_monto_centavos: amountInCents ?? null,
    ultimo_pago_moneda: currency,
    ultimo_pago_referencia: reference ?? null,
    ultimo_pago_transaccion_id: transactionId ?? null,
    origen_estado: 'wompi',
  }

  const { data: existente, error: consultaError } = await supabase
    .from('suscripciones')
    .select('usuario_id')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (consultaError) {
    throw consultaError
  }

  const guardar = async (conCamposPago: boolean) => {
    const payload = conCamposPago ? datosPago : datosBase

    if (existente) {
      return supabase
        .from('suscripciones')
        .update(payload)
        .eq('usuario_id', usuarioId)
    }

    return supabase
      .from('suscripciones')
      .insert([
        {
          usuario_id: usuarioId,
          nombre_negocio: 'Nuevo negocio',
          email: 'pendiente@oborobooking.local',
          telefono: 'Pendiente',
          whatsapp_enviado: false,
          fecha_inicio: ahora,
          ...payload,
        },
      ])
  }

  const resultado = await guardar(true)

  if (resultado.error && esColumnaPagoFaltante(resultado.error)) {
    const fallback = await guardar(false)

    if (fallback.error) {
      throw fallback.error
    }

    return
  }

  if (resultado.error) {
    throw resultado.error
  }
}
