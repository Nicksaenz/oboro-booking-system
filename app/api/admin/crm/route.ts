import { NextResponse } from 'next/server'
import { isValidAdminAccess } from '@/lib/adminAccess'
import { obtenerPlanOboro } from '@/lib/planes'
import { getSupabaseAdmin } from '@/lib/supabase'

type SuscripcionCrm = {
  usuario_id?: string | null
  email?: string | null
  nombre_negocio?: string | null
  telefono?: string | null
  plan?: string | null
  estado?: string | null
  fecha_inicio?: string | null
  fecha_vencimiento?: string | null
  whatsapp_enviado?: boolean | null
  foto_negocio_url?: string | null
  ultimo_pago_at?: string | null
  ultimo_pago_monto_centavos?: number | null
  ultimo_pago_moneda?: string | null
  ultimo_pago_referencia?: string | null
  ultimo_pago_transaccion_id?: string | null
  origen_estado?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

function estadoNormalizado(estado?: string | null) {
  return String(estado ?? 'sin_estado').toLowerCase()
}

function estaActiva(suscripcion: SuscripcionCrm) {
  const estado = estadoNormalizado(suscripcion.estado)
  const vence = suscripcion.fecha_vencimiento
    ? new Date(suscripcion.fecha_vencimiento).getTime()
    : Date.now()

  return ['activa', 'activo', 'pagada', 'paid'].includes(estado) && vence >= Date.now()
}

function clasificarPago(suscripcion: SuscripcionCrm) {
  if (suscripcion.ultimo_pago_at || suscripcion.origen_estado === 'wompi') {
    return 'pago_confirmado'
  }

  if (estaActiva(suscripcion)) {
    return 'prueba_o_activa'
  }

  if (estadoNormalizado(suscripcion.estado).includes('pendiente')) {
    return 'pendiente'
  }

  return 'sin_pago'
}

function limpiar(valor: unknown) {
  return typeof valor === 'string' ? valor.toLowerCase().trim() : ''
}

export async function GET(request: Request) {
  const adminSecret = request.headers.get('x-crm-admin-secret')

  if (!isValidAdminAccess(adminSecret)) {
    return NextResponse.json(
      { error: 'Clave admin invalida.' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const busqueda = limpiar(searchParams.get('q'))
    const filtroEstado = limpiar(searchParams.get('estado'))
    const filtroPlan = limpiar(searchParams.get('plan'))
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('suscripciones')
      .select('*')
      .order('fecha_inicio', { ascending: false, nullsFirst: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const usuarios = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const usuariosPorId = new Map(
      (usuarios.data.users ?? []).map((usuario) => [
        usuario.id,
        {
          emailAuth: usuario.email ?? null,
          creadoAuth: usuario.created_at ?? null,
          ultimoIngreso: usuario.last_sign_in_at ?? null,
        },
      ])
    )

    const registros = ((data ?? []) as SuscripcionCrm[]).map((suscripcion, index) => {
      const usuario = suscripcion.usuario_id
        ? usuariosPorId.get(suscripcion.usuario_id)
        : undefined
      const plan = obtenerPlanOboro(suscripcion.plan)
      const montoMensual = plan.precioCop
      const pago = clasificarPago(suscripcion)

      return {
        id: suscripcion.usuario_id ?? suscripcion.email ?? `registro-${index}`,
        usuario_id: suscripcion.usuario_id ?? null,
        email: suscripcion.email ?? usuario?.emailAuth ?? null,
        email_auth: usuario?.emailAuth ?? null,
        nombre_negocio: suscripcion.nombre_negocio ?? 'Sin negocio',
        telefono: suscripcion.telefono ?? 'Pendiente',
        plan: plan.id,
        plan_nombre: plan.nombre,
        monto_mensual: montoMensual,
        estado: suscripcion.estado ?? 'sin_estado',
        pago,
        activo: estaActiva(suscripcion),
        fecha_inicio: suscripcion.fecha_inicio ?? suscripcion.created_at ?? usuario?.creadoAuth ?? null,
        fecha_vencimiento: suscripcion.fecha_vencimiento ?? null,
        ultimo_ingreso: usuario?.ultimoIngreso ?? null,
        whatsapp_enviado: Boolean(suscripcion.whatsapp_enviado),
        ultimo_pago_at: suscripcion.ultimo_pago_at ?? null,
        ultimo_pago_monto_centavos: suscripcion.ultimo_pago_monto_centavos ?? null,
        ultimo_pago_moneda: suscripcion.ultimo_pago_moneda ?? null,
        ultimo_pago_referencia: suscripcion.ultimo_pago_referencia ?? null,
        ultimo_pago_transaccion_id: suscripcion.ultimo_pago_transaccion_id ?? null,
        origen_estado: suscripcion.origen_estado ?? null,
      }
    })

    const filtrados = registros.filter((registro) => {
      const texto = [
        registro.nombre_negocio,
        registro.email,
        registro.email_auth,
        registro.telefono,
        registro.plan_nombre,
        registro.estado,
        registro.pago,
      ]
        .map((item) => limpiar(item))
        .join(' ')
      const coincideBusqueda = !busqueda || texto.includes(busqueda)
      const coincideEstado =
        !filtroEstado ||
        filtroEstado === 'todos' ||
        limpiar(registro.estado) === filtroEstado ||
        limpiar(registro.pago) === filtroEstado
      const coincidePlan =
        !filtroPlan ||
        filtroPlan === 'todos' ||
        limpiar(registro.plan) === filtroPlan

      return coincideBusqueda && coincideEstado && coincidePlan
    })

    const resumen = registros.reduce(
      (totales, registro) => {
        totales.total += 1
        if (registro.activo) {
          totales.activos += 1
          totales.mrr_estimado += registro.monto_mensual
        }
        if (registro.pago === 'pago_confirmado') {
          totales.pagos_confirmados += 1
          totales.mrr_confirmado += registro.monto_mensual
        }
        if (registro.pago === 'pendiente') totales.pendientes += 1
        if (registro.pago === 'prueba_o_activa') totales.pruebas_o_activas += 1

        return totales
      },
      {
        total: 0,
        activos: 0,
        pagos_confirmados: 0,
        pruebas_o_activas: 0,
        pendientes: 0,
        mrr_estimado: 0,
        mrr_confirmado: 0,
      }
    )

    return NextResponse.json({
      actualizado_en: new Date().toISOString(),
      resumen,
      registros: filtrados,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el CRM.'

    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
