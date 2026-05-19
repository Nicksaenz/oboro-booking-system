'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)  

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMensaje(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    setMensaje('Inicio de sesión correcto ✅')
    setLoading(false)

    window.location.href = '/'
  }
  
  async function recuperarPassword() {
  if (!email) {
    setMensaje('Escribe tu correo para recuperar la contraseña ❌')
    return
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:3000/login',
  })

  if (error) {
    setMensaje(`Error: ${error.message}`)
    return
  }

  setMensaje('Te enviamos un correo para recuperar tu contraseña ✅')
}

  async function registrarse() {

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setMensaje('Usuario registrado correctamente ✅')
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-10">

      <section className="w-full max-w-md border border-orange-600 rounded-3xl p-8 bg-zinc-950">

        <p className="text-orange-500 font-bold tracking-[4px]">
          OBORO BOOKING
        </p>

        <h1 className="text-5xl font-bold mt-3 mb-3">
          Login
        </h1>

        <p className="text-zinc-400 mb-8">
          Accede a tu software.
        </p>

        <form
          onSubmit={iniciarSesion}
          className="flex flex-col gap-4"
        >

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black border border-orange-600 rounded-xl px-4 py-3"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black border border-orange-600 rounded-xl px-4 py-3"
          />

          <button
            type="submit"
            className="bg-orange-600 hover:bg-orange-700 rounded-xl py-3 font-bold mt-2"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>

          <button
            disabled={loading}
            type="button"
            onClick={registrarse}
            className="border border-orange-600 rounded-xl py-3 font-bold"
          >
            Registrarse
          </button>

          <button
          type="button"
          onClick={recuperarPassword}
          className="w-full text-zinc-400 hover:text-orange-500 transition mt-4 text-sm"
          >
         ¿Olvidaste tu contraseña?
         </button>

        
        </form>

        {mensaje && (
          <p className="text-orange-400 mt-6">
            {mensaje}
          </p>
        )}

      </section>

    </main>
  )
}