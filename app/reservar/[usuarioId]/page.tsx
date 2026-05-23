'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Servicio = {
  ID: string
  'Nombre del servicio': string
  'Precio del servicio': number
  'DuraciÃ³n en minutos'?: number
}

type Empleado = {
  ID: string
  Nombre: string
  Cargo?: string
}

export default function ReservaPublicaPage() {
  const params = useParams<{ usuarioId: string }>()
  const usuarioId = params.usuarioId
  const [negocio, setNegocio] = useState('Oboro Booking')
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [cargando, setCargando] = useState(true)
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
        setCargando(false)
        return
      }

      setNegocio(data.negocio?.nombre ?? 'Oboro Booking')
      setServicios(data.servicios ?? [])
      setEmpleados(data.empleados ?? [])
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

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-3xl flex-col justify-center">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
          Agenda tu cita
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
          Reserva directamente con {negocio}. Elige servicio, profesional, fecha
          y hora.
        </p>

        <div className="mt-8 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
          {cargando ? (
            <p className="py-10 text-center font-bold text-orange-400">
              Cargando agenda...
            </p>
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
                onChange={(e) => actualizarCampo('empleadoId', e.target.value)}
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

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => actualizarCampo('fecha', e.target.value)}
                  required
                />

                <input
                  className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                  type="time"
                  value={form.hora}
                  onChange={(e) => actualizarCampo('hora', e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="mt-2 min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? 'Reservando...' : 'Reservar cita'}
              </button>
            </form>
          )}

          {mensaje && (
            <p className="mt-4 rounded-xl border border-orange-500/40 bg-black px-4 py-3 text-sm text-orange-200">
              {mensaje}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
