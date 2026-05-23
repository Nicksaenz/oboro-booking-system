'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type ModoFormulario = 'login' | 'registro'
type TipoMensaje = 'info' | 'error' | 'success'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export default function LoginPage() {
  const router = useRouter()
  const [modo, setModo] = useState<ModoFormulario>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tipoMensaje, setTipoMensaje] = useState<TipoMensaje>('info')
  const [loading, setLoading] = useState(false)

  function mostrarMensaje(texto: string, tipo: TipoMensaje = 'info') {
    setMensaje(texto)
    setTipoMensaje(tipo)
  }

  function validarCredenciales() {
    const correo = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(correo)) {
      mostrarMensaje('Escribe un correo valido.', 'error')
      return null
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      mostrarMensaje(
        `La contrasena debe tener minimo ${MIN_PASSWORD_LENGTH} caracteres.`,
        'error'
      )
      return null
    }

    return correo
  }

  async function crearSuscripcionTrial(session: Session, correo: string) {
    const response = await fetch('/api/suscripcion', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: correo,
        nombre_negocio: nombreNegocio.trim() || 'Nuevo negocio',
        telefono: telefono.trim() || 'Pendiente',
        plan: 'trial',
      }),
    })

    const resultado = await response.json()

    if (!response.ok) {
      throw new Error(resultado.error ?? 'No se pudo crear la suscripcion.')
    }

    return resultado
  }

  async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const correo = validarCredenciales()

    if (!correo) {
      return
    }

    setLoading(true)
    mostrarMensaje('Validando acceso...', 'info')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    })

    if (error || !data.session) {
      mostrarMensaje(error?.message ?? 'No se pudo iniciar sesion.', 'error')
      setLoading(false)
      return
    }

    try {
      await crearSuscripcionTrial(data.session, correo)
      mostrarMensaje('Inicio de sesion correcto.', 'success')
      router.replace('/')
    } catch (suscripcionError) {
      const texto =
        suscripcionError instanceof Error
          ? suscripcionError.message
          : 'No se pudo validar la suscripcion.'

      mostrarMensaje(texto, 'error')
      setLoading(false)
    }
  }

  async function registrarse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const correo = validarCredenciales()

    if (!correo) {
      return
    }

    if (!nombreNegocio.trim()) {
      mostrarMensaje('Escribe el nombre del negocio.', 'error')
      return
    }

    setLoading(true)
    mostrarMensaje('Creando cuenta y trial...', 'info')

    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password,
      options: {
        data: {
          nombre_negocio: nombreNegocio.trim(),
          telefono: telefono.trim(),
        },
      },
    })

    if (error) {
      mostrarMensaje(error.message, 'error')
      setLoading(false)
      return
    }

    if (!data.session) {
      mostrarMensaje(
        'Cuenta creada. Revisa tu correo para confirmar el acceso.',
        'success'
      )
      setLoading(false)
      return
    }

    try {
      await crearSuscripcionTrial(data.session, correo)
      mostrarMensaje('Cuenta creada con trial activo.', 'success')
      router.replace('/')
    } catch (suscripcionError) {
      const texto =
        suscripcionError instanceof Error
          ? suscripcionError.message
          : 'La cuenta se creo, pero falta activar la suscripcion.'

      mostrarMensaje(texto, 'error')
      setLoading(false)
    }
  }

  async function recuperarPassword() {
    const correo = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(correo)) {
      mostrarMensaje('Escribe tu correo para recuperar la contrasena.', 'error')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/login`,
    })

    if (error) {
      mostrarMensaje(error.message, 'error')
      setLoading(false)
      return
    }

    mostrarMensaje('Te enviamos un correo para recuperar tu contrasena.', 'success')
    setLoading(false)
  }

  const esRegistro = modo === 'registro'
  const textoBoton = loading
    ? esRegistro
      ? 'Creando cuenta...'
      : 'Ingresando...'
    : esRegistro
      ? 'Crear cuenta trial'
      : 'Iniciar sesion'

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md border border-orange-600/70 rounded-2xl p-6 sm:p-8 bg-zinc-950 shadow-2xl shadow-orange-950/20">
        <p className="text-orange-500 font-bold tracking-[4px] text-sm">
          OBORO BOOKING
        </p>

        <h1 className="text-4xl sm:text-5xl font-bold mt-3">
          {esRegistro ? 'Crear cuenta' : 'Login'}
        </h1>

        <p className="text-zinc-400 mt-3 mb-7">
          {esRegistro
            ? 'Activa tu trial y empieza a gestionar reservas.'
            : 'Accede a tu software de agendamiento.'}
        </p>

        <div className="grid grid-cols-2 rounded-xl border border-orange-600/40 p-1 mb-6">
          <button
            type="button"
            onClick={() => setModo('login')}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              !esRegistro ? 'bg-orange-600 text-white' : 'text-zinc-400'
            }`}
          >
            Ingresar
          </button>

          <button
            type="button"
            onClick={() => setModo('registro')}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              esRegistro ? 'bg-orange-600 text-white' : 'text-zinc-400'
            }`}
          >
            Registro
          </button>
        </div>

        <form
          onSubmit={esRegistro ? registrarse : iniciarSesion}
          className="flex flex-col gap-4"
        >
          {esRegistro && (
            <>
              <input
                type="text"
                placeholder="Nombre del negocio"
                value={nombreNegocio}
                onChange={(e) => setNombreNegocio(e.target.value)}
                className="bg-black border border-orange-600/70 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
              />

              <input
                type="tel"
                placeholder="WhatsApp o telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="bg-black border border-orange-600/70 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Correo electronico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black border border-orange-600/70 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
          />

          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black border border-orange-600/70 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
          />

          <button
            disabled={loading}
            type="submit"
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:hover:bg-orange-600 rounded-xl py-3 font-bold mt-2 transition"
          >
            {textoBoton}
          </button>

          {!esRegistro && (
            <button
              disabled={loading}
              type="button"
              onClick={recuperarPassword}
              className="w-full text-zinc-400 hover:text-orange-500 transition mt-2 text-sm disabled:opacity-60"
            >
              Olvidaste tu contrasena?
            </button>
          )}
        </form>

        {mensaje && (
          <p
            className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
              tipoMensaje === 'error'
                ? 'border-red-500/40 bg-red-950/30 text-red-200'
                : tipoMensaje === 'success'
                  ? 'border-green-500/40 bg-green-950/30 text-green-200'
                  : 'border-orange-500/40 bg-orange-950/30 text-orange-200'
            }`}
          >
            {mensaje}
          </p>
        )}
      </section>
    </main>
  )
}
