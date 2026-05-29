'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

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
  comentarios?: {
    cliente_nombre: string
    calificacion: number
    comentario: string
    created_at: string
  }[]
  disponibilidad?: {
    fecha: string
    hora: string
    label: string
  }[]
}

type ReservaCreada = {
  citaId: string
  cliente: string
  servicio: string
  empleado: string
  fecha: string
  hora: string
}

function Estrellas({ valor }: { valor: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((estrella) => (
        <span
          key={estrella}
          className={estrella <= Math.round(valor) ? 'text-yellow-300' : 'text-zinc-700'}
        >
          ★
        </span>
      ))}
    </span>
  )
}

function formatoHoraAmPm(hora: string) {
  const [horasTexto, minutosTexto = '00'] = hora.split(':')
  const horas = Number(horasTexto)
  const minutos = Number(minutosTexto)
  const periodo = horas >= 12 ? 'PM' : 'AM'
  const hora12 = horas % 12 || 12

  return `${hora12}:${String(minutos).padStart(2, '0')} ${periodo}`
}

function formatoFechaCorta(fecha: string) {
  const [year, month, day] = fecha.split('-').map(Number)

  if (!year || !month || !day) return fecha

  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function ReservaPublicaPage() {
  const params = useParams<{ usuarioId: string }>()
  const searchParams = useSearchParams()
  const usuarioId = params.usuarioId
  const empleadoPreferido = searchParams.get('empleado')
  const [negocio, setNegocio] = useState('Oboro Booking')
  const [fotoNegocio, setFotoNegocio] = useState('')
  const [direccionNegocio, setDireccionNegocio] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState('')
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [cargando, setCargando] = useState(true)
  const [agendaDisponible, setAgendaDisponible] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [reservaCreada, setReservaCreada] = useState<ReservaCreada | null>(null)
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
      setDireccionNegocio(data.negocio?.direccion ?? '')
      setGoogleMapsUrl(data.negocio?.google_maps_url ?? '')
      setGoogleReviewsUrl(data.negocio?.google_reviews_url ?? '')
      setServicios(data.servicios ?? [])
      setEmpleados(data.empleados ?? [])
      if (
        empleadoPreferido &&
        (data.empleados ?? []).some((empleado: Empleado) => empleado.ID === empleadoPreferido)
      ) {
        setForm((actual) => ({
          ...actual,
          empleadoId: empleadoPreferido,
          fecha: '',
          hora: '',
        }))
      }
      setAgendaDisponible(true)
      setCargando(false)
    }

    cargarAgenda()
  }, [usuarioId, empleadoPreferido])

  function actualizarCampo(campo: keyof typeof form, valor: string) {
    setReservaCreada(null)
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

    setReservaCreada({
      citaId: data.citaId,
      cliente: form.nombre,
      servicio: servicioSeleccionado?.['Nombre del servicio'] ?? 'Servicio',
      empleado: empleadoSeleccionado?.Nombre ?? 'Profesional',
      fecha: form.fecha,
      hora: form.hora,
    })
    setMensaje('Reservaste tu cita. El negocio recibio tu solicitud.')
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
  const servicioSeleccionado = servicios.find(
    (servicio) => servicio.ID === form.servicioId
  )
  const horariosDisponibles = empleadoSeleccionado?.disponibilidad ?? []
  const inicialesNegocio = negocio
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
  const proximosHorarios = empleados.reduce(
    (total, empleado) => total + (empleado.disponibilidad?.length ?? 0),
    0
  )
  const mapaEmbedUrl =
    direccionNegocio || googleMapsUrl
      ? `https://maps.google.com/maps?q=${encodeURIComponent(
          direccionNegocio || negocio
        )}&output=embed`
      : ''

  return (
    <main className="min-h-screen bg-black px-4 py-5 text-white sm:px-6 lg:px-10">
      <section className="mx-auto grid w-full max-w-7xl items-start gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="overflow-hidden rounded-[28px] border border-orange-500/30 bg-zinc-950 p-4 shadow-2xl shadow-orange-950/30 sm:p-5">
          <div className="rounded-[22px] border border-white/10 bg-black p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[3px] text-orange-300/80">
              Agenda con Oboro Booking
            </p>
            <h1 className="mt-2 text-4xl font-black leading-none text-white sm:text-5xl lg:text-6xl">
              {negocio}
            </h1>

            <div className="mt-5 overflow-hidden rounded-2xl border border-orange-500/25 bg-zinc-900">
              {fotoNegocio ? (
                <img
                  src={fotoNegocio}
                  alt={negocio}
                  className="h-48 w-full object-cover sm:h-56 lg:h-64"
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.26),transparent_36%),linear-gradient(135deg,#171717,#050505)] sm:h-56 lg:h-64">
                  <span className="text-6xl font-black text-orange-300">
                    {inicialesNegocio || 'OB'}
                  </span>
                </div>
              )}
            </div>

            {mapaEmbedUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-green-500/30 bg-black">
                <iframe
                  src={mapaEmbedUrl}
                  title={`Mapa de ${negocio}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-56 w-full border-0 sm:h-64"
                />
              </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-zinc-500">
                  Servicios
                </p>
                <p className="mt-1 text-xl font-black text-orange-200">
                  {servicios.length}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-zinc-500">
                  Equipo
                </p>
                <p className="mt-1 text-xl font-black text-orange-200">
                  {empleados.length}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-zinc-500">
                  Horarios
                </p>
                <p className="mt-1 text-xl font-black text-orange-200">
                  {proximosHorarios}
                </p>
              </div>
            </div>
            {(direccionNegocio || googleMapsUrl || googleReviewsUrl) && (
              <div className="mt-4 grid gap-2">
                {direccionNegocio && (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-5 text-zinc-200">
                    {direccionNegocio}
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-12 rounded-xl border border-green-400/40 bg-green-950/20 px-4 py-3 text-center text-sm font-black text-green-100 transition hover:bg-green-500/20"
                    >
                      Como llegar
                    </a>
                  )}
                  {googleReviewsUrl && (
                    <a
                      href={googleReviewsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-12 rounded-xl border border-yellow-300/40 bg-yellow-950/20 px-4 py-3 text-center text-sm font-black text-yellow-100 transition hover:bg-yellow-400/20"
                    >
                      Resenas Google
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/40 sm:p-6 lg:p-7">
          <div className="mb-6 border-b border-zinc-800 pb-5">
            <p className="text-xs font-bold uppercase tracking-[3px] text-orange-500/80">
              Reserva privada
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              Agenda tu cita
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Elige servicio, profesional y uno de los horarios disponibles.
            </p>
          </div>

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
                className="min-h-12 rounded-lg border border-zinc-800 bg-black p-4 outline-none transition focus:border-orange-500"
                placeholder="Tu nombre"
                value={form.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                required
              />

              <input
                className="min-h-12 rounded-lg border border-zinc-800 bg-black p-4 outline-none transition focus:border-orange-500"
                placeholder="WhatsApp"
                value={form.numero}
                onChange={(e) => actualizarCampo('numero', e.target.value)}
                required
              />

              <input
                className="min-h-12 rounded-lg border border-zinc-800 bg-black p-4 outline-none transition focus:border-orange-500"
                placeholder="Correo opcional"
                type="email"
                value={form.email}
                onChange={(e) => actualizarCampo('email', e.target.value)}
              />

              <select
                className="min-h-12 rounded-lg border border-zinc-800 bg-black p-4 outline-none transition focus:border-orange-500"
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
                className="min-h-12 rounded-lg border border-zinc-800 bg-black p-4 outline-none transition focus:border-orange-500"
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
                <div className="rounded-lg border border-orange-500/30 bg-black p-4">
                  <div className="flex items-center gap-4">
                    {empleadoSeleccionado.foto_url ? (
                      <img
                        src={empleadoSeleccionado.foto_url}
                        alt={empleadoSeleccionado.Nombre}
                        className="h-20 w-20 rounded-lg border border-orange-500/50 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-orange-500/50 bg-zinc-900 text-2xl font-black text-orange-400">
                        {empleadoSeleccionado.Nombre.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-sm text-zinc-500">Te atiende</p>
                      <p className="truncate text-xl font-black text-orange-200">
                        {empleadoSeleccionado.Nombre}
                      </p>
                      {empleadoSeleccionado.Cargo && (
                        <p className="text-sm text-zinc-400">
                          {empleadoSeleccionado.Cargo}
                        </p>
                      )}
                      {empleadoSeleccionado.rating ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <Estrellas valor={empleadoSeleccionado.rating} />
                          <span className="font-bold text-yellow-200">
                            {empleadoSeleccionado.rating}/5
                          </span>
                          <span className="text-zinc-500">
                            {empleadoSeleccionado.resenas} resenas
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-500">
                          Profesional disponible para nuevas experiencias.
                        </p>
                      )}
                    </div>
                  </div>

                  {Boolean(empleadoSeleccionado.comentarios?.length) && (
                    <div className="mt-4 grid gap-2">
                      {empleadoSeleccionado.comentarios?.map((resena, index) => (
                        <div
                          key={`${resena.created_at}-${index}`}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-bold text-zinc-200">
                              {resena.cliente_nombre}
                            </p>
                            <Estrellas valor={resena.calificacion} />
                          </div>
                          <p className="mt-2 text-sm leading-5 text-zinc-400">
                            &quot;{resena.comentario}&quot;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {form.empleadoId && (
                <div className="rounded-lg border border-orange-500/30 bg-black p-4">
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
                            className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-bold transition ${
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
                className="mt-2 min-h-12 rounded-lg bg-orange-500 px-5 py-4 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? 'Reservando...' : 'Reservar cita'}
              </button>
            </form>
          )}

          {reservaCreada && (
            <div className="mt-5 rounded-lg border border-green-500/40 bg-green-950/20 p-5 shadow-lg shadow-green-950/20">
              <p className="text-xs font-bold uppercase tracking-[3px] text-green-300">
                Reserva recibida
              </p>
              <h3 className="mt-2 text-2xl font-black text-white">
                Reservaste tu cita
              </h3>
              <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                <p>Cliente: {reservaCreada.cliente}</p>
                <p>Servicio: {reservaCreada.servicio}</p>
                <p>Profesional: {reservaCreada.empleado}</p>
                <p>
                  Horario: {formatoFechaCorta(reservaCreada.fecha)} ·{' '}
                  {formatoHoraAmPm(reservaCreada.hora)}
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                Guarda este enlace para confirmar, cancelar, reprogramar y calificar
                tu experiencia cuando la cita haya sido completada.
              </p>
              <a
                href={`/reserva/${reservaCreada.citaId}`}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-green-400/60 px-4 text-sm font-bold text-green-100 transition hover:bg-green-500/10"
              >
                Ver o gestionar mi cita
              </a>
            </div>
          )}

          {(servicioSeleccionado || empleadoSeleccionado || form.fecha) && (
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs font-bold uppercase tracking-[2px] text-zinc-500">
                Tu seleccion
              </p>
              <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                <p>{servicioSeleccionado?.['Nombre del servicio'] ?? 'Servicio pendiente'}</p>
                <p>{empleadoSeleccionado?.Nombre ?? 'Profesional pendiente'}</p>
                <p>
                  {form.fecha && form.hora
                    ? `${formatoFechaCorta(form.fecha)} · ${formatoHoraAmPm(form.hora)}`
                    : 'Horario pendiente'}
                </p>
              </div>
            </div>
          )}

          {mensaje && agendaDisponible && (
            <p className="mt-4 rounded-lg border border-orange-500/40 bg-black px-4 py-3 text-sm text-orange-200">
              {mensaje}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
