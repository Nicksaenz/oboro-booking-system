'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

export default function EstadoReservaPage() {
  const params = useParams<{ citaId: string }>()
  const searchParams = useSearchParams()
  const citaId = params.citaId
  const accionInicial = searchParams.get('accion')
  const [mensaje, setMensaje] = useState('Revisando tu reserva...')
  const [procesando, setProcesando] = useState(Boolean(accionInicial))

  async function actualizarReserva(accion: 'confirmar' | 'cancelar') {
    setProcesando(true)
    setMensaje('Actualizando tu reserva...')

    const response = await fetch(`/api/reservas/estado/${citaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accion }),
    })
    const data = await response.json()

    setMensaje(data.mensaje ?? data.error ?? 'No se pudo actualizar la reserva.')
    setProcesando(false)
  }

  useEffect(() => {
    if (accionInicial === 'confirmar' || accionInicial === 'cancelar') {
      actualizarReserva(accionInicial)
      return
    }

    setMensaje('Elige que quieres hacer con tu reserva.')
  }, [accionInicial])

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-xl flex-col justify-center">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <div className="mt-6 rounded-2xl border border-orange-600/40 bg-zinc-950 p-6 shadow-2xl shadow-orange-950/20">
          <h1 className="text-3xl font-black leading-tight md:text-4xl">
            Estado de tu cita
          </h1>

          <p className="mt-4 rounded-xl border border-zinc-800 bg-black px-4 py-4 text-sm leading-6 text-zinc-200">
            {mensaje}
          </p>

          {!accionInicial && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={procesando}
                onClick={() => actualizarReserva('confirmar')}
                className="min-h-12 rounded-xl bg-green-600 px-5 py-3 font-bold transition hover:bg-green-700 disabled:opacity-60"
              >
                Confirmar asistencia
              </button>

              <button
                type="button"
                disabled={procesando}
                onClick={() => actualizarReserva('cancelar')}
                className="min-h-12 rounded-xl bg-red-600 px-5 py-3 font-bold transition hover:bg-red-700 disabled:opacity-60"
              >
                Cancelar cita
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
