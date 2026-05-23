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

    setMensaje('Cliente guardado correctamente.')
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
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
          Panel de Clientes
        </h1>

        <p className="mt-3 mb-8 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Sistema digital para gestionar clientes, citas y reservas.
        </p>

        <form
          onSubmit={guardarCliente}
          className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-orange-600/30 bg-zinc-950/70 p-4 shadow-2xl shadow-orange-950/20 sm:gap-4 sm:p-5 md:grid-cols-4"
        >
          <input
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
            placeholder="Nombre del cliente"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <input
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
            placeholder="Numero de celular"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            required
          />

          <input
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
            placeholder="Correo electronico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="submit"
            className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700"
          >
            Guardar cliente
          </button>

          <textarea
            className="min-h-24 rounded-xl border border-orange-600/50 bg-black p-4 outline-none md:col-span-4"
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
              className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20"
            >
              <h2 className="text-3xl font-bold text-orange-500 mb-4">
                {cliente.Nombre}
              </h2>

              <p className="text-lg">
                WhatsApp: {cliente.Numero}
              </p>

              <p className="text-lg mb-6">
                Email: {cliente.Email}
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
