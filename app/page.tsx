'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { obtenerContextoEquipo } from '@/lib/equipo'

type Cita = {
  ID: string
  Fecha: string | null
  Hora: string | null
  Estado: string | null
  Clientes?: { Nombre?: string | null } | null
  SERVICIOS?: {
    'Nombre del servicio'?: string | null
    'Precio del servicio'?: number | null
  } | null
  Empleados?: { Nombre?: string | null } | null
}

type Suscripcion = {
  estado?: string | null
  fecha_vencimiento?: string | null
  plan?: string | null
  nombre_negocio?: string | null
  telefono?: string | null
  foto_negocio_url?: string | null
  direccion_negocio?: string | null
  google_maps_url?: string | null
  google_reviews_url?: string | null
}

type AccesoSuscripcion = {
  negocio_id?: string
  rol?: string
  es_admin_principal?: boolean
}

type CitaIngreso = {
  Estado?: string | null
  SERVICIOS?: {
    'Precio del servicio'?: number | null
  } | null
}

type Metricas = {
  clientes: number
  empleados: number
  servicios: number
  serviciosActivos: number
  citas: number
  citasHoy: number
  citasPendientes: number
  citasMes: number
  ingresosMes: number
}

const METRICAS_INICIALES: Metricas = {
  clientes: 0,
  empleados: 0,
  servicios: 0,
  serviciosActivos: 0,
  citas: 0,
  citasHoy: 0,
  citasPendientes: 0,
  citasMes: 0,
  ingresosMes: 0,
}

const ESTADOS_INGRESO = ['confirmada', 'completada', 'pendiente']
const MAX_FOTO_NEGOCIO_CHARS = 650_000

