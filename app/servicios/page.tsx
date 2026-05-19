'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ServiciosPage() {
  const router = useRouter()
  const [servicios, setServicios] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [duracion, setDuracion] = useState('')
  const [precio, setPrecio] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargarServicios() {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

if (!user) {
  router.push('/login')
  return
}

const { data, error } = await supabase
  .from('SERVICIOS')
  .select('*')
  .eq('ID DE USUARIO', user.id)

    if (!error && data) {
      setServicios(data)
    }
  }

  async function guardarServicio(e: React.FormEvent) {
    e.preventDefault()
    
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
  router.push('/login')
  return
}
    const { error } = await supabase.from('SERVICIOS').insert([
      {
        'Nombre del servicio': nombre,
        'Duración en minutos': Number(duracion),
        'Precio del servicio': Number(precio),
        ACTIVO: true,
        'ID DE USUARIO': user.id,
      },
    ])

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setMensaje('Servicio guardado correctamente ✅')
    setNombre('')
    setDuracion('')
    setPrecio('')
    cargarServicios()
  }
  async function cambiarEstadoServicio(
  id: string,
  estadoActual: boolean
) {
  const { error } = await supabase
    .from('SERVICIOS')
    .update({
      ACTIVO: !estadoActual,
    })
    .eq('ID', id)

  if (error) {
    setMensaje(`Error: ${error.message}`)
    return
  }

  setMensaje('Estado del servicio actualizado ✅')
  cargarServicios()
}
  useEffect(() => {
    cargarServicios()
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
          Servicios
        </h1>

        <p className="text-zinc-400 mt-3 mb-10">
          Administra los servicios que ofrece cada negocio.
        </p>

        <form
          onSubmit={guardarServicio}
          className="grid md:grid-cols-4 gap-4 mb-10"
        >
          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Nombre del servicio"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Duración en minutos"
            type="number"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            required
          />

          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Precio"
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />

          <button
            type="submit"
            className="rounded-xl bg-orange-600 hover:bg-orange-700 font-bold"
          >
            Guardar servicio
          </button>
        </form>

        {mensaje && (
          <p className="text-orange-400 mb-6">
            {mensaje}
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {servicios.map((servicio) => (
            <div
              key={servicio.ID}
              className="border border-orange-600/50 bg-zinc-950 rounded-3xl p-6"
            >
              <h2 className="text-2xl font-bold text-orange-500">
                {servicio['Nombre del servicio']}
              </h2>

              <p className="text-zinc-300 mt-4">
                ⏱ Duración: {servicio['Duración en minutos']} min
              </p>

              <p className="text-zinc-300">
                💰 Precio: ${servicio['Precio del servicio']}
              </p>

              <p className="text-zinc-500 mt-4">
                Estado: {servicio.ACTIVO ? 'Activo' : 'Inactivo'}

                <button
                 onClick={() =>
                  cambiarEstadoServicio(
                    servicio['ID'],
                    servicio.ACTIVO
                 )
              }
              className={`mt-5 rounded-xl px-4 py-2 font-bold text-white ${
                servicio.ACTIVO
                 ? 'bg-red-600 hover:bg-red-700'
                 : 'bg-green-600 hover:bg-green-700'
            }`}
       >
  {servicio.ACTIVO
    ? 'Desactivar servicio'
    : 'Activar servicio'}
</button>
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}