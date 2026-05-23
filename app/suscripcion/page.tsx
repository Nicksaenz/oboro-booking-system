'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Suscripcion = {
  estado: string | null
  fecha_vencimiento: string | null
  plan: string | null
}

const ESTADOS_VALIDOS = ['trial', 'activa', 'activo', 'pagada', 'paid']

const PLANES = [
  {
    id: 'basico',
    nombre: 'Basico',
    precio: '$70.000 COP / mes',
    detalle: 'Para negocios que empiezan a ordenar sus reservas.',
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: '$90.000 COP / mes',
    detalle: 'Para vender Oboro Booking como SaaS profesional.',
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: '$120.000 COP / mes',
    detalle: 'Para negocios con mas volumen y automatizaciones.',
  },
]

export default function SuscripcionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [planCargando, setPlanCargando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    async function cargarSuscripcion() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        router.replace('/login')
        return
      }

      const { data } = await supabase
        .from('suscripciones')
        .select('estado, fecha_vencimiento, plan')
        .eq('usuario_id', user.id)
        .maybeSingle()

      setSuscripcion(data)
      setCargando(false)
    }

    cargarSuscripcion()
  }, [router])

  useEffect(() => {
    async function confirmarRetornoWompi() {
      const transactionId = searchParams.get('id')

      if (!transactionId) return

      setMensaje('Confirmando pago aprobado con Wompi...')

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        router.replace('/login')
        return
      }

      const response = await fetch('/api/wompi/confirmar-retorno', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId }),
      })

      const resultado = await response.json()

      if (!response.ok) {
        setMensaje(resultado.error ?? 'No se pudo confirmar el pago con Wompi.')
        return
      }

      setSuscripcion({
        estado: resultado.estado,
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString(),
        plan: resultado.plan,
      })
      setMensaje('Pago confirmado. Tu suscripcion ya esta activa.')
    }

    confirmarRetornoWompi()
  }, [router, searchParams])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function pagarPlan(plan: string) {
    setPlanCargando(plan)
    setMensaje('')

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      router.replace('/login')
      return
    }

    const response = await fetch('/api/wompi/checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan }),
    })

    const resultado = await response.json()

    if (!response.ok || !resultado.url) {
      setMensaje(resultado.error ?? 'No se pudo iniciar el pago.')
      setPlanCargando(null)
      return
    }

    window.location.assign(resultado.url)
  }

  function entrarDashboard() {
    router.replace('/')
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <p className="text-orange-500 font-bold tracking-[4px]">
          Revisando suscripcion...
        </p>
      </main>
    )
  }

  const fechaVencimiento = suscripcion?.fecha_vencimiento
    ? new Date(suscripcion.fecha_vencimiento).toLocaleDateString('es-CO')
    : 'No disponible'
  const checkout = searchParams.get('checkout')
  const mensajeCheckout =
    checkout === 'success'
      ? 'Volviste de Wompi. Si el pago fue aprobado, tu suscripcion se activara en unos segundos.'
      : checkout === 'cancel'
        ? 'Pago cancelado. Puedes intentar de nuevo cuando quieras.'
        : ''
  const mensajeVisible = mensaje || mensajeCheckout
  const estadoActual = String(suscripcion?.estado ?? '').toLowerCase()
  const tieneAcceso =
    ESTADOS_VALIDOS.includes(estadoActual) &&
    (!suscripcion?.fecha_vencimiento ||
      new Date(suscripcion.fecha_vencimiento).getTime() >= Date.now())

  return (
    <main className="min-h-screen bg-black text-white px-5 py-12">
      <section className="max-w-3xl mx-auto border border-orange-600/60 bg-zinc-950 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-orange-950/20">
        <p className="text-orange-500 font-bold tracking-[4px] text-sm">
          OBORO BOOKING
        </p>

        <h1 className="text-4xl sm:text-5xl font-bold mt-3">
          {tieneAcceso ? 'Suscripcion activa' : 'Suscripcion requerida'}
        </h1>

        <p className="text-zinc-400 mt-4">
          {tieneAcceso
            ? 'Tu cuenta ya puede entrar al panel de reservas.'
            : 'Tu cuenta necesita una suscripcion activa para entrar al panel de reservas.'}
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          <div className="rounded-xl border border-orange-600/40 bg-black p-4">
            <p className="text-zinc-500 text-sm">Plan</p>
            <p className="text-xl font-bold text-orange-500 mt-1">
              {suscripcion?.plan ?? 'Sin plan'}
            </p>
          </div>

          <div className="rounded-xl border border-orange-600/40 bg-black p-4">
            <p className="text-zinc-500 text-sm">Estado</p>
            <p className="text-xl font-bold text-orange-500 mt-1">
              {suscripcion?.estado ?? 'Sin suscripcion'}
            </p>
          </div>

          <div className="rounded-xl border border-orange-600/40 bg-black p-4">
            <p className="text-zinc-500 text-sm">Vence</p>
            <p className="text-xl font-bold text-orange-500 mt-1">
              {fechaVencimiento}
            </p>
          </div>
        </div>

        {mensajeVisible && (
          <p className="mt-6 rounded-xl border border-orange-500/40 bg-orange-950/30 px-4 py-3 text-orange-200">
            {mensajeVisible}
          </p>
        )}

        {tieneAcceso && (
          <button
            type="button"
            onClick={entrarDashboard}
            className="mt-8 w-full rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700"
          >
            Entrar al dashboard
          </button>
        )}

        <div className="mt-8 rounded-xl border border-zinc-800 bg-black p-5">
          <h2 className="text-2xl font-bold">
            Elige tu plan
          </h2>
          <p className="text-zinc-400 mt-3">
            Al pagar con Wompi, el sistema actualizara automaticamente tu
            suscripcion cuando Wompi confirme el pago aprobado.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-5">
          {PLANES.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-orange-600/40 bg-black p-5"
            >
              <h3 className="text-2xl font-bold text-orange-500">
                {plan.nombre}
              </h3>
              <p className="text-zinc-300 font-bold mt-2">
                {plan.precio}
              </p>
              <p className="text-zinc-500 mt-3 min-h-12">
                {plan.detalle}
              </p>
              <button
                type="button"
                disabled={planCargando !== null}
                onClick={() => pagarPlan(plan.id)}
                className="mt-5 w-full rounded-xl bg-orange-600 px-4 py-3 font-bold hover:bg-orange-700 disabled:opacity-60 transition"
              >
                {planCargando === plan.id ? 'Abriendo Wompi...' : 'Pagar'}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-orange-600/60 px-5 py-3 font-bold text-zinc-200 hover:text-orange-500 transition"
          >
            Revisar estado
          </button>

          <button
            type="button"
            onClick={cerrarSesion}
            className="rounded-xl border border-orange-600/60 px-5 py-3 font-bold text-zinc-200 hover:text-orange-500 transition"
          >
            Salir
          </button>
        </div>
      </section>
    </main>
  )
}
