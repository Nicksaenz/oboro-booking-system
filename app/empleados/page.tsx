'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { mensajePermiso, obtenerContextoEquipo, type ContextoEquipo } from '@/lib/equipo'
import { obtenerPlanOboro } from '@/lib/planes'

type Empleado = {
  ID: string
  Nombre: string
  Cargo: string
  Telefono?: string
  foto_url?: string | null
  Activo: boolean
}

type ResenaEmpleado = {
  id: string
  empleado_id: string
  cliente_nombre: string
  calificacion: number
  comentario?: string | null
  visible: boolean
  created_at: string
}

const MAX_FOTO_EMPLEADO_CHARS = 450_000

function leerArchivoComoDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

async function optimizarFotoEmpleado(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen.')
  }

  if (file.size > 6 * 1024 * 1024) {
    throw new Error('La imagen debe pesar menos de 6 MB.')
  }

  const dataUrl = await leerArchivoComoDataUrl(file)
  const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
    img.src = dataUrl
  })
  const maxSize = 420
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

  while (resultado.length > MAX_FOTO_EMPLEADO_CHARS && calidad > 0.42) {
    calidad -= 0.08
    resultado = canvas.toDataURL('image/jpeg', calidad)
  }

  if (resultado.length > MAX_FOTO_EMPLEADO_CHARS) {
    throw new Error('La foto sigue muy pesada. Intenta con una imagen mas liviana.')
  }

  return resultado
}

