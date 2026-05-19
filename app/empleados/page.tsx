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

    setMensaje('Empleado guardado correctamente ✅')
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
    <main className="min-h-screen bg-black text-white p-10">
      <section className="max-w-6xl mx-auto">
        <p className="text-orange-500 font-bold tracking-[4px]">
          OBORO BOOKING
        </p>

        <h1 className="text-5xl font-bold mt-2">
          Empleados
        </h1>

        <p className="text-zinc-400 mt-3 mb-10">
          Administra los profesionales que atienden las citas.
        </p>

        <form
          onSubmit={guardarEmpleado}
          className="grid md:grid-cols-4 gap-4 mb-10"
        >
          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Nombre del empleado"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Cargo o especialidad"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            required
          />

          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

          <button
            type="submit"
            className="rounded-xl bg-orange-600 hover:bg-orange-700 font-bold"
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
              className="border border-orange-600/50 bg-zinc-950 rounded-3xl p-6"
            >
              <h2 className="text-2xl font-bold text-orange-500">
                {empleado.Nombre}
              </h2>

              <p className="text-zinc-300 mt-4">
                💼 Cargo: {empleado.Cargo}
              </p>

              <p className="text-zinc-300">
                📞 Teléfono: {empleado.Telefono}
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