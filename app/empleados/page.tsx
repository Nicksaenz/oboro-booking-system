'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function EmpleadosPage() {
  const router = useRouter()
  const [empleados, setEmpleados] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('')

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

    if (!error && data) {
      setEmpleados(data)
    }
  }

  async function guardarEmpleado(e: React.FormEvent) {
    e.preventDefault()
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
  router.push('/login')
  return
}
    const { error } = await supabase.from('Empleados').insert([
      {
        Nombre: nombre,
        Cargo: cargo,
        Telefono: telefono,
        Activo: true,
        'ID de Usuario': user.id,
      },
    ])

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setMensaje('Empleado guardado correctamente.')
    setNombre('')
    setCargo('')
    setTelefono('')
    cargarEmpleados()
  }

  useEffect(() => {
    cargarEmpleados()
  }, [])

  useEffect(() => {
  async function verificarSesion() {
    const { data } = await supabase.auth.getSession()

    if (!data.session) {
      router.push('/login')
    }
  }

  verificarSesion()
}, [])

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
          Empleados
        </h1>

        <p className="mt-3 mb-8 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Administra los profesionales que atienden las citas.
        </p>

        <form
          onSubmit={guardarEmpleado}
          className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-orange-600/30 bg-zinc-950/70 p-4 shadow-2xl shadow-orange-950/20 sm:gap-4 sm:p-5 md:grid-cols-4"
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
            placeholder="Telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

          <button
            type="submit"
            className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700"
          >
            Guardar empleado
          </button>
        </form>

        {mensaje && (
          <p className="text-orange-400 mb-6">
            {mensaje}
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {empleados.map((empleado) => (
            <div
              key={empleado.ID}
              className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20"
            >
              <h2 className="text-2xl font-bold text-orange-500">
                {empleado.Nombre}
              </h2>

              <p className="text-zinc-300 mt-4">
                Cargo: {empleado.Cargo}
              </p>

              <p className="text-zinc-300">
                Telefono: {empleado.Telefono}
              </p>

              <p className="text-zinc-500 mt-4">
                Estado: {empleado.Activo ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
