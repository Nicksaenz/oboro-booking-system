'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type ModoFormulario = 'login' | 'registro'
type TipoMensaje = 'info' | 'error' | 'success'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const ESTADOS_PAGOS = ['activa', 'activo', 'pagada', 'paid']

function tieneSuscripcionActiva(suscripcion: any) {
  const estado = String(suscripcion?.estado ?? '').toLowerCase()
  const vence = suscripcion?.fecha_vencimiento
    ? new Date(suscripcion.fecha_vencimiento).getTime()
    : 0

  return ESTADOS_PAGOS.includes(estado) && vence >= Date.now()
}

export default function LoginPage() {
  const router = useRouter()
  const [modo, setModo] = useState<ModoFormulario>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [telefono, setTelefono] = useState('')
  const [recuperando, setRecuperando] = useState(false)
  const [codigoRecuperacion, setCodigoRecuperacion] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarNuevaPassword, setConfirmarNuevaPassword] = useState('')
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [destinoCodigo, setDestinoCodigo] = useState('')
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
      const resultado = await crearSuscripcionTrial(data.session, correo)
      mostrarMensaje('Inicio de sesion correcto.', 'success')
      router.replace(
        tieneSuscripcionActiva(resultado.suscripcion)
          ? '/bienvenida'
          : '/suscripcion'
      )
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
    mostrarMensaje('Creando cuenta...', 'info')

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
      mostrarMensaje('Cuenta creada. Elige un plan para activar el panel.', 'success')
      router.replace('/suscripcion')
    } catch (suscripcionError) {
      const texto =
        suscripcionError instanceof Error
          ? suscripcionError.message
          : 'La cuenta se creo, pero falta activar la suscripcion.'

      mostrarMensaje(texto, 'error')
      setLoading(false)
    }
  }

  async function solicitarCodigoRecuperacion() {
    const correo = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(correo)) {
      mostrarMensaje('Escribe tu correo para recuperar la contrasena.', 'error')
      return
    }

    setLoading(true)
    mostrarMensaje('Enviando codigo de seguridad...', 'info')

    const response = await fetch('/api/auth/recuperar-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: correo }),
    })
    const resultado = await response.json()

    if (!response.ok) {
      mostrarMensaje(resultado.error ?? 'No se pudo enviar el codigo.', 'error')
      setLoading(false)
      return
    }

    setCodigoEnviado(true)
    setDestinoCodigo(resultado.destino ?? '')
    mostrarMensaje(
      resultado.mensaje ?? 'Enviamos un codigo al WhatsApp registrado.',
      'success'
    )
    setLoading(false)
  }

  async function cambiarPasswordConCodigo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const correo = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(correo)) {
      mostrarMensaje('Escribe tu correo.', 'error')
      return
    }

    if (!codigoRecuperacion.trim()) {
      mostrarMensaje('Escribe el codigo que llego al WhatsApp.', 'error')
      return
    }

    if (nuevaPassword.length < MIN_PASSWORD_LENGTH) {
      mostrarMensaje(
        `La nueva contrasena debe tener minimo ${MIN_PASSWORD_LENGTH} caracteres.`,
        'error'
      )
      return
    }

    if (nuevaPassword !== confirmarNuevaPassword) {
      mostrarMensaje('Las contrasenas no coinciden.', 'error')
      return
    }

    setLoading(true)
    mostrarMensaje('Actualizando contrasena...', 'info')

    const response = await fetch('/api/auth/confirmar-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: correo,
        code: codigoRecuperacion,
        password: nuevaPassword,
      }),
    })
    const resultado = await response.json()

    if (!response.ok) {
      mostrarMensaje(resultado.error ?? 'No se pudo cambiar la contrasena.', 'error')
      setLoading(false)
      return
    }

    setRecuperando(false)
    setCodigoEnviado(false)
    setCodigoRecuperacion('')
    setNuevaPassword('')
    setConfirmarNuevaPassword('')
    setPassword('')
    mostrarMensaje('Contrasena actualizada. Ya puedes iniciar sesion.', 'success')
    setLoading(false)
  }

  const esRegistro = modo === 'registro'
  const textoBoton = loading
    ? esRegistro
      ? 'Creando cuenta...'
      : 'Ingresando...'
    : esRegistro
      ? 'Crear cuenta'
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
            ? 'Crea tu cuenta y elige un plan para activar el panel.'
            : 'Accede a tu software de agendamiento.'}
        </p>

        {!recuperando && (
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
        )}

        {!recuperando ? (
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
              onClick={() => {
                setRecuperando(true)
                setMensaje('')
                setCodigoEnviado(false)
              }}
              className="w-full text-zinc-400 hover:text-orange-500 transition mt-2 text-sm disabled:opacity-60"
            >
              Olvidaste tu contrasena?
            </button>
          )}
          </form>
        ) : (
          <form onSubmit={cambiarPasswordConCodigo} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Correo de la cuenta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black border border-orange-600/70 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
            />

            <button
              disabled={loading}
              type="button"
              onClick={solicitarCodigoRecuperacion}
              className="rounded-xl border border-orange-600/60 px-4 py-3 font-bold text-orange-200 transition hover:bg-orange-600/10 disabled:opacity-60"
            >
              {codigoEnviado ? 'Reenviar codigo al WhatsApp' : 'Enviar codigo al WhatsApp'}
            </button>

            {codigoEnviado && (
              <>
                {destinoCodigo && (
                  <p className="rounded-xl border border-green-500/30 bg-green-950/20 px-4 py-3 text-sm text-green-200">
                    Codigo enviado al WhatsApp terminado en {destinoCodigo}.
                  </p>
                )}

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Codigo de 6 digitos"
                  value={codigoRecuperacion}
                  onChange={(e) => setCodigoRecuperacion(e.target.value)}
                  className="bg-black border border-orange-600/70 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
                />

                <input
                  type="password"
                  placeholder="Nueva contrasena"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  className="bg-black border border-orange-600/70 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
                />

                <input
                  type="password"
                  placeholder="Confirmar nueva contrasena"
                  value={confirmarNuevaPassword}
                  onChange={(e) => setConfirmarNuevaPassword(e.target.value)}
                  className="bg-black border border-orange-600/70 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
                />

                <button
                  disabled={loading}
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:hover:bg-orange-600 rounded-xl py-3 font-bold mt-2 transition"
                >
                  Cambiar contrasena
                </button>
              </>
            )}

            <button
              disabled={loading}
              type="button"
              onClick={() => {
                setRecuperando(false)
                setCodigoEnviado(false)
                setMensaje('')
              }}
              className="w-full text-zinc-400 hover:text-orange-500 transition mt-2 text-sm disabled:opacity-60"
            >
              Volver al login
            </button>
          </form>
        )}

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
