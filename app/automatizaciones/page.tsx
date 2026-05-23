'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TEMPLATE_KEY = 'oboro_whatsapp_template'
const TEMPLATE_NEGOCIO_KEY = 'oboro_whatsapp_template_negocio'
const MENSAJE_DEFAULT =
  'Hola {{cliente}}, te recordamos tu cita en {{negocio}} para el dia {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Te atendera {{empleado}}.\n\nConfirma aqui: {{confirmar}}\nCancela aqui: {{cancelar}}'
const MENSAJE_NEGOCIO_DEFAULT =
  'Recordatorio: tienes una cita con {{cliente}} el dia {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Atiende: {{empleado}}.'

export default function AutomatizacionesPage() {
  const router = useRouter()
  const [mensaje, setMensaje] = useState(MENSAJE_DEFAULT)
  const [mensajeNegocio, setMensajeNegocio] = useState(MENSAJE_NEGOCIO_DEFAULT)
  const [guardado, setGuardado] = useState(false)
  const [reservaUrl, setReservaUrl] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [planActual, setPlanActual] = useState('')
  const tieneAutomatizaciones = ['pro', 'business', 'premium'].includes(planActual)
  const tieneQrPublico = ['pro', 'business', 'premium'].includes(planActual)

  useEffect(() => {
    const guardadoLocal = window.localStorage.getItem(TEMPLATE_KEY)
    const guardadoNegocioLocal = window.localStorage.getItem(TEMPLATE_NEGOCIO_KEY)

    if (
      guardadoLocal &&
      guardadoLocal.includes('{{confirmar}}') &&
      guardadoLocal.includes('{{cancelar}}')
    ) {
      setMensaje(guardadoLocal)
    } else {
      window.localStorage.setItem(TEMPLATE_KEY, MENSAJE_DEFAULT)
    }

    if (guardadoNegocioLocal) {
      setMensajeNegocio(guardadoNegocioLocal)
    }

    async function cargarLinkPublico() {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user?.id
      const token = data.session?.access_token

      if (userId) {
        setReservaUrl(`${window.location.origin}/reservar/${userId}`)
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

    cargarLinkPublico()
  }, [])

  function guardarMensaje() {
    window.localStorage.setItem(TEMPLATE_KEY, mensaje)
    window.localStorage.setItem(TEMPLATE_NEGOCIO_KEY, mensajeNegocio)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  function restaurarMensaje() {
    setMensaje(MENSAJE_DEFAULT)
    setMensajeNegocio(MENSAJE_NEGOCIO_DEFAULT)
    window.localStorage.setItem(TEMPLATE_KEY, MENSAJE_DEFAULT)
    window.localStorage.setItem(TEMPLATE_NEGOCIO_KEY, MENSAJE_NEGOCIO_DEFAULT)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  async function copiarLinkReserva() {
    if (!reservaUrl) return

    await navigator.clipboard.writeText(reservaUrl)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2500)
  }

  const vistaPreviaCliente = mensaje
    .replaceAll('{{cliente}}', 'Juliana Gonzalez')
    .replaceAll('{{negocio}}', 'Tu Negocio')
    .replaceAll('{{fecha}}', 'martes 29 de julio')
    .replaceAll('{{hora}}', '3:20 p. m.')
    .replaceAll('{{servicio}}', 'Manicure semipermanente')
    .replaceAll('{{empleado}}', 'Laura')
    .replaceAll('{{confirmar}}', 'link de confirmar')
    .replaceAll('{{cancelar}}', 'link de cancelar')

  const vistaPreviaNegocio = mensajeNegocio
    .replaceAll('{{cliente}}', 'Juliana Gonzalez')
    .replaceAll('{{fecha}}', 'martes 29 de julio')
    .replaceAll('{{hora}}', '3:20 p. m.')
    .replaceAll('{{servicio}}', 'Manicure semipermanente')
    .replaceAll('{{empleado}}', 'Laura')

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">
              Recordatorios por WhatsApp
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Mensajes manuales para clientes y recordatorio automatico para el
              negocio.
            </p>
          </div>

          <div className="rounded-2xl border border-green-500/50 bg-green-950/20 px-5 py-4 text-green-300">
            <p className="text-sm text-zinc-400">Modo</p>
            <p className="text-xl font-bold">Cliente manual / negocio automatico</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
          <h2 className="text-2xl font-bold">
            Como lo usara tu cliente
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <h3 className="font-bold text-orange-500">
                1. Crea la cita
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Guarda cliente, servicio, empleado, fecha y hora.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <h3 className="font-bold text-orange-500">
                2. El cliente final es manual
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                El negocio abre WhatsApp al cliente y presiona enviar.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <h3 className="font-bold text-orange-500">
                3. El negocio recibe aviso
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Oboro le envia automatico al negocio un recordatorio de sus
                citas del dia siguiente.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-green-600/40 bg-green-950/10 p-5">
          <h2 className="text-2xl font-bold text-green-300">
            Automatizaciones internas
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Oboro Booking usa el WhatsApp central de Oboro Lab para enviar los
            recordatorios automaticos al numero que cada negocio registro al
            crear su cuenta. El negocio no tiene que conectar Meta ni configurar
            tokens.
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            El cliente final no recibe mensajes automaticos: el negocio los
            envia desde el boton de cada cita para que salgan desde su propio
            WhatsApp.
          </p>
          {!tieneAutomatizaciones && (
            <p className="mt-4 rounded-xl border border-orange-600/40 bg-black px-4 py-3 text-sm font-bold text-orange-200">
              Los recordatorios automaticos se activan desde el plan Pro.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-4 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-bold">
              QR publico para agendar
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Comparte este codigo en recepcion, redes sociales o historias.
              Tus clientes pueden escoger servicio, empleado, fecha y hora sin
              escribirte primero.
            </p>
            {reservaUrl && tieneQrPublico && (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="rounded-xl border border-zinc-800 bg-black p-3 text-sm text-orange-200 break-all">
                  {reservaUrl}
                </div>
                <button
                  type="button"
                  onClick={copiarLinkReserva}
                  className="min-h-12 rounded-xl border border-orange-600/60 px-5 py-3 font-bold text-orange-200 transition hover:bg-orange-600/10"
                >
                  {linkCopiado ? 'Copiado' : 'Copiar link'}
                </button>
              </div>
            )}
            {!tieneQrPublico && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                <p className="font-bold text-orange-400">
                  Disponible desde Pro
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  El QR publico para que los clientes agenden solos se activa
                  en los planes Pro y Business.
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
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(reservaUrl)}`}
              alt="QR publico para agendar"
              className="mx-auto h-48 w-48 rounded-2xl border border-zinc-800 bg-white p-3"
            />
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
          <h2 className="text-2xl font-bold">
            Mensaje para el cliente final
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Puedes cambiar el texto. Oboro reemplaza automaticamente las
            palabras entre llaves con los datos reales de cada cita y con los
            enlaces para confirmar o cancelar.
          </p>

          <textarea
            className="mt-5 min-h-44 w-full rounded-xl border border-orange-600/50 bg-black p-4 text-sm leading-6 outline-none"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
          <h2 className="text-2xl font-bold">
            Mensaje para el negocio
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Este mensaje tambien se usa para el recordatorio automatico al
            negocio cuando la automatizacion central de Oboro Lab este activa.
          </p>

          <textarea
            className="mt-5 min-h-36 w-full rounded-xl border border-orange-600/50 bg-black p-4 text-sm leading-6 outline-none"
            value={mensajeNegocio}
            onChange={(e) => setMensajeNegocio(e.target.value)}
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={guardarMensaje}
              className="min-h-12 rounded-xl bg-orange-600 px-5 py-3 font-bold transition hover:bg-orange-700"
            >
              Guardar mensaje
            </button>

            <button
              type="button"
              onClick={restaurarMensaje}
              className="min-h-12 rounded-xl border border-orange-600/60 px-5 py-3 font-bold text-orange-200 transition hover:bg-orange-600/10"
            >
              Restaurar ejemplo
            </button>
          </div>

          {guardado && (
            <p className="mt-4 rounded-xl border border-orange-500/40 bg-black px-4 py-3 text-sm text-orange-200">
              Mensaje guardado. Se usara en los botones de WhatsApp de Citas.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-5">
          <h2 className="text-2xl font-bold">
            Vista previa
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-orange-600/40 bg-zinc-950 p-4">
              <p className="text-sm font-bold text-orange-500">
                Mensaje para cliente final
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                {vistaPreviaCliente}
              </p>
            </div>

            <div className="rounded-xl border border-green-600/40 bg-zinc-950 p-4">
              <p className="text-sm font-bold text-green-300">
                Recordatorio para el negocio
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                {vistaPreviaNegocio}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
