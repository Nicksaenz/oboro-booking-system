'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Servicio = {
  ID: string
  'Nombre del servicio': string
  'Precio del servicio': number
}

type Empleado = {
  ID: string
  Nombre: string
  Cargo?: string
  foto_url?: string | null
  rating?: number | null
  resenas?: number
  disponibilidad?: {
    fecha: string
    hora: string
    label: string
  }[]
}

export default function ReservaPublicaPage() {
  const params = useParams<{ usuarioId: string }>()
  const usuarioId = params.usuarioId
  const [negocio, setNegocio] = useState('Oboro Booking')
  const [fotoNegocio, setFotoNegocio] = useState('')
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [cargando, setCargando] = useState(true)
  const [agendaDisponible, setAgendaDisponible] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    numero: '',
    email: '',
    servicioId: '',
    empleadoId: '',
    fecha: '',
    hora: '',
  })

  useEffect(() => {
    async function cargarAgenda() {
      const response = await fetch(`/api/reservas/publica/${usuarioId}`)
      const data = await response.json()

      if (!response.ok) {
        setMensaje(data.error ?? 'No se pudo cargar la agenda.')
        setAgendaDisponible(false)
        setCargando(false)
        return
      }

      setNegocio(data.negocio?.nombre ?? 'Oboro Booking')
      setFotoNegocio(data.negocio?.foto_url ?? '')
      setServicios(data.servicios ?? [])
      setEmpleados(data.empleados ?? [])
      setAgendaDisponible(true)
      setCargando(false)
    }

    cargarAgenda()
  }, [usuarioId])

  function actualizarCampo(campo: keyof typeof form, valor: string) {
    setForm((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  async function crearReserva(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    const response = await fetch(`/api/reservas/publica/${usuarioId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    })
    const data = await response.json()

    if (!response.ok) {
      setMensaje(data.error ?? 'No se pudo crear la reserva.')
      setGuardando(false)
      return
    }

    setMensaje('Reserva creada. El negocio recibira tu solicitud.')
    setForm({
      nombre: '',
      numero: '',
      email: '',
      servicioId: '',
      empleadoId: '',
      fecha: '',
      hora: '',
    })
    setGuardando(false)
  }

  const empleadoSeleccionado = empleados.find(
    (empleado) => empleado.ID === form.empleadoId
  )
  const horariosDisponibles = empleadoSeleccionado?.disponibilidad ?? []

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-3xl flex-col justify-center">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <div className="mt-2 flex items-center gap-4">
          {fotoNegocio && (
            <img
              src={fotoNegocio}
              alt={negocio}
              className="h-16 w-16 rounded-full border border-orange-500/50 object-cover"
            />
          )}

          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            Agenda tu cita
          </h1>
        </div>

        <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
          Reserva directamente con {negocio}. Elige servicio, profesional, fecha
          y hora.
        </p>

        <div className="mt-8 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
          {cargando ? (
            <p className="py-10 text-center font-bold text-orange-400">
              Cargando agenda...
            </p>
          ) : !agendaDisponible ? (
            <div className="py-8 text-center">
              <h2 className="text-2xl font-bold text-orange-500">
                Agenda no disponible
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
                Este negocio aun no tiene activada la agenda publica para
                reservas por QR.
              </p>
            </div>
          ) : servicios.length === 0 || empleados.length === 0 ? (
            <div className="py-8 text-center">
              <h2 className="text-2xl font-bold text-orange-500">
                Agenda en configuracion
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
                El negocio debe agregar servicios y empleados activos antes de
                recibir reservas por este link.
              </p>
            </div>
          ) : (
            <form onSubmit={crearReserva} className="grid gap-3">
              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                placeholder="Tu nombre"
                value={form.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                required
              />

              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                placeholder="WhatsApp"
                value={form.numero}
                onChange={(e) => actualizarCampo('numero', e.target.value)}
                required
              />

              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                placeholder="Correo opcional"
                type="email"
                value={form.email}
                onChange={(e) => actualizarCampo('email', e.target.value)}
              />

              <select
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                value={form.servicioId}
                onChange={(e) => actualizarCampo('servicioId', e.target.value)}
                required
              >
                <option value="">Selecciona un servicio</option>
                {servicios.map((servicio) => (
                  <option key={servicio.ID} value={servicio.ID}>
                    {servicio['Nombre del servicio']} - $
                    {Number(servicio['Precio del servicio'] ?? 0).toLocaleString('es-CO')}
                  </option>
                ))}
              </select>

              <select
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                value={form.empleadoId}
                onChange={(e) => {
                  actualizarCampo('empleadoId', e.target.value)
                  actualizarCampo('fecha', '')
                  actualizarCampo('hora', '')
                }}
                required
              >
                <option value="">Selecciona quien te atiende</option>
                {empleados.map((empleado) => (
                  <option key={empleado.ID} value={empleado.ID}>
                    {empleado.Nombre}
                    {empleado.Cargo ? ` - ${empleado.Cargo}` : ''}
                  </option>
                ))}
              </select>

              {empleadoSeleccionado && (
                <div className="flex items-center gap-4 rounded-xl border border-orange-600/30 bg-black p-4">
                  {empleadoSeleccionado.foto_url ? (
                    <img
                      src={empleadoSeleccionado.foto_url}
                      alt={empleadoSeleccionado.Nombre}
                      className="h-16 w-16 rounded-full border border-orange-500/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/50 bg-zinc-900 text-xl font-black text-orange-400">
                      {empleadoSeleccionado.Nombre.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-zinc-500">Te atiende</p>
                    <p className="font-bold text-orange-300">
                      {empleadoSeleccionado.Nombre}
                    </p>
                    {empleadoSeleccionado.Cargo && (
                      <p className="text-sm text-zinc-400">
                        {empleadoSeleccionado.Cargo}
                      </p>
                    )}
                    {empleadoSeleccionado.rating && (
                      <p className="mt-1 text-sm text-yellow-300">
                        {empleadoSeleccionado.rating}/5 · {empleadoSeleccionado.resenas} resenas
                      </p>
                    )}
                  </div>
                </div>
              )}

              {form.empleadoId && (
                <div className="rounded-xl border border-orange-600/30 bg-black p-4">
                  <p className="text-sm font-bold text-orange-300">
                    Horarios disponibles
                  </p>
                  {horariosDisponibles.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-400">
                      No hay horarios libres para este profesional en los proximos dias.
                    </p>
                  ) : (
                    <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                      {horariosDisponibles.map((slot) => {
                        const activo =
                          form.fecha === slot.fecha && form.hora === slot.hora

                        return (
                          <button
                            key={`${slot.fecha}-${slot.hora}`}
                            type="button"
                            onClick={() => {
                              actualizarCampo('fecha', slot.fecha)
                              actualizarCampo('hora', slot.hora)
                            }}
                            className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                              activo
                                ? 'border-orange-400 bg-orange-600 text-black'
                                : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-orange-500'
                            }`}
                          >
                            {slot.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={guardando || !form.fecha || !form.hora}
                className="mt-2 min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? 'Reservando...' : 'Reservar cita'}
              </button>
            </form>
          )}

          {mensaje && agendaDisponible && (
            <p className="mt-4 rounded-xl border border-orange-500/40 bg-black px-4 py-3 text-sm text-orange-200">
              {mensaje}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
