'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { obtenerContextoEquipo, type ContextoEquipo, type RolEquipo } from '@/lib/equipo'
import { obtenerPlanOboro } from '@/lib/planes'

type Acceso = {
  id: string
  email: string
  rol: RolEquipo
  activo: boolean
  usuario_id: string | null
  empleado_id?: string | null
  created_at: string
  Empleados?: {
    Nombre?: string | null
  } | null
}

type Empleado = {
  ID: string
  Nombre: string
  Cargo?: string | null
  Activo?: boolean
}

const ROLES: Array<{ id: RolEquipo; nombre: string; descripcion: string }> = [
  {
    id: 'admin',
    nombre: 'Administrador',
    descripcion: 'Puede editar configuracion, equipo, agenda y datos del negocio.',
  },
  {
    id: 'operativo',
    nombre: 'Operativo',
    descripcion: 'Puede ver datos y manejar citas, sin tocar finanzas ni configuracion.',
  },
  {
    id: 'lectura',
    nombre: 'Solo lectura',
    descripcion: 'Puede ver paneles y agenda, pero no crear, editar ni eliminar.',
  },
]

export default function EquipoPage() {
  const router = useRouter()
  const [contexto, setContexto] = useState<ContextoEquipo | null>(null)
  const [accesos, setAccesos] = useState<Acceso[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<RolEquipo>('lectura')
  const [empleadoId, setEmpleadoId] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [planActual, setPlanActual] = useState('basico')

  async function cargarEquipo() {
    setCargando(true)
    const acceso = await obtenerContextoEquipo()

    if (!acceso) {
      router.push('/login')
      return
    }

    setContexto(acceso)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const [equipoRes, empleadosRes, suscripcionRes] = await Promise.all([
      supabase
        .from('equipo_accesos')
        .select(`
          *,
          Empleados:empleado_id (
            Nombre
          )
        `)
        .eq('negocio_id', acceso.negocioId)
        .order('created_at', { ascending: false }),
      supabase
        .from('Empleados')
        .select('ID, Nombre, Cargo, Activo')
        .eq('ID de Usuario', acceso.negocioId)
        .eq('Activo', true)
        .order('Nombre', { ascending: true }),
      token
        ? fetch('/api/suscripcion', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        : null,
    ])

    if (equipoRes.error) {
      setMensaje(equipoRes.error.message)
    } else {
      setAccesos((equipoRes.data ?? []) as Acceso[])
    }

    if (!empleadosRes.error) {
      setEmpleados((empleadosRes.data ?? []) as Empleado[])
    }

    if (suscripcionRes?.ok) {
      const resultado = await suscripcionRes.json()
      setPlanActual(resultado?.suscripcion?.plan ?? 'basico')
    }

    setCargando(false)
  }

  async function guardarAcceso(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    const acceso = contexto ?? (await obtenerContextoEquipo())

    if (!acceso?.esAdmin || acceso.usuarioId !== acceso.negocioId) {
      setMensaje('Solo el administrador principal puede gestionar accesos.')
      setGuardando(false)
      return
    }

    const correo = email.trim().toLowerCase()
    const plan = obtenerPlanOboro(planActual)
    const accesoEmpleadoId = rol === 'admin' ? null : empleadoId || null

    if (rol !== 'admin' && !accesoEmpleadoId) {
      setMensaje('Selecciona el empleado al que pertenece este acceso.')
      setGuardando(false)
      return
    }

    if (accesos.length >= plan.limites.accesosEquipo) {
      setMensaje(
        `Tu plan ${plan.nombre} permite hasta ${plan.limites.accesosEquipo} accesos adicionales.`
      )
      setGuardando(false)
      return
    }

    const { error } = await supabase.from('equipo_accesos').upsert(
      [
        {
          negocio_id: acceso.negocioId,
          email: correo,
          rol,
          empleado_id: accesoEmpleadoId,
          activo: true,
        },
      ],
      { onConflict: 'negocio_id,email' }
    )

    if (error) {
      setMensaje(`No se pudo guardar el acceso: ${error.message}`)
      setGuardando(false)
      return
    }

    setMensaje('Acceso guardado. La persona debe registrarse con ese mismo correo.')
    setEmail('')
    setRol('lectura')
    setEmpleadoId('')
    setGuardando(false)
    cargarEquipo()
  }

  async function cambiarEstado(acceso: Acceso) {
    const { error } = await supabase
      .from('equipo_accesos')
      .update({ activo: !acceso.activo })
      .eq('id', acceso.id)

    if (error) {
      setMensaje(error.message)
      return
    }

    cargarEquipo()
  }

  async function eliminarAcceso(acceso: Acceso) {
    const confirmar = window.confirm(`Eliminar el acceso de ${acceso.email}?`)

    if (!confirmar) return

    const { error } = await supabase
      .from('equipo_accesos')
      .delete()
      .eq('id', acceso.id)

    if (error) {
      setMensaje(error.message)
      return
    }

    cargarEquipo()
  }

  useEffect(() => {
    cargarEquipo()
  }, [])

  const puedeGestionar = contexto?.esAdmin && contexto.usuarioId === contexto.negocioId
  const plan = obtenerPlanOboro(planActual)
  const cuposDisponibles = Math.max(plan.limites.accesosEquipo - accesos.length, 0)

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              Equipo y permisos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Agrega personas al negocio y define si pueden administrar,
              operar citas o solo consultar informacion.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-500">Tu rol</p>
            <p className="text-2xl font-black text-orange-500">
              {contexto?.rol ?? 'cargando'}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-orange-600/30 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">Limite del plan {plan.nombre}</p>
          <p className="mt-1 text-2xl font-black text-orange-500">
            1 administrador + {accesos.length}/{plan.limites.accesosEquipo} accesos adicionales
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Te quedan {cuposDisponibles} cupos para usuarios de equipo. Usa
            Operativo para recepcion y Solo lectura para supervisores.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {ROLES.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-black text-orange-500">{item.nombre}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {item.descripcion}
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={guardarAcceso}
          className="mt-8 grid gap-3 rounded-2xl border border-orange-600/30 bg-zinc-950 p-4 shadow-2xl shadow-orange-950/20 md:grid-cols-[1fr_220px_260px_auto]"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@negocio.com"
            disabled={!puedeGestionar}
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none disabled:opacity-60"
            required
          />
          <select
            value={rol}
            onChange={(e) => {
              const nuevoRol = e.target.value as RolEquipo
              setRol(nuevoRol)
              if (nuevoRol === 'admin') {
                setEmpleadoId('')
              }
            }}
            disabled={!puedeGestionar}
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none disabled:opacity-60"
          >
            {ROLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
          <select
            value={empleadoId}
            onChange={(e) => setEmpleadoId(e.target.value)}
            disabled={!puedeGestionar || rol === 'admin'}
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none disabled:opacity-60"
            required={rol !== 'admin'}
          >
            <option value="">
              {rol === 'admin' ? 'Admin ve todas las citas' : 'Empleado asignado'}
            </option>
            {empleados.map((empleado) => (
              <option key={empleado.ID} value={empleado.ID}>
                {empleado.Nombre}
                {empleado.Cargo ? ` - ${empleado.Cargo}` : ''}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!puedeGestionar || guardando || accesos.length >= plan.limites.accesosEquipo}
            className="min-h-12 rounded-xl bg-orange-600 px-5 py-3 font-bold transition hover:bg-orange-700 disabled:opacity-60"
          >
            {guardando
              ? 'Guardando...'
              : !puedeGestionar
                ? 'Solo admin principal'
                : accesos.length >= plan.limites.accesosEquipo
                  ? 'Limite del plan'
                  : 'Guardar acceso'}
          </button>
        </form>

        {mensaje && (
          <div className="mt-6 rounded-2xl border border-orange-600/50 bg-zinc-950 px-5 py-4 text-sm text-orange-200">
            {mensaje}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Accesos del negocio</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            La persona invitada debe crear su cuenta con el mismo correo. Al
            entrar, Oboro Booking la conectara automaticamente con este negocio.
          </p>

          <div className="mt-5 space-y-3">
            {cargando && <p className="text-zinc-400">Cargando equipo...</p>}

            {!cargando && accesos.length === 0 && (
              <div className="rounded-xl border border-dashed border-orange-600/40 bg-black p-5 text-center text-zinc-400">
                Aun no hay accesos adicionales.
              </div>
            )}

            {accesos.map((acceso) => (
              <div
                key={acceso.id}
                className="grid gap-3 rounded-xl border border-zinc-800 bg-black p-4 md:grid-cols-[1fr_160px_180px_160px_auto] md:items-center"
              >
                <div>
                  <p className="font-bold text-zinc-100">{acceso.email}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {acceso.usuario_id ? 'Cuenta conectada' : 'Pendiente de registro'}
                  </p>
                </div>
                <span className="rounded-full border border-orange-600/40 px-3 py-2 text-center text-sm font-bold text-orange-300">
                  {acceso.rol}
                </span>
                <span className="rounded-full border border-blue-600/40 px-3 py-2 text-center text-sm font-bold text-blue-200">
                  {acceso.rol === 'admin'
                    ? 'Todas las citas'
                    : acceso.Empleados?.Nombre || 'Sin empleado'}
                </span>
                <span
                  className={`rounded-full border px-3 py-2 text-center text-sm font-bold ${
                    acceso.activo
                      ? 'border-green-600/40 text-green-300'
                      : 'border-zinc-700 text-zinc-400'
                  }`}
                >
                  {acceso.activo ? 'Activo' : 'Pausado'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cambiarEstado(acceso)}
                    disabled={!puedeGestionar}
                    className="rounded-xl border border-green-600/60 px-3 py-2 text-sm font-bold text-green-200 disabled:opacity-50"
                  >
                    {acceso.activo ? 'Pausar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarAcceso(acceso)}
                    disabled={!puedeGestionar}
                    className="rounded-xl border border-red-600/60 px-3 py-2 text-sm font-bold text-red-200 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