function formatoCop(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function fechaIsoLocal(fecha = new Date()) {
  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const day = String(fecha.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatoFecha(fecha: string | null) {
  if (!fecha) return 'Sin fecha'

  const [year, month, day] = fecha.split('-').map(Number)
  if (!year || !month || !day) return fecha

  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatoHoraAmPm(hora: string | null) {
  if (!hora) return 'Sin hora'

  const [horasTexto, minutosTexto = '00'] = hora.split(':')
  const horas = Number(horasTexto)
  const minutos = Number(minutosTexto)

  if (Number.isNaN(horas)) return hora

  const periodo = horas >= 12 ? 'PM' : 'AM'
  const hora12 = horas % 12 || 12

  return `${hora12}:${String(minutos).padStart(2, '0')} ${periodo}`
}

function normalizarPlan(plan?: string | null) {
  const valor = String(plan ?? 'trial').toLowerCase()

  if (valor === 'business' || valor === 'premium') return 'Business'
  if (valor === 'pro') return 'Pro'
  if (valor === 'basico') return 'Basico'

  return 'Trial'
}

function estadoColor(estado?: string | null) {
  const valor = String(estado ?? '').toLowerCase()

  if (valor === 'confirmada') return 'text-green-300 border-green-600/40 bg-green-950/20'
  if (valor === 'completada') return 'text-blue-300 border-blue-600/40 bg-blue-950/20'
  if (valor === 'cancelada') return 'text-red-300 border-red-600/40 bg-red-950/20'

  return 'text-yellow-300 border-yellow-600/40 bg-yellow-950/20'
}

function leerArchivoComoImagen(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

async function optimizarImagenNegocio(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen.')
  }

  if (file.size > 6 * 1024 * 1024) {
    throw new Error('La imagen debe pesar menos de 6 MB.')
  }

  const dataUrl = await leerArchivoComoImagen(file)
  const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
    img.src = dataUrl
  })
  const maxSize = 720
  const escala = Math.min(1, maxSize / Math.max(imagen.width, imagen.height))
  const width = Math.max(1, Math.round(imagen.width * escala))
  const height = Math.max(1, Math.round(imagen.height * escala))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('No se pudo preparar la imagen.')
  }

  canvas.width = width
  canvas.height = height
  context.drawImage(imagen, 0, 0, width, height)

  let calidad = 0.72
  let resultado = canvas.toDataURL('image/jpeg', calidad)

  while (resultado.length > MAX_FOTO_NEGOCIO_CHARS && calidad > 0.42) {
    calidad -= 0.08
    resultado = canvas.toDataURL('image/jpeg', calidad)
  }

  if (resultado.length > MAX_FOTO_NEGOCIO_CHARS) {
    throw new Error('La imagen sigue muy pesada. Intenta con una foto mas liviana.')
  }

  return resultado
}

export default function DashboardPage() {
  const router = useRouter()
  const [metricas, setMetricas] = useState<Metricas>(METRICAS_INICIALES)
  const [proximasCitas, setProximasCitas] = useState<Cita[]>([])
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null)
  const [acceso, setAcceso] = useState<AccesoSuscripcion | null>(null)
  const [nombreEditable, setNombreEditable] = useState('')
  const [direccionEditable, setDireccionEditable] = useState('')
  const [googleMapsEditable, setGoogleMapsEditable] = useState('')
  const [googleReviewsEditable, setGoogleReviewsEditable] = useState('')
  const [fotoPreview, setFotoPreview] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')

  const pasosConfiguracion = useMemo(
    () => [
      {
        nombre: 'Clientes',
        listo: metricas.clientes > 0,
        texto: 'Base de contactos',
        href: '/clientes',
      },
      {
        nombre: 'Servicios',
        listo: metricas.serviciosActivos > 0,
        texto: 'Catalogo activo',
        href: '/servicios',
      },
      {
        nombre: 'Empleados',
        listo: metricas.empleados > 0,
        texto: 'Equipo disponible',
        href: '/empleados',
      },
      {
        nombre: 'Citas',
        listo: metricas.citas > 0,
        texto: 'Agenda en uso',
        href: '/citas',
      },
    ],
    [metricas]
  )
  const pasosListos = pasosConfiguracion.filter((paso) => paso.listo).length
  const progreso = Math.round((pasosListos / pasosConfiguracion.length) * 100)
  const plan = normalizarPlan(suscripcion?.plan)
  const negocio = suscripcion?.nombre_negocio || 'Tu negocio'
  const fotoNegocio = fotoPreview || suscripcion?.foto_negocio_url || ''
  const reservasPendientes = proximasCitas.filter(
    (cita) => String(cita.Estado ?? '').toLowerCase() === 'pendiente'
  )
  const puedeEditarPerfil = acceso?.rol === 'admin'
  const fechaVencimiento = suscripcion?.fecha_vencimiento
    ? new Date(suscripcion.fecha_vencimiento).toLocaleDateString('es-CO')
    : 'Sin fecha'

  async function cargarDashboard() {
    setCargando(true)
    setMensaje('')

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    const token = sessionData.session?.access_token

    if (!user || !token) {
      router.push('/login')
      return
    }

    const contexto = await obtenerContextoEquipo()

    if (!contexto) {
      router.push('/login')
      return
    }

    const negocioId = contexto.negocioId
    const empleadoAsignadoId =
      !contexto.esAdmin && contexto.empleadoId
        ? contexto.empleadoId
        : null

    const hoy = fechaIsoLocal()
    const inicioMes = fechaIsoLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const finMes = fechaIsoLocal(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))

    const citasBase = supabase
      .from('Citas')
      .select('*', { count: 'exact', head: true })
      .eq('ID_Usuario', negocioId)
    const citasHoyBase = supabase
      .from('Citas')
      .select('*', { count: 'exact', head: true })
      .eq('ID_Usuario', negocioId)
      .eq('Fecha', hoy)
    const citasPendientesBase = supabase
      .from('Citas')
      .select('*', { count: 'exact', head: true })
      .eq('ID_Usuario', negocioId)
      .eq('Estado', 'pendiente')
    const citasMesBase = supabase
      .from('Citas')
      .select('*', { count: 'exact', head: true })
      .eq('ID_Usuario', negocioId)
      .gte('Fecha', inicioMes)
      .lte('Fecha', finMes)
    const citasMesDataBase = supabase
      .from('Citas')
      .select(`
        Estado,
        SERVICIOS:ID_Servicio (
          "Precio del servicio"
        )
      `)
      .eq('ID_Usuario', negocioId)
      .gte('Fecha', inicioMes)
      .lte('Fecha', finMes)
    const proximasBase = supabase
      .from('Citas')
      .select(`
        ID,
        Fecha,
        Hora,
        Estado,
        Clientes:ID_Cliente (
          Nombre
        ),
        SERVICIOS:ID_Servicio (
          "Nombre del servicio",
          "Precio del servicio"
        ),
        Empleados:ID_Empleado (
          Nombre
        )
      `)
      .eq('ID_Usuario', negocioId)
      .gte('Fecha', hoy)
      .neq('Estado', 'cancelada')
      .order('Fecha', { ascending: true })
      .order('Hora', { ascending: true })
      .limit(5)

    if (empleadoAsignadoId) {
      citasBase.eq('ID_Empleado', empleadoAsignadoId)
      citasHoyBase.eq('ID_Empleado', empleadoAsignadoId)
      citasPendientesBase.eq('ID_Empleado', empleadoAsignadoId)
      citasMesBase.eq('ID_Empleado', empleadoAsignadoId)
      citasMesDataBase.eq('ID_Empleado', empleadoAsignadoId)
      proximasBase.eq('ID_Empleado', empleadoAsignadoId)
    } else if (!contexto.esAdmin) {
      citasBase.eq('ID_Empleado', '00000000-0000-0000-0000-000000000000')
      citasHoyBase.eq('ID_Empleado', '00000000-0000-0000-0000-000000000000')
      citasPendientesBase.eq('ID_Empleado', '00000000-0000-0000-0000-000000000000')
      citasMesBase.eq('ID_Empleado', '00000000-0000-0000-0000-000000000000')
      citasMesDataBase.eq('ID_Empleado', '00000000-0000-0000-0000-000000000000')
      proximasBase.eq('ID_Empleado', '00000000-0000-0000-0000-000000000000')
    }

    const [
      clientesRes,
      empleadosRes,
      serviciosRes,
      serviciosActivosRes,
      citasRes,
      citasHoyRes,
      citasPendientesRes,
      citasMesRes,
      citasMesDataRes,
      proximasRes,
      suscripcionRes,
    ] = await Promise.all([
      supabase
        .from('Clientes')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', negocioId),
      supabase
        .from('Empleados')
        .select('*', { count: 'exact', head: true })
        .eq('ID de Usuario', negocioId),
      supabase
        .from('SERVICIOS')
        .select('*', { count: 'exact', head: true })
        .eq('ID DE USUARIO', negocioId),
      supabase
        .from('SERVICIOS')
        .select('*', { count: 'exact', head: true })
        .eq('ID DE USUARIO', negocioId)
        .eq('ACTIVO', true),
      citasBase,
      citasHoyBase,
      citasPendientesBase,
      citasMesBase,
      citasMesDataBase,
      proximasBase,
      fetch('/api/suscripcion', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ])

    if (proximasRes.error) {
      setMensaje(`No se pudieron cargar algunas citas: ${proximasRes.error.message}`)
    }

    const suscripcionJson = suscripcionRes.ok
      ? await suscripcionRes.json()
      : { suscripcion: null }
    const ingresosMes = ((citasMesDataRes.data ?? []) as CitaIngreso[]).reduce((total, cita) => {
      const estado = String(cita.Estado ?? '').toLowerCase()
      const precio = Number(cita.SERVICIOS?.['Precio del servicio'] ?? 0)

      return ESTADOS_INGRESO.includes(estado) ? total + precio : total
    }, 0)

    setMetricas({
      clientes: clientesRes.count ?? 0,
      empleados: empleadosRes.count ?? 0,
      servicios: serviciosRes.count ?? 0,
      serviciosActivos: serviciosActivosRes.count ?? 0,
      citas: citasRes.count ?? 0,
      citasHoy: citasHoyRes.count ?? 0,
      citasPendientes: citasPendientesRes.count ?? 0,
      citasMes: citasMesRes.count ?? 0,
      ingresosMes,
    })
    setProximasCitas((proximasRes.data as Cita[]) ?? [])
    setSuscripcion(suscripcionJson.suscripcion)
    setAcceso(suscripcionJson.acceso ?? null)
    setNombreEditable(suscripcionJson.suscripcion?.nombre_negocio ?? '')
    setDireccionEditable(suscripcionJson.suscripcion?.direccion_negocio ?? '')
    setGoogleMapsEditable(suscripcionJson.suscripcion?.google_maps_url ?? '')
    setGoogleReviewsEditable(suscripcionJson.suscripcion?.google_reviews_url ?? '')
    setFotoPreview('')
    setCargando(false)
  }

  async function seleccionarFotoNegocio(file?: File) {
    if (!file) return

    try {
      setMensaje('')
      const foto = await optimizarImagenNegocio(file)
      setFotoPreview(foto)
      await guardarPerfilNegocio(false, foto)
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo cargar la imagen.')
    }
  }

  async function guardarPerfilNegocio(quitarFoto = false, fotoOverride?: string) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      router.push('/login')
      return
    }

    try {
      setGuardandoPerfil(true)
      setMensaje('')

      const response = await fetch('/api/suscripcion', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_negocio: nombreEditable.trim(),
          direccion_negocio: direccionEditable.trim(),
          google_maps_url: googleMapsEditable.trim(),
          google_reviews_url: googleReviewsEditable.trim(),
          foto_negocio_url: quitarFoto ? undefined : fotoOverride ?? fotoPreview,
          quitar_foto: quitarFoto,
        }),
      })
      const resultado = await response.json()

      if (!response.ok) {
        throw new Error(resultado.error ?? 'No se pudo guardar el perfil.')
      }

      setSuscripcion(resultado.suscripcion)
      setNombreEditable(resultado.suscripcion?.nombre_negocio ?? '')
      setDireccionEditable(resultado.suscripcion?.direccion_negocio ?? '')
      setGoogleMapsEditable(resultado.suscripcion?.google_maps_url ?? '')
      setGoogleReviewsEditable(resultado.suscripcion?.google_reviews_url ?? '')
      setFotoPreview('')
      setMensaje(
        quitarFoto
          ? 'Foto del negocio eliminada.'
          : fotoOverride
            ? 'Foto del negocio guardada. Ya aparecera en reservas.'
            : 'Perfil del negocio actualizado.'
      )
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo guardar el perfil.')
    } finally {
      setGuardandoPerfil(false)
    }
  }

  useEffect(() => {
    cargarDashboard()
  }, [])

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-sm font-bold tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Controla la agenda, mide el movimiento del mes y entra rapido a
              las tareas importantes de {negocio}.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-orange-600/35 bg-zinc-950 shadow-2xl shadow-orange-950/20">
            <div className="relative h-40 bg-zinc-900">
              {fotoNegocio ? (
                <img
                  src={fotoNegocio}
                  alt={`Imagen de ${negocio}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.22),transparent_34%),linear-gradient(135deg,#111,#050505)]">
                  <div className="text-center">
                    <p className="text-xs font-bold tracking-[4px] text-orange-500">
                      TU NEGOCIO
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      Personaliza tu panel
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent" />
            </div>
            <div className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-500">Cuenta activa</p>
                <h2 className="mt-1 text-2xl font-black text-orange-500">
                  {negocio}
                </h2>
              </div>
              <div className="rounded-xl border border-green-600/40 bg-green-950/20 px-4 py-3 text-right">
                <p className="text-xs text-zinc-400">Plan</p>
                <p className="font-black text-green-300">{plan}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400">
                Vence: <span className="font-bold text-zinc-100">{fechaVencimiento}</span>
              </p>
              <p className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400">
                WhatsApp: <span className="font-bold text-zinc-100">{suscripcion?.telefono || 'Pendiente'}</span>
              </p>
            </div>
            {puedeEditarPerfil && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-sm font-bold text-zinc-200">
                  Identidad del negocio
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={nombreEditable}
                    onChange={(event) => setNombreEditable(event.target.value)}
                    placeholder="Nombre visible del negocio"
                    maxLength={80}
                    className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => guardarPerfilNegocio(false)}
                    disabled={guardandoPerfil}
                    className="min-h-12 rounded-xl bg-orange-600 px-5 text-sm font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {guardandoPerfil ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                <div className="mt-3 grid gap-3">
                  <input
                    value={direccionEditable}
                    onChange={(event) => setDireccionEditable(event.target.value)}
                    placeholder="Direccion visible para clientes"
                    maxLength={160}
                    className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-orange-500"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={googleMapsEditable}
                      onChange={(event) => setGoogleMapsEditable(event.target.value)}
                      placeholder="Link de Google Maps"
                      className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-orange-500"
                    />
                    <input
                      value={googleReviewsEditable}
                      onChange={(event) => setGoogleReviewsEditable(event.target.value)}
                      placeholder="Link de resenas de Google"
                      className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-orange-500"
                    />
                  </div>
                </div>
                {(suscripcion?.direccion_negocio ||
                  suscripcion?.google_maps_url ||
                  suscripcion?.google_reviews_url) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {suscripcion?.direccion_negocio && (
                      <p className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs leading-5 text-zinc-300">
                        {suscripcion.direccion_negocio}
                      </p>
                    )}
                    {suscripcion?.google_maps_url && (
                      <a
                        href={suscripcion.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-green-600/50 px-4 py-3 text-center text-xs font-bold text-green-200 transition hover:bg-green-600/10"
                      >
                        Ver ubicacion
                      </a>
                    )}
                    {suscripcion?.google_reviews_url && (
                      <a
                        href={suscripcion.google_reviews_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-yellow-500/50 px-4 py-3 text-center text-xs font-bold text-yellow-200 transition hover:bg-yellow-500/10"
                      >
                        Ver resenas
                      </a>
                    )}
                  </div>
                )}
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-orange-600/60 px-4 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10">
                    Subir foto del negocio
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => seleccionarFotoNegocio(event.target.files?.[0])}
                    />
                  </label>
                  {(suscripcion?.foto_negocio_url || fotoPreview) && (
                    <button
                      type="button"
                      onClick={() => guardarPerfilNegocio(true)}
                      disabled={guardandoPerfil}
                      className="min-h-12 rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-300 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Esta imagen aparece en el panel y en la pagina publica de reservas.
                </p>
              </div>
            )}
            </div>
          </div>
        </div>

        {mensaje && (
          <p className="mt-5 rounded-xl border border-orange-500/40 bg-orange-950/20 px-4 py-3 text-sm text-orange-200">
            {mensaje}
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Clientes', metricas.clientes, 'Contactos registrados', '/clientes'],
            ['Servicios', metricas.serviciosActivos, `${metricas.servicios} en total`, '/servicios'],
            ['Empleados', metricas.empleados, 'Equipo disponible', '/empleados'],
            ['Citas mes', metricas.citasMes, `${metricas.citas} historicas`, '/citas'],
          ].map(([titulo, valor, detalle, href]) => (
            <Link
              key={String(titulo)}
              href={String(href)}
              className="rounded-2xl border border-orange-600/35 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20 transition hover:border-orange-500/80"
            >
              <p className="text-sm text-zinc-400">{titulo}</p>
              <h2 className="mt-2 text-4xl font-black text-orange-500">{valor}</h2>
              <p className="mt-2 text-xs text-zinc-500">{detalle}</p>
            </Link>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-green-600/40 bg-green-950/10 p-5 shadow-lg shadow-green-950/20">
            <p className="text-sm text-zinc-400">Ingresos estimados del mes</p>
            <h2 className="mt-2 text-4xl font-black text-green-400">
              {formatoCop(metricas.ingresosMes)}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Calculado con citas pendientes, confirmadas y completadas del mes.
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-600/40 bg-yellow-950/10 p-5">
            <p className="text-sm text-zinc-400">Pendientes</p>
            <h2 className="mt-2 text-4xl font-black text-yellow-300">
              {metricas.citasPendientes}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Citas que necesitan seguimiento o confirmacion.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-600/40 bg-blue-950/10 p-5">
            <p className="text-sm text-zinc-400">Citas hoy</p>
            <h2 className="mt-2 text-4xl font-black text-blue-300">
              {metricas.citasHoy}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Movimiento operativo para el dia actual.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.78fr]">
          <section className="rounded-2xl border border-orange-600/35 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
            {reservasPendientes.length > 0 && (
              <div className="mb-5 rounded-2xl border border-green-500/40 bg-green-950/20 p-4 shadow-lg shadow-green-950/10">
                <p className="text-xs font-bold uppercase tracking-[3px] text-green-300">
                  Te reservaron
                </p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  {reservasPendientes.length === 1
                    ? 'Tienes una reserva nueva por confirmar'
                    : `Tienes ${reservasPendientes.length} reservas nuevas por confirmar`}
                </h3>
                <div className="mt-4 grid gap-2">
                  {reservasPendientes.slice(0, 3).map((cita) => (
                    <Link
                      key={cita.ID}
                      href="/citas"
                      className="rounded-xl border border-green-500/20 bg-black px-4 py-3 transition hover:border-green-400/60"
                    >
                      <p className="font-bold text-green-100">
                        {cita.Clientes?.Nombre || 'Cliente sin nombre'} reservo con{' '}
                        {cita.Empleados?.Nombre || 'tu equipo'}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {cita.SERVICIOS?.['Nombre del servicio'] || 'Servicio'} ·{' '}
                        {formatoFecha(cita.Fecha)} · {formatoHoraAmPm(cita.Hora)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">Proximas citas</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Agenda futura conectada con clientes, servicios y empleados.
                </p>
              </div>
              <Link
                href="/citas"
                className="rounded-xl border border-orange-600/60 px-4 py-3 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
              >
                Ver agenda
              </Link>
            </div>

            {cargando ? (
              <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-6 text-center text-zinc-400">
                Cargando dashboard...
              </div>
            ) : proximasCitas.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-orange-600/40 bg-black p-6 text-center">
                <h3 className="text-xl font-bold text-orange-500">
                  No hay citas proximas
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Crea una cita manual o comparte el QR para empezar a llenar la agenda.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {proximasCitas.map((cita) => (
                  <article
                    key={cita.ID}
                    className="rounded-xl border border-zinc-800 bg-black p-4 transition hover:border-orange-600/60"
                  >
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black text-orange-500">
                            {cita.Clientes?.Nombre || 'Cliente sin nombre'}
                          </h3>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${estadoColor(cita.Estado)}`}>
                            {cita.Estado || 'pendiente'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-300">
                          {cita.SERVICIOS?.['Nombre del servicio'] || 'Servicio'} con{' '}
                          {cita.Empleados?.Nombre || 'empleado por definir'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left sm:text-right">
                        <p className="font-bold text-zinc-100">{formatoFecha(cita.Fecha)}</p>
                        <p className="text-sm text-zinc-500">{formatoHoraAmPm(cita.Hora)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Configuracion</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {progreso}% listo para operar.
                  </p>
                </div>
                <div className="text-4xl font-black text-orange-500">
                  {pasosListos}/{pasosConfiguracion.length}
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black">
                <div
                  className="h-full rounded-full bg-orange-600 transition-all"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <div className="mt-4 space-y-2">
                {pasosConfiguracion.map((paso) => (
                  <Link
                    key={paso.nombre}
                    href={paso.href}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-3 transition hover:border-orange-600/60"
                  >
                    <div>
                      <p className="font-bold">{paso.nombre}</p>
                      <p className="text-xs text-zinc-500">{paso.texto}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        paso.listo
                          ? 'bg-green-950/30 text-green-300'
                          : 'bg-orange-950/30 text-orange-300'
                      }`}
                    >
                      {paso.listo ? 'Listo' : 'Pendiente'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-orange-600/35 bg-zinc-950 p-5">
              <h2 className="text-2xl font-black">Acciones rapidas</h2>
              <div className="mt-4 grid gap-3">
                <Link
                  href="/citas"
                  className="rounded-xl bg-orange-600 px-4 py-3 text-center font-bold transition hover:bg-orange-700"
                >
                  Crear o revisar citas
                </Link>
                <Link
                  href="/automatizaciones"
                  className="rounded-xl border border-orange-600/60 px-4 py-3 text-center font-bold text-orange-200 transition hover:bg-orange-600/10"
                >
                  Ver QR y WhatsApp
                </Link>
                <Link
                  href="/finanzas"
                  className="rounded-xl border border-green-600/60 px-4 py-3 text-center font-bold text-green-200 transition hover:bg-green-600/10"
                >
                  Revisar finanzas
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}
