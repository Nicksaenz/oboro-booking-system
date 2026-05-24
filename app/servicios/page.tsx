'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { mensajePermiso, obtenerContextoEquipo, type ContextoEquipo } from '@/lib/equipo'

type Servicio = {
  ID: string
  'Nombre del servicio': string | null
  'Precio del servicio': number | null
  ACTIVO: boolean | null
  [key: string]: unknown
}

type FormularioServicio = {
  nombre: string
  duracion: string
  precio: string
}

const FORMULARIO_INICIAL: FormularioServicio = {
  nombre: '',
  duracion: '',
  precio: '',
}

const DURACION_COLUMN = 'Duraci\u00f3n en minutos'
const DURACION_KEYS = [
  DURACION_COLUMN,
  'DuraciÃ³n en minutos',
  'DuraciÃƒÂ³n en minutos',
  'Duracion en minutos',
]

function formatoCop(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function obtenerDuracion(servicio: Servicio) {
  const valor = DURACION_KEYS.map((key) => servicio[key]).find(
    (item) => item !== null && item !== undefined && item !== ''
  )

  return Number(valor ?? 0)
}

export default function ServiciosPage() {
  const router = useRouter()
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [formulario, setFormulario] =
    useState<FormularioServicio>(FORMULARIO_INICIAL)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<
    'todos' | 'activos' | 'inactivos'
  >('todos')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(
    null
  )
  const [contexto, setContexto] = useState<ContextoEquipo | null>(null)

  const serviciosActivos = servicios.filter(
    (servicio) => servicio.ACTIVO !== false
  )
  const ingresosPotenciales = serviciosActivos.reduce(
    (total, servicio) => total + Number(servicio['Precio del servicio'] ?? 0),
    0
  )
  const duracionPromedio = serviciosActivos.length
    ? Math.round(
        serviciosActivos.reduce(
          (total, servicio) => total + obtenerDuracion(servicio),
          0
        ) / serviciosActivos.length
      )
    : 0

  const serviciosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    return servicios.filter((servicio) => {
      const coincideBusqueda = termino
        ? String(servicio['Nombre del servicio'] ?? '')
            .toLowerCase()
            .includes(termino)
        : true
      const activo = servicio.ACTIVO !== false
      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && activo) ||
        (filtroEstado === 'inactivos' && !activo)

      return coincideBusqueda && coincideEstado
    })
  }, [busqueda, filtroEstado, servicios])

  function actualizarCampo(campo: keyof FormularioServicio, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }))
  }

  async function cargarServicios() {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
      router.push('/login')
      return
    }

    const acceso = await obtenerContextoEquipo()

    if (!acceso) {
      router.push('/login')
      return
    }

    setContexto(acceso)

    const { data, error } = await supabase
      .from('SERVICIOS')
      .select('*')
      .eq('ID DE USUARIO', acceso.negocioId)
      .order('Nombre del servicio', { ascending: true })

    if (error) {
      setMensaje(`Error: ${error.message}`)
    } else {
      setServicios(data ?? [])
    }

    setCargando(false)
  }

  async function guardarServicio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    const acceso = contexto ?? (await obtenerContextoEquipo())

    if (!acceso?.esAdmin) {
      setMensaje(mensajePermiso('crear o editar servicios'))
      setGuardando(false)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
      router.push('/login')
      return
    }

    const payload = {
      'Nombre del servicio': formulario.nombre.trim(),
      [DURACION_COLUMN]: Number(formulario.duracion),
      'Precio del servicio': Number(formulario.precio),
      ACTIVO: true,
      'ID DE USUARIO': acceso.negocioId,
    }

    const operacion = servicioEditando
      ? supabase.from('SERVICIOS').update(payload).eq('ID', servicioEditando.ID)
      : supabase.from('SERVICIOS').insert([payload])

    const { error } = await operacion

    if (error) {
      setMensaje(`Error: ${error.message}`)
      setGuardando(false)
      return
    }

    setMensaje(
      servicioEditando
        ? 'Servicio actualizado correctamente.'
        : 'Servicio guardado correctamente.'
    )
    setFormulario(FORMULARIO_INICIAL)
    setServicioEditando(null)
    setGuardando(false)
    cargarServicios()
  }

  async function cambiarEstadoServicio(servicio: Servicio) {
    if (!contexto?.esAdmin) {
      setMensaje(mensajePermiso('cambiar servicios'))
      return
    }

    const { error } = await supabase
      .from('SERVICIOS')
      .update({ ACTIVO: servicio.ACTIVO === false })
      .eq('ID', servicio.ID)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setMensaje('Estado del servicio actualizado.')
    cargarServicios()
  }

  function editarServicio(servicio: Servicio) {
    if (!contexto?.esAdmin) {
      setMensaje(mensajePermiso('editar servicios'))
      return
    }

    setServicioEditando(servicio)
    setFormulario({
      nombre: servicio['Nombre del servicio'] ?? '',
      duracion: String(obtenerDuracion(servicio) || ''),
      precio: String(servicio['Precio del servicio'] ?? ''),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setServicioEditando(null)
    setFormulario(FORMULARIO_INICIAL)
  }

  async function eliminarServicio(servicio: Servicio) {
    if (!contexto?.esAdmin) {
      setMensaje('Solo el administrador puede eliminar servicios.')
      return
    }

    const confirmar = window.confirm(
      `Seguro que deseas eliminar ${
        servicio['Nombre del servicio'] ?? 'este servicio'
      }?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('SERVICIOS')
      .delete()
      .eq('ID', servicio.ID)

    if (error) {
      setMensaje(
        `No se pudo eliminar. Si tiene citas creadas, desactivalo para conservar el historial. ${error.message}`
      )
      return
    }

    setMensaje('Servicio eliminado correctamente.')
    cargarServicios()
  }

  useEffect(() => {
    cargarServicios()
  }, [])

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              Servicios
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Construye tu catalogo comercial con precios claros, duraciones y
              servicios activos para reservar.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-orange-600/30 bg-zinc-950 p-3 shadow-2xl shadow-orange-950/20 sm:min-w-[460px]">
            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-xs text-zinc-500">Activos</p>
              <p className="mt-1 text-2xl font-black text-green-400">
                {serviciosActivos.length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-xs text-zinc-500">Ticket base</p>
              <p className="mt-1 text-lg font-black text-orange-500">
                {formatoCop(ingresosPotenciales)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-xs text-zinc-500">Duracion prom.</p>
              <p className="mt-1 text-2xl font-black text-zinc-100">
                {duracionPromedio}m
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={guardarServicio}
          className="mt-8 rounded-2xl border border-orange-600/30 bg-zinc-950/80 p-4 shadow-2xl shadow-orange-950/20 sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none transition focus:border-orange-400"
              placeholder="Nombre del servicio"
              value={formulario.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              required
            />

            <input
              className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none transition focus:border-orange-400"
              placeholder="Duracion en minutos"
              type="number"
              min="1"
              value={formulario.duracion}
              onChange={(e) => actualizarCampo('duracion', e.target.value)}
              required
            />

            <input
              className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none transition focus:border-orange-400"
              placeholder="Precio en COP"
              type="number"
              min="0"
              value={formulario.precio}
              onChange={(e) => actualizarCampo('precio', e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={guardando || !contexto?.esAdmin}
              className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:opacity-60"
            >
              {guardando
                ? 'Guardando...'
                : !contexto?.esAdmin
                  ? 'Solo admin'
                : servicioEditando
                  ? 'Guardar cambios'
                  : 'Guardar servicio'}
            </button>
          </div>

          {servicioEditando && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className="mt-3 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:border-orange-500 hover:text-orange-300"
            >
              Cancelar edicion
            </button>
          )}
        </form>

        {mensaje && (
          <p className="mt-5 rounded-xl border border-orange-500/40 bg-orange-950/20 px-4 py-3 text-sm text-orange-200">
            {mensaje}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">Catalogo de servicios</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Activa solo los servicios que quieres permitir en agenda y QR.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:min-w-[520px]">
            <input
              className="min-h-12 rounded-xl border border-zinc-800 bg-black p-4 outline-none transition focus:border-orange-500"
              placeholder="Buscar servicio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className="min-h-12 rounded-xl border border-zinc-800 bg-black p-4 outline-none transition focus:border-orange-500"
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(
                  e.target.value as 'todos' | 'activos' | 'inactivos'
                )
              }
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>
        </div>

        {cargando ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
            Cargando servicios...
          </div>
        ) : serviciosFiltrados.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-orange-600/40 bg-zinc-950 p-8 text-center">
            <h2 className="text-2xl font-bold text-orange-500">
              Aun no hay servicios visibles
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Crea tu primer servicio o cambia el filtro de busqueda.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {serviciosFiltrados.map((servicio) => {
              const activo = servicio.ACTIVO !== false
              const precio = Number(servicio['Precio del servicio'] ?? 0)
              const duracion = obtenerDuracion(servicio)

              return (
                <article
                  key={servicio.ID}
                  className={`flex min-h-[270px] flex-col rounded-2xl border bg-zinc-950 p-5 shadow-lg transition ${
                    activo
                      ? 'border-orange-600/35 shadow-orange-950/20 hover:border-orange-500/70'
                      : 'border-zinc-800 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-orange-500">
                        {servicio['Nombre del servicio'] || 'Servicio sin nombre'}
                      </h2>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[2px] text-zinc-600">
                        Servicio del catalogo
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        activo
                          ? 'border-green-600/40 bg-green-950/20 text-green-300'
                          : 'border-zinc-700 bg-black text-zinc-400'
                      }`}
                    >
                      {activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-zinc-800 bg-black p-4">
                      <p className="text-xs text-zinc-500">Duracion</p>
                      <p className="mt-1 text-xl font-black">{duracion} min</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-black p-4">
                      <p className="text-xs text-zinc-500">Precio</p>
                      <p className="mt-1 text-xl font-black text-orange-400">
                        {formatoCop(precio)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-zinc-400">
                    {activo
                      ? 'Disponible para crear citas y mostrarse en la agenda publica segun el plan.'
                      : 'Oculto para nuevas reservas, conservando el historial existente.'}
                  </p>

                  <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => cambiarEstadoServicio(servicio)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        activo
                          ? 'border-red-600/60 text-red-200 hover:bg-red-600/10'
                          : 'border-green-600/60 text-green-200 hover:bg-green-600/10'
                      }`}
                    >
                      {activo ? 'Pausar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => editarServicio(servicio)}
                      className="min-h-11 rounded-xl border border-orange-600/60 px-3 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarServicio(servicio)}
                      className="min-h-11 rounded-xl border border-red-600/60 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-600/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
