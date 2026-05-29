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
  const [cita, setCita] = useState<any>(null)
  const [disponibilidad, setDisponibilidad] = useState<
    { fecha: string; hora: string; label: string }[]
  >([])
  const [reprogramando, setReprogramando] = useState(false)
  const [slotSeleccionado, setSlotSeleccionado] = useState('')
  const [calificacion, setCalificacion] = useState(5)
  const [comentario, setComentario] = useState('')

  async function cargarReserva() {
    const response = await fetch(`/api/reservas/estado/${citaId}`)
    const data = await response.json()

    if (!response.ok) {
      setMensaje(data.error ?? 'No se pudo cargar la reserva.')
      return
    }

    setCita(data.cita)
    setDisponibilidad(data.disponibilidad ?? [])
    setMensaje('Elige que quieres hacer con tu reserva.')
  }

  async function actualizarReserva(accion: 'confirmar' | 'cancelar' | 'reprogramar') {
    setProcesando(true)
    setMensaje('Actualizando tu reserva...')
    const [fecha, hora] = slotSeleccionado.split('|')

    const response = await fetch(`/api/reservas/estado/${citaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accion, fecha, hora }),
    })
    const data = await response.json()

    setMensaje(data.mensaje ?? data.error ?? 'No se pudo actualizar la reserva.')
    setProcesando(false)
    setReprogramando(false)

    if (response.ok) {
      cargarReserva()
    }
  }

  async function enviarResena() {
    setProcesando(true)
    setMensaje('Guardando tu calificacion...')

    const response = await fetch(`/api/reservas/estado/${citaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accion: 'resenar',
        calificacion,
        comentario,
      }),
    })
    const data = await response.json()

    setMensaje(data.mensaje ?? data.error ?? 'No se pudo guardar la calificacion.')
    setProcesando(false)
  }

  useEffect(() => {
    if (accionInicial === 'confirmar' || accionInicial === 'cancelar') {
      actualizarReserva(accionInicial)
      return
    }

    cargarReserva()
  }, [accionInicial])

  const volverReservarUrl = cita?.ID_Usuario
    ? `/reservar/${cita.ID_Usuario}${
        cita.ID_Empleado ? `?empleado=${cita.ID_Empleado}` : ''
      }`
    : ''

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

          {cita && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black px-4 py-4 text-sm leading-6 text-zinc-300">
              <p className="font-bold text-orange-300">
                {cita.SERVICIOS?.['Nombre del servicio'] ?? 'Servicio'}
              </p>
              <p>Cliente: {cita.Clientes?.Nombre ?? 'cliente'}</p>
              <p>
                Fecha actual: {cita.Fecha} {cita.Hora}
              </p>
              <p>Estado: {cita.Estado}</p>
            </div>
          )}

          {!accionInicial && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
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

              <button
                type="button"
                disabled={procesando}
                onClick={() => setReprogramando((actual) => !actual)}
                className="min-h-12 rounded-xl border border-orange-600/60 px-5 py-3 font-bold text-orange-200 transition hover:bg-orange-600/10 disabled:opacity-60"
              >
                Reprogramar
              </button>
            </div>
          )}

          {reprogramando && (
            <div className="mt-5 rounded-xl border border-orange-600/30 bg-black p-4">
              <p className="text-sm font-bold text-orange-300">
                Nuevo horario
              </p>
              <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                {disponibilidad.map((slot) => {
                  const value = `${slot.fecha}|${slot.hora}`

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSlotSeleccionado(value)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                        slotSeleccionado === value
                          ? 'border-orange-400 bg-orange-600 text-black'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-orange-500'
                      }`}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                disabled={procesando || !slotSeleccionado}
                onClick={() => actualizarReserva('reprogramar')}
                className="mt-4 min-h-12 w-full rounded-xl bg-orange-600 px-5 py-3 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Guardar nuevo horario
              </button>
            </div>
          )}

          {cita?.Estado === 'completada' && (
            <div className="mt-5 rounded-xl border border-yellow-600/30 bg-black p-4">
              <p className="text-sm font-bold text-yellow-300">
                Califica tu experiencia
              </p>
              <select
                value={calificacion}
                onChange={(e) => setCalificacion(Number(e.target.value))}
                className="mt-3 min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 outline-none"
              >
                <option value={5}>5 - Excelente</option>
                <option value={4}>4 - Muy buena</option>
                <option value={3}>3 - Buena</option>
                <option value={2}>2 - Puede mejorar</option>
                <option value={1}>1 - Mala</option>
              </select>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Comentario opcional"
                className="mt-3 min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 outline-none"
              />
              <button
                type="button"
                disabled={procesando}
                onClick={enviarResena}
                className="mt-3 min-h-12 w-full rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black transition hover:bg-yellow-400 disabled:opacity-60"
              >
                Enviar calificacion
              </button>
            </div>
          )}

          {volverReservarUrl && (
            <a
              href={volverReservarUrl}
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl border border-orange-500/60 px-5 py-3 text-center font-bold text-orange-100 transition hover:bg-orange-500/10"
            >
              Volver a reservar con este profesional
            </a>
          )}
        </div>
      </section>
    </main>
  )
}
