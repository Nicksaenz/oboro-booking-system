'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TEMPLATE_KEY = 'oboro_whatsapp_template'
const TEMPLATE_NEGOCIO_KEY = 'oboro_whatsapp_template_negocio'
const MENSAJE_DEFAULT =
  'Hola {{cliente}}, te recordamos tu cita en {{negocio}} para el dia {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Te atendera {{empleado}}.\n\nConfirma aqui: {{confirmar}}\nCancela aqui: {{cancelar}}'
const MENSAJE_NEGOCIO_DEFAULT =
  'Recordatorio: tienes una cita con {{cliente}} el dia {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Atiende: {{empleado}}.'

export default function AutomatizacionesPage() {
  const [mensaje, setMensaje] = useState(MENSAJE_DEFAULT)
  const [mensajeNegocio, setMensajeNegocio] = useState(MENSAJE_NEGOCIO_DEFAULT)
  const [guardado, setGuardado] = useState(false)
  const [reservaUrl, setReservaUrl] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)

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

      if (userId) {
        setReservaUrl(`${window.location.origin}/reservar/${userId}`)
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
            Recordatorio automatico al negocio
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Todos los dias, Oboro revisa las citas del dia siguiente y le envia
            un WhatsApp al numero que el negocio registro al crear su cuenta.
            Esto no requiere que el negocio conecte Meta.
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            El cliente final no recibe mensajes automaticos: el negocio los
            envia desde el boton de cada cita para que salgan desde su propio
            WhatsApp.
          </p>
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
            {reservaUrl && (
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
          </div>

          {reservaUrl && (
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
            Datos disponibles para el mensaje
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {['{{cliente}}', '{{fecha}}', '{{hora}}', '{{servicio}}', '{{empleado}}', '{{negocio}}', '{{confirmar}}', '{{cancelar}}'].map((campo) => (
              <div
                key={campo}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center font-bold text-orange-400"
              >
                {campo}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-green-600/40 bg-green-950/10 p-5">
          <h2 className="text-2xl font-bold text-green-300">
            Ventaja de este modo
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Para avisar al cliente final no necesitas conectar Meta, tokens ni
            plantillas aprobadas. Para avisar automaticamente al negocio,
            Oboro Lab configura una sola vez su WhatsApp central.
          </p>
        </div>
      </section>
    </main>
  )
}
