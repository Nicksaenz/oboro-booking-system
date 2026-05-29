'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { obtenerContextoEquipo } from '@/lib/equipo'

const PLANES_AUTOMATICOS = ['basico', 'pro', 'business', 'premium']
const PLANES_QR = ['trial', 'basico', 'pro', 'business', 'premium']

export default function AutomatizacionesPage() {
  const router = useRouter()
  const [reservaUrl, setReservaUrl] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [planActual, setPlanActual] = useState('')

  const tieneAutomatizaciones = PLANES_AUTOMATICOS.includes(planActual)
  const tieneQrPublico = PLANES_QR.includes(planActual)

  useEffect(() => {
    async function cargarDatos() {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user?.id
      const token = data.session?.access_token
      const contexto = await obtenerContextoEquipo()
      const negocioId = contexto?.negocioId ?? userId

      if (negocioId) {
        setReservaUrl(`${window.location.origin}/reservar/${negocioId}`)
      }

      if (token) {
        const response = await fetch('/api/suscripcion', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const resultado = response.ok ? await response.json() : null
        setPlanActual(String(resultado?.suscripcion?.plan ?? '').toLowerCase())
      }

    }

    cargarDatos()
  }, [])

  async function copiarLinkReserva() {
    if (!reservaUrl) return

    await navigator.clipboard.writeText(reservaUrl)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2500)
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">
              Automatizaciones
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Oboro envia recordatorios automaticos por WhatsApp al negocio y
              al cliente final usando las citas guardadas en la agenda.
            </p>
          </div>

          <div className="rounded-2xl border border-green-500/50 bg-green-950/20 px-5 py-4 text-green-300">
            <p className="text-sm text-zinc-400">Modo actual</p>
            <p className="text-xl font-bold">Automatico</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
            <p className="text-sm font-bold text-orange-500">1. Agenda</p>
            <h2 className="mt-2 text-2xl font-bold">La cita queda completa</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              El negocio crea la cita o el cliente la agenda desde el QR. Oboro
              guarda cliente, servicio, empleado, fecha, hora y estado.
            </p>
          </div>

          <div className="rounded-2xl border border-green-600/40 bg-green-950/10 p-5 shadow-2xl shadow-green-950/10">
            <p className="text-sm font-bold text-green-300">2. Recordatorio</p>
            <h2 className="mt-2 text-2xl font-bold">Se envia solo</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Oboro revisa las citas proximas y envia avisos automaticos 20
              minutos antes y 5 minutos antes de la hora programada.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-600/40 bg-blue-950/10 p-5 shadow-2xl shadow-blue-950/10">
            <p className="text-sm font-bold text-blue-300">3. Foto del equipo</p>
            <h2 className="mt-2 text-2xl font-bold">Mensaje personalizado</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Si el empleado tiene foto, Oboro la usa en la plantilla de
              WhatsApp con imagen para que el cliente vea quien lo atiende.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <h2 className="text-2xl font-bold">Que recibe cada persona</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="font-bold text-orange-400">Cliente final</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Recibe un recordatorio con su nombre, negocio, fecha, hora,
                  servicio y empleado asignado. Cuando hay foto de empleado y
                  plantilla aprobada, el mensaje incluye imagen. Se envia 20 y
                  5 minutos antes de la cita.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="font-bold text-green-300">Negocio</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Recibe un recordatorio operativo con el cliente, servicio,
                  fecha, hora y empleado 20 y 5 minutos antes de cada cita.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-green-600/40 bg-green-950/10 p-5">
            <h2 className="text-2xl font-bold text-green-300">Estado</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Las automatizaciones usan la configuracion central de Oboro Lab.
              El negocio solo debe mantener sus citas, clientes y empleados al
              dia.
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Frecuencia: revision cada 5 minutos para detectar citas que estan
              a 20 o 5 minutos de empezar.
            </p>
            {!tieneAutomatizaciones && (
              <p className="mt-4 rounded-xl border border-orange-600/40 bg-black px-4 py-3 text-sm font-bold text-orange-200">
                Los recordatorios automaticos estan incluidos desde el plan Basico.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-6 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[3px] text-orange-500">
              Link publico
            </p>
            <h2 className="mt-2 text-3xl font-black">QR para agendar</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Comparte este link o QR en recepcion, redes sociales e historias.
              El cliente escoge servicio, empleado, fecha y hora sin escribir
              primero al negocio.
            </p>
            {reservaUrl && tieneQrPublico && (
              <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-bold uppercase tracking-[2px] text-zinc-500">
                  Enlace para compartir
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="break-all rounded-xl border border-orange-500/25 bg-zinc-950 p-4 text-sm font-bold text-orange-100">
                    {reservaUrl}
                  </div>
                <button
                  type="button"
                  onClick={copiarLinkReserva}
                    className="min-h-12 rounded-xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
                >
                  {linkCopiado ? 'Copiado' : 'Copiar link'}
                </button>
                </div>
              </div>
            )}
            {!tieneQrPublico && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                <p className="font-bold text-orange-400">
                  Incluido en todos los planes activos
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  El QR publico esta disponible desde Basico y durante la prueba
                  gratis.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/suscripcion')}
                  className="mt-4 min-h-11 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold transition hover:bg-orange-700"
                >
                  Ver planes
                </button>
              </div>
            )}
          </div>

          {reservaUrl && tieneQrPublico && (
            <div className="mx-auto w-full max-w-xs rounded-[28px] border border-orange-500/30 bg-black p-5 text-center shadow-2xl shadow-orange-950/30">
              <p className="text-xs font-bold uppercase tracking-[3px] text-orange-500">
                Escanea y agenda
              </p>
              <div className="mt-4 rounded-2xl bg-white p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(reservaUrl)}`}
                  alt="QR publico para agendar"
                  className="mx-auto h-56 w-56"
                />
              </div>
              <p className="mt-4 text-sm font-bold text-zinc-200">
                Listo para imprimir, pegar en recepcion o compartir en historias.
              </p>
            </div>
          )}
        </div>

        {reservaUrl && tieneQrPublico && (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {[
              [
                'Historia',
                'Agenda tu cita desde este link. Elige servicio, profesional, fecha y hora en segundos.',
              ],
              [
                'Recepcion',
                'Escanea el QR, reserva tu cita y recibe recordatorios por WhatsApp antes de venir.',
              ],
              [
                'WhatsApp',
                `Reserva directamente con nosotros aqui: ${reservaUrl}`,
              ],
            ].map(([titulo, texto]) => (
              <article
                key={titulo}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[3px] text-orange-500">
                  Material {titulo}
                </p>
                <p className="mt-3 min-h-24 text-sm leading-6 text-zinc-300">
                  {texto}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(texto)
                    setLinkCopiado(true)
                    setTimeout(() => setLinkCopiado(false), 2500)
                  }}
                  className="mt-4 min-h-11 rounded-xl border border-orange-500/50 px-4 py-2 text-sm font-bold text-orange-100 transition hover:bg-orange-500/10"
                >
                  Copiar texto
                </button>
              </article>
            ))}
          </div>
        )}

      </section>
    </main>
  )
}
