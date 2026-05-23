'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Empleado = {
  ID: string
  Nombre: string
  Cargo: string
  Telefono?: string
  Activo: boolean
}

export default function EmpleadosPage() {
  const router = useRouter()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCargo, setEditCargo] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editActivo, setEditActivo] = useState(true)

  async function cargarEmpleados() {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('Empleados')
      .select('*')
      .eq('ID de Usuario', user.id)
      .order('Nombre', { ascending: true })

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setEmpleados(data || [])
  }

  async function guardarEmpleado(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
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
        Activo: true,
        'ID de Usuario': user.id,
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
    await cargarEmpleados()
    setGuardando(false)
  }

  function abrirEditor(empleado: Empleado) {
    setEmpleadoEditando(empleado)
    setEditNombre(empleado.Nombre ?? '')
    setEditCargo(empleado.Cargo ?? '')
    setEditTelefono(empleado.Telefono ?? '')
    setEditActivo(Boolean(empleado.Activo))
  }

  async function actualizarEmpleado(e: React.FormEvent) {
    e.preventDefault()

    if (!empleadoEditando) return

    const { error } = await supabase
      .from('Empleados')
      .update({
        Nombre: editNombre.trim(),
        Cargo: editCargo.trim(),
        Telefono: editTelefono.trim(),
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

  useEffect(() => {
    cargarEmpleados()
  }, [])

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

          <button
            type="submit"
            disabled={guardando}
            className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar empleado'}
          </button>
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-orange-500">
                    {empleado.Nombre}
                  </h2>
                  <p className="mt-2 text-zinc-300">{empleado.Cargo}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {empleado.Telefono || 'Sin telefono'}
                  </p>
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
