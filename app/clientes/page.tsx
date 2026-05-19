'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ClientesPage() {

  const router = useRouter()
  const [clientes, setClientes] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [numero, setNumero] = useState('')
  const [email, setEmail] = useState('')
  const [notas, setNotas] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargarClientes() {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

if (!user) {
  router.push('/login')
  return
}

const { data, error } = await supabase
  .from('Clientes')
  .select('*')
  .eq('usuario_id', user.id)

    if (!error && data) {
      setClientes(data)
    }
  }

  async function guardarCliente(e: React.FormEvent) {
    e.preventDefault()
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
       router.push('/login')
      return
}

    const { error } = await supabase.from('Clientes').insert([
      {
        Nombre: nombre,
        Numero: numero,
        Email: email,
        Notas: notas,
        usuario_id: user.id,
      },
    ])

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setMensaje('Cliente guardado correctamente ✅')
    setNombre('')
    setNumero('')
    setEmail('')
    setNotas('')
    cargarClientes()
  }

  useEffect(() => {
    cargarClientes()
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
          OBORO BOOKING SYSTEM
        </p>

        <h1 className="text-5xl font-bold mt-2">
          Panel de Clientes
        </h1>

        <p className="text-zinc-400 mt-3 mb-10">
          Sistema digital para gestionar clientes, citas y reservas.
        </p>

        <form
          onSubmit={guardarCliente}
          className="grid md:grid-cols-4 gap-4 mb-10"
        >
          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Nombre del cliente"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Número de celular"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            required
          />

          <input
            className="rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="submit"
            className="rounded-xl bg-orange-600 hover:bg-orange-700 font-bold"
          >
            Guardar cliente
          </button>

          <textarea
            className="md:col-span-4 rounded-xl bg-zinc-950 border border-orange-600/50 p-4 outline-none"
            placeholder="Notas del cliente"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </form>

        {mensaje && (
          <p className="text-orange-400 mb-6">
            {mensaje}
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              className="border border-orange-600/50 bg-zinc-950 rounded-3xl p-6"
            >
              <h2 className="text-3xl font-bold text-orange-500 mb-4">
                {cliente.Nombre}
              </h2>

              <p className="text-lg">
                📞 {cliente.Numero}
              </p>

              <p className="text-lg mb-6">
                ✉️ {cliente.Email}
              </p>

              <p className="text-zinc-400">
                {cliente.Notas}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}