export default function EmpleadosPage() {
  const router = useRouter()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fotoEmpleado, setFotoEmpleado] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCargo, setEditCargo] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editFotoEmpleado, setEditFotoEmpleado] = useState('')
  const [editQuitarFoto, setEditQuitarFoto] = useState(false)
  const [editActivo, setEditActivo] = useState(true)
  const [contexto, setContexto] = useState<ContextoEquipo | null>(null)
  const [planActual, setPlanActual] = useState('basico')
  const [resenas, setResenas] = useState<ResenaEmpleado[]>([])

  async function cargarEmpleados() {
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

    const token = sessionData.session?.access_token
    const [empleadosRes, suscripcionRes, resenasRes] = await Promise.all([
      supabase
      .from('Empleados')
      .select('*')
      .eq('ID de Usuario', acceso.negocioId)
        .order('Nombre', { ascending: true }),
      token
        ? fetch('/api/suscripcion', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        : null,
      token && acceso.esAdmin
        ? fetch('/api/resenas', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        : null,
    ])

    if (empleadosRes.error) {
      setMensaje(`Error: ${empleadosRes.error.message}`)
      return
    }

    if (suscripcionRes?.ok) {
      const resultado = await suscripcionRes.json()
      setPlanActual(resultado?.suscripcion?.plan ?? 'basico')
    }

    if (resenasRes?.ok) {
      const resultado = await resenasRes.json()
      setResenas(resultado?.resenas ?? [])
    } else {
      setResenas([])
    }

    setEmpleados(empleadosRes.data || [])
  }

  async function guardarEmpleado(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)

    const acceso = contexto ?? (await obtenerContextoEquipo())

    if (!acceso?.esAdmin) {
      setMensaje(mensajePermiso('crear empleados'))
      setGuardando(false)
      return
    }

    const plan = obtenerPlanOboro(planActual)

    if (empleados.length >= plan.limites.empleados) {
      setMensaje(
        `Tu plan ${plan.nombre} permite hasta ${plan.limites.empleados} empleados. Actualiza el plan para agregar mas.`
      )
      setGuardando(false)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.from('Empleados').insert([
      {
        Nombre: nombre.trim(),
        Cargo: cargo.trim(),
        Telefono: telefono.trim(),
        foto_url: fotoEmpleado || null,
        Activo: true,
        'ID de Usuario': acceso.negocioId,
      },
    ])

    if (error) {
      setMensaje(`Error: ${error.message}`)
      setGuardando(false)
      return
    }

    setMensaje('Empleado guardado correctamente.')
    setNombre('')
    setCargo('')
    setTelefono('')
    setFotoEmpleado('')
    await cargarEmpleados()
    setGuardando(false)
  }

  async function cargarFotoNueva(file?: File) {
    if (!file) return

    try {
      const foto = await optimizarFotoEmpleado(file)
      setFotoEmpleado(foto)
      setMensaje('Foto lista. Guarda el empleado para conservarla.')
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo cargar la foto.')
    }
  }

  function abrirEditor(empleado: Empleado) {
    if (!contexto?.esAdmin) {
      setMensaje(mensajePermiso('editar empleados'))
      return
    }

    setEmpleadoEditando(empleado)
    setEditNombre(empleado.Nombre ?? '')
    setEditCargo(empleado.Cargo ?? '')
    setEditTelefono(empleado.Telefono ?? '')
    setEditFotoEmpleado(empleado.foto_url ?? '')
    setEditQuitarFoto(false)
    setEditActivo(Boolean(empleado.Activo))
  }

  async function cargarFotoEditor(file?: File) {
    if (!file) return

    try {
      const foto = await optimizarFotoEmpleado(file)
      setEditFotoEmpleado(foto)
      setEditQuitarFoto(false)
      setMensaje('Foto lista. Guarda los cambios para conservarla.')
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo cargar la foto.')
    }
  }

  async function actualizarEmpleado(e: React.FormEvent) {
    e.preventDefault()

    if (!empleadoEditando) return

    if (!contexto?.esAdmin) {
      setMensaje(mensajePermiso('editar empleados'))
      return
    }

    const { error } = await supabase
      .from('Empleados')
      .update({
        Nombre: editNombre.trim(),
        Cargo: editCargo.trim(),
        Telefono: editTelefono.trim(),
        foto_url: editQuitarFoto ? null : editFotoEmpleado || null,
        Activo: editActivo,
      })
      .eq('ID', empleadoEditando.ID)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setMensaje('Empleado actualizado correctamente.')
    setEmpleadoEditando(null)
    cargarEmpleados()
  }

  async function eliminarEmpleado(empleado: Empleado) {
    if (!contexto?.esAdmin) {
      setMensaje('Solo el administrador puede eliminar empleados.')
      return
    }

    const confirmar = confirm(
      `Seguro que deseas eliminar a ${empleado.Nombre}? Si tiene citas historicas, es mejor desactivarlo.`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('Empleados')
      .delete()
      .eq('ID', empleado.ID)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setMensaje('Empleado eliminado correctamente.')
    cargarEmpleados()
  }

  async function cambiarEstado(empleado: Empleado) {
    if (!contexto?.esAdmin) {
      setMensaje(mensajePermiso('cambiar empleados'))
      return
    }

    const { error } = await supabase
      .from('Empleados')
      .update({ Activo: !empleado.Activo })
      .eq('ID', empleado.ID)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setMensaje(empleado.Activo ? 'Empleado desactivado.' : 'Empleado activado.')
    cargarEmpleados()
  }

  async function removerResena(resenaId: string) {
    if (!contexto?.esAdmin) {
      setMensaje('Solo el administrador puede remover resenas.')
      return
    }

    const confirmar = confirm('Seguro que deseas remover esta resena?')

    if (!confirmar) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      router.push('/login')
      return
    }

    const response = await fetch(`/api/resenas/${resenaId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const resultado = await response.json().catch(() => null)

    if (!response.ok) {
      setMensaje(resultado?.error ?? 'No se pudo remover la resena.')
      return
    }

    setMensaje('Resena removida.')
    cargarEmpleados()
  }

  useEffect(() => {
    cargarEmpleados()
  }, [])

  const plan = obtenerPlanOboro(planActual)
  const cuposDisponibles = Math.max(plan.limites.empleados - empleados.length, 0)
  const resenasPorEmpleado = new Map<string, ResenaEmpleado[]>()

  for (const resena of resenas) {
    const lista = resenasPorEmpleado.get(resena.empleado_id) ?? []
    resenasPorEmpleado.set(resena.empleado_id, [...lista, resena])
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              Empleados
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Administra profesionales, especialidades, telefonos y estado de
              disponibilidad.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-500">Activos</p>
            <p className="text-3xl font-black text-orange-500">
              {empleados.filter((empleado) => empleado.Activo).length}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-orange-600/30 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">Limite del plan {plan.nombre}</p>
          <p className="mt-1 text-2xl font-black text-orange-500">
            {empleados.length}/{plan.limites.empleados} empleados registrados
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Te quedan {cuposDisponibles} cupos para empleados o colaboradores.
            Cada plan incluye 1 administrador principal separado de estos cupos.
          </p>
        </div>

        <form
          onSubmit={guardarEmpleado}
          className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-orange-600/30 bg-zinc-950/70 p-4 shadow-2xl shadow-orange-950/20 sm:gap-4 sm:p-5 md:grid-cols-4"
        >
          <input
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
            placeholder="Nombre del empleado"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <input
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
            placeholder="Cargo o especialidad"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            required
          />

          <input
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
            placeholder="WhatsApp o telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

          <label className="min-h-12 cursor-pointer rounded-xl border border-orange-600/50 bg-black p-4 text-sm text-zinc-300 transition hover:bg-zinc-900">
            <span>{fotoEmpleado ? 'Cambiar foto' : 'Subir foto'}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => cargarFotoNueva(e.target.files?.[0])}
            />
          </label>

          <button
            type="submit"
            disabled={guardando || !contexto?.esAdmin || empleados.length >= plan.limites.empleados}
            className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando
              ? 'Guardando...'
              : !contexto?.esAdmin
                ? 'Solo admin'
                : empleados.length >= plan.limites.empleados
                  ? 'Limite del plan'
                  : 'Guardar empleado'}
          </button>

          {fotoEmpleado && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-600/30 bg-black p-3 md:col-span-4">
              <img
                src={fotoEmpleado}
                alt="Foto del empleado"
                className="h-16 w-16 rounded-full border border-orange-500/50 object-cover"
              />
              <button
                type="button"
                onClick={() => setFotoEmpleado('')}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:bg-zinc-900"
              >
                Quitar foto
              </button>
            </div>
          )}
        </form>

        {mensaje && (
          <div className="mt-6 rounded-2xl border border-orange-600/50 bg-zinc-950 px-5 py-4 text-sm text-orange-200">
            {mensaje}
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {empleados.map((empleado) => (
            <div
              key={empleado.ID}
              className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20"
            >
              {(() => {
                const resenasEmpleado = resenasPorEmpleado.get(empleado.ID) ?? []
                const promedio = resenasEmpleado.length
                  ? (
                      resenasEmpleado.reduce(
                        (total, resena) => total + Number(resena.calificacion ?? 0),
                        0
                      ) / resenasEmpleado.length
                    ).toFixed(1)
                  : null

                return (
                  <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  {empleado.foto_url ? (
                    <img
                      src={empleado.foto_url}
                      alt={empleado.Nombre}
                      className="h-16 w-16 rounded-full border border-orange-500/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/50 bg-black text-xl font-black text-orange-400">
                      {empleado.Nombre.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div>
                  <h2 className="text-2xl font-bold text-orange-500">
                    {empleado.Nombre}
                  </h2>
                  <p className="mt-2 text-zinc-300">{empleado.Cargo}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {empleado.Telefono || 'Sin telefono'}
                  </p>
                  {promedio && (
                    <p className="mt-2 text-sm font-bold text-yellow-300">
                      ★ {promedio}/5 · {resenasEmpleado.length} resenas
                    </p>
                  )}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    empleado.Activo
                      ? 'bg-green-600/20 text-green-300'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {empleado.Activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => abrirEditor(empleado)}
                  className="min-h-11 rounded-xl border border-orange-600/60 px-3 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => cambiarEstado(empleado)}
                  className="min-h-11 rounded-xl border border-green-600/60 px-3 py-2 text-sm font-bold text-green-200 transition hover:bg-green-600/10"
                >
                  {empleado.Activo ? 'Desactivar' : 'Activar'}
                </button>

                <button
                  type="button"
                  onClick={() => eliminarEmpleado(empleado)}
                  className="col-span-2 min-h-11 rounded-xl border border-red-600/60 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-600/10"
                >
                  Eliminar empleado
                </button>
              </div>

              {contexto?.esAdmin && resenasEmpleado.length > 0 && (
                <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm font-bold text-zinc-200">
                    Resenas del empleado
                  </p>
                  <div className="mt-3 grid gap-3">
                    {resenasEmpleado.slice(0, 3).map((resena) => (
                      <div
                        key={resena.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-zinc-200">
                              {resena.cliente_nombre}
                            </p>
                            <p className="mt-1 text-sm text-yellow-300">
                              ★ {resena.calificacion}/5
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removerResena(resena.id)}
                            className="rounded-lg border border-red-600/50 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-600/10"
                          >
                            Remover
                          </button>
                        </div>
                        {resena.comentario && (
                          <p className="mt-2 text-sm leading-5 text-zinc-400">
                            {resena.comentario}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
                  </>
                )
              })()}
            </div>
          ))}
        </div>
      </section>

      {empleadoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <form
            onSubmit={actualizarEmpleado}
            className="w-full max-w-md rounded-3xl border border-orange-600/50 bg-zinc-950 p-6 shadow-2xl shadow-orange-950/40"
          >
            <h2 className="text-3xl font-black text-orange-500">
              Editar empleado
            </h2>

            <div className="mt-6 grid gap-3">
              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                required
              />

              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                value={editCargo}
                onChange={(e) => setEditCargo(e.target.value)}
                required
              />

              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                value={editTelefono}
                onChange={(e) => setEditTelefono(e.target.value)}
                placeholder="WhatsApp o telefono"
              />

              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <div className="flex items-center gap-4">
                  {editFotoEmpleado && !editQuitarFoto ? (
                    <img
                      src={editFotoEmpleado}
                      alt="Foto del empleado"
                      className="h-16 w-16 rounded-full border border-orange-500/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/50 bg-zinc-900 text-xl font-black text-orange-400">
                      {editNombre.slice(0, 1).toUpperCase() || '?'}
                    </div>
                  )}

                  <label className="cursor-pointer rounded-xl border border-orange-600/60 px-4 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10">
                    Cambiar foto
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => cargarFotoEditor(e.target.files?.[0])}
                    />
                  </label>
                </div>

                {editFotoEmpleado && !editQuitarFoto && (
                  <button
                    type="button"
                    onClick={() => setEditQuitarFoto(true)}
                    className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:bg-zinc-900"
                  >
                    Quitar foto
                  </button>
                )}
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={editActivo}
                  onChange={(e) => setEditActivo(e.target.checked)}
                />
                Disponible para recibir citas
              </label>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setEmpleadoEditando(null)}
                className="min-h-12 rounded-xl border border-zinc-700 px-5 py-3 font-bold text-zinc-200 transition hover:bg-zinc-900"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="min-h-12 rounded-xl bg-orange-600 px-5 py-3 font-bold transition hover:bg-orange-700"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
