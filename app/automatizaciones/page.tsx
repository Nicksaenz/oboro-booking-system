'use client'

import { useEffect, useState } from 'react'

const TEMPLATE_KEY = 'oboro_whatsapp_template'
const MENSAJE_DEFAULT =
  'Hola {{cliente}}, te recordamos tu cita para el dia {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Te atendera {{empleado}}. Si necesitas cambiar tu reserva, responde este mensaje.'

export default function AutomatizacionesPage() {
  const [mensaje, setMensaje] = useState(MENSAJE_DEFAULT)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    const guardadoLocal = window.localStorage.getItem(TEMPLATE_KEY)

    if (guardadoLocal) {
      setMensaje(guardadoLocal)
    }
  }, [])

  function guardarMensaje() {
    window.localStorage.setItem(TEMPLATE_KEY, mensaje)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  function restaurarMensaje() {
    setMensaje(MENSAJE_DEFAULT)
    window.localStorage.setItem(TEMPLATE_KEY, MENSAJE_DEFAULT)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
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
              Prepara mensajes para enviarlos manualmente desde el WhatsApp del
              negocio.
            </p>
          </div>

          <div className="rounded-2xl border border-green-500/50 bg-green-950/20 px-5 py-4 text-green-300">
            <p className="text-sm text-zinc-400">Modo</p>
            <p className="text-xl font-bold">Manual y simple</p>
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
                2. Da clic en WhatsApp
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Oboro abre WhatsApp con el mensaje listo para ese cliente.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <h3 className="font-bold text-orange-500">
                3. Presiona enviar
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                El mensaje sale desde el WhatsApp que el negocio tenga abierto.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
          <h2 className="text-2xl font-bold">
            Mensaje de recordatorio
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Puedes cambiar el texto. Oboro reemplaza automaticamente las
            palabras entre llaves con los datos reales de cada cita.
          </p>

          <textarea
            className="mt-5 min-h-44 w-full rounded-xl border border-orange-600/50 bg-black p-4 text-sm leading-6 outline-none"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
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
            {['{{cliente}}', '{{fecha}}', '{{hora}}', '{{servicio}}', '{{empleado}}'].map((campo) => (
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
            No necesitas conectar Meta, tokens ni plantillas aprobadas. El
            negocio envia manualmente desde su WhatsApp normal o WhatsApp
            Business, y Oboro solo le deja el mensaje listo.
          </p>
        </div>
      </section>
    </main>
  )
}
