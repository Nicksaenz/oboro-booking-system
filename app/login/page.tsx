'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type ModoFormulario = 'login' | 'registro'
type TipoMensaje = 'info' | 'error' | 'success'
type PlanRegistro = 'basico' | 'pro' | 'business'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const ESTADOS_PAGOS = ['activa', 'activo', 'pagada', 'paid']
const BENEFICIOS_LANDING = [
  'Reservas por QR y link desde Basic',
  'Ubicacion y resenas de Google Maps dentro de la reserva',
  'Agenda, clientes, servicios y equipo en un solo panel',
  'WhatsApp automatico incluido desde Basic',
]
const MODULOS_LANDING = [
  [
    'Reserva QR premium',
    'Foto del negocio, mapa abierto, Google Reviews, profesional, horarios AM/PM y confirmacion clara para el cliente.',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1300&q=85',
  ],
  [
    'WhatsApp operativo',
    'Recordatorios automaticos al cliente y al negocio, boton manual por cita y solicitud de resena al completar.',
    'https://images.unsplash.com/photo-1611605698335-8b1569810432?auto=format&fit=crop&w=1300&q=85',
  ],
  [
    'Finanzas por plan',
    'Pro mide ingresos, gastos y utilidad. Business suma margen, ticket promedio, liquidaciones y resumen por colaborador.',
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1300&q=85',
  ],
]
const WHATSAPP_LANDING = [
  ['Automatico', 'Avisos 20 y 5 minutos antes para cliente y negocio desde Basic.'],
  ['Manual', 'Boton WhatsApp en cada cita para reenviar recordatorio listo.'],
  ['Resenas', 'Al completar la cita se prepara el mensaje para pedir calificacion.'],
  ['Diagnostico', 'Estado interno de plantillas, endpoint, webhook y envios recientes.'],
]
const DIFERENCIALES_LANDING = [
  ['Sin instalar app', 'Tus clientes reservan desde el navegador con un link o QR.'],
  ['Hecho para citas', 'Barberias, unas, spa, veterinarias, consultorios, asesores e independientes.'],
  ['Menos chats perdidos', 'Cada reserva llega con servicio, fecha, hora, profesional y recordatorio automatico.'],
  ['Listo para crecer', 'Empieza solo y suma empleados, accesos y finanzas cuando lo necesites.'],
]
const SECTORES_LANDING = [
  {
    titulo: 'Barberias',
    texto: 'Agenda cortes, barba, tintes y turnos con profesionales disponibles.',
    imagen:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80',
  },
  {
    titulo: 'Unas y belleza',
    texto: 'Organiza manicura, pedicura, pestanas, cejas y servicios por duracion.',
    imagen:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80',
  },
  {
    titulo: 'Spa y estetica',
    texto: 'Controla cabinas, tratamientos, masajes y reservas recurrentes.',
    imagen:
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80',
  },
  {
    titulo: 'Veterinarias',
    texto: 'Recibe citas para consultas, vacunas, peluqueria y controles.',
    imagen:
      'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=900&q=80',
  },
  {
    titulo: 'Independientes',
    texto: 'Profesionales que venden tiempo, sesiones, asesorias o atencion personalizada.',
    imagen:
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80',
  },
]
const PASOS_LANDING = [
  ['01', 'Configura tu negocio', 'Servicios, precios, duracion, horarios y profesionales.'],
  ['02', 'Comparte el QR', 'Ponlo en Instagram, WhatsApp, recepcion o volantes impresos.'],
  ['03', 'Recibe reservas claras', 'El cliente elige servicio, fecha, hora y profesional disponible.'],
  ['04', 'Automatiza recordatorios', 'Oboro recuerda la cita al negocio y al cliente final por WhatsApp.'],
]
const PLANES_LANDING = [
  {
    id: 'basico' as const,
    nombre: 'Basic',
    precio: '$40.000',
    detalle: 'Ideal para independientes y negocios pequenos que quieren agenda, QR y automatizacion.',
    funciones: [
      '7 dias gratis al crear la cuenta',
      'QR de agendamiento incluido',
      'Link publico para redes y WhatsApp',
      '1 administrador principal',
      'Hasta 2 empleados o profesionales',
      'Clientes, servicios, empleados y citas',
      'Dashboard de reservas',
      'Recordatorios automaticos al negocio y al cliente',
      'Google Maps y resenas del negocio en el QR',
      'Resenas y calificacion por empleado',
    ],
  },
  {
    id: 'pro' as const,
    nombre: 'Pro',
    precio: '$90.000',
    detalle: 'Para equipos que necesitan mas capacidad, seguimiento y operacion diaria.',
    funciones: [
      'Todo lo del plan Basic',
      'QR de agendamiento incluido',
      'Hasta 5 empleados o profesionales',
      'Hasta 3 accesos adicionales para equipo',
      'Links para confirmar y cancelar cita',
      'Recordatorio automatico al negocio y al cliente final',
      'Foto del empleado en el recordatorio cuando Meta lo permite',
      'Ranking interno e historial de clientes',
      'Finanzas basicas: ingresos, gastos y utilidad',
      'Perfil publico mas completo para convertir visitas',
      'Mayor control de agenda y operacion',
    ],
  },
  {
    id: 'business' as const,
    nombre: 'Business',
    precio: '$120.000',
    detalle: 'Para negocios con equipo, gastos, ingresos y liquidacion de colaboradores.',
    funciones: [
      'Todo lo del plan Pro',
      'QR de agendamiento incluido',
      'Hasta 10 empleados o profesionales',
      'Hasta 6 accesos adicionales para equipo',
      'Finanzas Business con resumen ejecutivo',
      'Registro de gastos por categoria',
      'Liquidacion avanzada de colaboradores',
      'Margen, utilidad y ticket promedio',
      'Administrador financiero incluido',
      'Recordatorios automaticos con datos de servicio y empleado',
    ],
  },
]

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
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanRegistro>('basico')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mostrarNuevaPassword, setMostrarNuevaPassword] = useState(false)
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false)
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [destinoCodigo, setDestinoCodigo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tipoMensaje, setTipoMensaje] = useState<TipoMensaje>('info')
  const [loading, setLoading] = useState(false)

  function mostrarMensaje(texto: string, tipo: TipoMensaje = 'info') {
    setMensaje(texto)
    setTipoMensaje(tipo)
  }

  function enfocarAcceso(modoFormulario: ModoFormulario, plan: PlanRegistro = planSeleccionado) {
    setModo(modoFormulario)
    setPlanSeleccionado(plan)
    setRecuperando(false)
    setMensaje('')
    window.requestAnimationFrame(() => {
      document.getElementById('registro')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
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

  async function crearSuscripcionPrueba(session: Session, correo: string) {
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
        plan: planSeleccionado,
        prueba_gratis: true,
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
      const resultado = await crearSuscripcionPrueba(data.session, correo)
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
      await crearSuscripcionPrueba(data.session, correo)
      mostrarMensaje('Cuenta creada. Tienes 7 dias gratis para probar Oboro.', 'success')
      router.replace('/bienvenida')
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
    <main className="min-h-screen bg-[#060606] text-white">
      <section className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <p className="text-2xl font-black text-orange-500">OBORO BOOKING</p>
            <p className="text-xs font-bold uppercase tracking-[3px] text-zinc-500">
              Powered by Oboro Lab
            </p>
          </div>
          <div className="hidden items-center gap-6 text-sm font-bold text-zinc-300 md:flex">
            <a href="#beneficios" className="transition hover:text-orange-400">Beneficios</a>
            <a href="#sectores" className="transition hover:text-orange-400">Negocios</a>
            <a href="#precios" className="transition hover:text-orange-400">Precios</a>
            <a href="#registro" className="transition hover:text-orange-400">Entrar</a>
          </div>
          <button
            type="button"
            onClick={() => enfocarAcceso('registro')}
            className="min-h-11 rounded-full bg-white px-5 text-sm font-black text-black transition hover:bg-orange-100"
          >
            Probar 7 dias
          </button>
        </div>
      </section>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-16">
        <div>
          <p className="inline-flex rounded-full border border-orange-500/35 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-200">
            7 dias gratis. QR, WhatsApp y Google Maps desde Basic.
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.03] sm:text-6xl lg:text-6xl xl:text-7xl">
            Reservas premium para negocios que viven de su agenda.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Oboro Booking une agenda, QR publico, Google Maps, resenas,
            WhatsApp automatico, clientes, empleados, finanzas Pro y
            liquidaciones Business en una experiencia seria para vender mas.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => enfocarAcceso('registro')}
              className="min-h-14 rounded-xl bg-orange-600 px-6 text-base font-black transition hover:bg-orange-700"
            >
              Empezar gratis
            </button>
            <button
              type="button"
              onClick={() => enfocarAcceso('login')}
              className="min-h-14 rounded-xl border border-white/20 px-6 text-base font-black text-zinc-100 transition hover:border-orange-500/70 hover:bg-orange-600/10"
            >
              Ya tengo cuenta
            </button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {BENEFICIOS_LANDING.map((beneficio) => (
              <div
                key={beneficio}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-300"
              >
                <span className="mr-2 font-black text-orange-500">+</span>
                {beneficio}
              </div>
            ))}
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            <div className="border-l border-orange-500/50 pl-4">
              <p className="text-2xl font-black text-white">24/7</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Reservas mientras trabajas</p>
            </div>
            <div className="border-l border-emerald-500/50 pl-4">
              <p className="text-2xl font-black text-white">QR</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Para redes y volantes</p>
            </div>
            <div className="border-l border-sky-500/50 pl-4">
            <p className="text-2xl font-black text-white">$40.000</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Plan inicial mensual</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black">
            <div className="relative h-72 overflow-hidden sm:h-96">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1400&q=85"
                alt="Negocio de servicios usando reservas premium"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-xs font-bold uppercase tracking-[3px] text-orange-300">
                  Experiencia del cliente
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  QR con identidad, mapa y confianza
                </h2>
              </div>
            </div>
            <div className="border-b border-white/10 bg-zinc-900 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[3px] text-orange-400">
                    Vista del negocio
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Agenda de hoy</h2>
                </div>
                <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
                  Activo
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-[1fr_0.72fr]">
              <div className="rounded-xl border border-white/10 bg-black p-4">
                <div className="grid grid-cols-4 gap-2 text-center text-xs text-zinc-500">
                  {['9:00', '10:30', '12:00', '3:20'].map((hora) => (
                    <div key={hora} className="rounded-lg bg-zinc-900 py-2">
                      {hora}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ['Juliana G.', 'Manicure semipermanente', 'Confirmada', 'emerald'],
                    ['Daniel R.', 'Corte + barba', 'Pendiente', 'orange'],
                    ['Camila P.', 'Pestanas volumen', 'Reservada por QR', 'sky'],
                  ].map(([cliente, servicio, estado, color]) => (
                    <div key={cliente} className="rounded-xl border border-white/10 bg-zinc-950 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-white">{cliente}</p>
                          <p className="mt-1 text-sm text-zinc-400">{servicio}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            color === 'emerald'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : color === 'sky'
                                ? 'bg-sky-500/15 text-sky-300'
                                : 'bg-orange-500/15 text-orange-300'
                          }`}
                        >
                          {estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                <p className="text-sm font-black text-orange-200">QR de agendamiento</p>
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=https%3A%2F%2Fbooking.oborolab.com%2Flogin"
                  alt="QR de agendamiento de Oboro Booking"
                  className="mt-4 aspect-square w-full rounded-xl border border-white/20 bg-white p-4"
                />
                <p className="mt-4 text-sm leading-6 text-orange-100">
                  Este QR es de ejemplo para la landing. Dentro de Oboro, cada
                  negocio tiene su propio QR para que sus clientes agenden.
                </p>
              </div>
            </div>
          </div>

        <section id="registro" className="rounded-2xl border border-orange-600/50 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/30 sm:p-6">
          <p className="text-sm font-bold uppercase tracking-[4px] text-orange-500">
            {esRegistro ? 'Empieza hoy' : recuperando ? 'Recuperacion' : 'Acceso'}
          </p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            {recuperando ? 'Recuperar cuenta' : esRegistro ? '7 dias gratis' : 'Entrar al panel'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {recuperando
              ? 'Recibe un codigo por WhatsApp y actualiza tu contrasena.'
              : esRegistro
                ? `Prueba ${PLANES_LANDING.find((plan) => plan.id === planSeleccionado)?.nombre ?? 'Oboro'} durante 7 dias antes de pagar.`
                : 'Continua administrando tus citas y tu equipo.'}
          </p>

          {!recuperando && (
            <div className="mt-6 grid grid-cols-2 rounded-xl border border-orange-600/40 p-1">
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
            className="mt-6 flex flex-col gap-4"
          >
          {esRegistro && (
            <>
              <div className="rounded-xl border border-orange-600/40 bg-black p-3">
                <p className="mb-3 text-sm font-bold text-orange-200">
                  Plan para iniciar la prueba gratis
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PLANES_LANDING.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanSeleccionado(plan.id)}
                      className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                        planSeleccionado === plan.id
                          ? 'border-orange-500 bg-orange-600 text-white'
                          : 'border-zinc-800 text-zinc-300 hover:border-orange-500/60'
                      }`}
                    >
                      {plan.nombre}
                    </button>
                  ))}
                </div>
              </div>

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

              <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-xl border border-orange-600/70 bg-black focus-within:border-orange-400">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Contrasena"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black px-4 py-3 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((valor) => !valor)}
                  className="px-4 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
                >
                  {mostrarPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>

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
          <form onSubmit={cambiarPasswordConCodigo} className="mt-6 flex flex-col gap-4">
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

                <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-xl border border-orange-600/70 bg-black focus-within:border-orange-400">
                  <input
                    type={mostrarNuevaPassword ? 'text' : 'password'}
                    placeholder="Nueva contrasena"
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    className="bg-black px-4 py-3 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNuevaPassword((valor) => !valor)}
                    className="px-4 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
                  >
                    {mostrarNuevaPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-xl border border-orange-600/70 bg-black focus-within:border-orange-400">
                  <input
                    type={mostrarConfirmarPassword ? 'text' : 'password'}
                    placeholder="Confirmar nueva contrasena"
                    value={confirmarNuevaPassword}
                    onChange={(e) => setConfirmarNuevaPassword(e.target.value)}
                    className="bg-black px-4 py-3 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmarPassword((valor) => !valor)}
                    className="px-4 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
                  >
                    {mostrarConfirmarPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>

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

      <section className="border-y border-zinc-800 bg-zinc-950/70 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[4px] text-orange-500">
                Plataforma completa
              </p>
              <h2 className="mt-3 max-w-4xl text-3xl font-black sm:text-5xl">
                Todo lo que montamos para que la reserva se sienta de marca.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-400">
              No es solo una agenda: es una experiencia de confianza antes,
              durante y despues de cada cita.
            </p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {MODULOS_LANDING.map(([titulo, texto, imagen]) => (
              <article
                key={titulo}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black"
              >
                <div className="h-72 overflow-hidden sm:h-80 lg:h-96">
                  <img
                    src={imagen}
                    alt={titulo}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-2xl font-black text-white">{titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
        </div>
      </section>

      <section id="sectores" className="px-5 pb-14 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[4px] text-orange-500">
                Para quien es
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-5xl">
                Una agenda premium para negocios que venden tiempo y confianza.
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {SECTORES_LANDING.map((sector, index) => (
              <article
                key={sector.titulo}
                className={`group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/30 ${
                  index === 0 ? 'md:col-span-2 xl:col-span-1' : ''
                }`}
              >
                <div className="relative h-80 overflow-hidden xl:h-96">
                  <img
                    src={sector.imagen}
                    alt={`${sector.titulo} usando agenda de citas`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-2xl font-black text-white">
                      {sector.titulo}
                    </h3>
                  </div>
                </div>
                <p className="min-h-24 p-4 text-sm leading-6 text-zinc-300">
                  {sector.texto}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="beneficios" className="border-y border-zinc-800 bg-zinc-950/70 px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[4px] text-orange-500">
                Por que Oboro
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-5xl">
                Menos mensajes repetidos, mas reservas confirmadas.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">
                La experiencia se siente simple para el cliente y ordenada para
                el negocio. Eso ayuda a vender mas sin sumar trabajo manual.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DIFERENCIALES_LANDING.map(([titulo, texto]) => (
                <article key={titulo} className="rounded-xl border border-white/10 bg-black p-5">
                  <h3 className="text-xl font-black text-white">{titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{texto}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {PASOS_LANDING.map(([numero, titulo, texto]) => (
              <article key={titulo} className="rounded-xl border border-zinc-800 bg-black p-5">
                <p className="text-sm font-black text-orange-500">{numero}</p>
                <h3 className="mt-3 text-xl font-black">{titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{texto}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-green-600/40 bg-green-950/10 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[4px] text-green-300">
                  WhatsApp verificado
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Automatizacion y envio manual conviven en el mismo flujo.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-zinc-400">
                Si Meta falla o el negocio quiere insistir, Oboro conserva el
                boton manual con plantilla lista para enviar.
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {WHATSAPP_LANDING.map(([titulo, texto]) => (
                <article key={titulo} className="rounded-xl border border-green-500/20 bg-black p-4">
                  <h3 className="font-black text-green-300">{titulo}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{texto}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[4px] text-orange-500">
                Planes
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Planes con valor real, no solo mas usuarios.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-400">
              Basic automatiza reservas. Pro mide operacion y finanzas basicas.
              Business controla equipo, utilidad y liquidaciones con mas rigor.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANES_LANDING.map((plan, index) => (
              <article
                key={plan.nombre}
                className={`relative rounded-xl border bg-zinc-950 p-5 shadow-lg ${
                  index === 1
                    ? 'border-emerald-500/60 shadow-emerald-950/20'
                    : 'border-orange-600/35 shadow-orange-950/20'
                }`}
              >
                {index === 1 && (
                  <span className="absolute right-5 top-5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-black">
                    Recomendado
                  </span>
                )}
                <h3 className="text-2xl font-black text-orange-500">{plan.nombre}</h3>
                <p className="mt-3 text-4xl font-black">{plan.precio}</p>
                <p className="mt-1 text-sm text-zinc-500">COP / mes</p>
                <p className="mt-4 min-h-16 text-sm leading-6 text-zinc-300">
                  {plan.detalle}
                </p>
                <p className="mt-4 rounded-xl border border-green-500/30 bg-green-950/10 px-4 py-3 text-sm font-bold text-green-300">
                  QR de agendamiento incluido en este plan
                </p>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-300">
                  {plan.funciones.map((funcion) => (
                    <li key={funcion} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                      <span>{funcion}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => enfocarAcceso('registro', plan.id)}
                  className="mt-5 min-h-12 w-full rounded-xl bg-white px-4 text-sm font-black text-black transition hover:bg-orange-100"
                >
                  Probar {plan.nombre} 7 dias
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
