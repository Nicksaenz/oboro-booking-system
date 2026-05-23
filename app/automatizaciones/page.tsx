'use client'

import { useEffect, useState } from 'react'

type WhatsAppStatus = {
  listo: boolean
  schedule: string
  endpoint: string
  webhookEndpoint: string
  template: string
  language: string
  variables: Record<string, boolean>
}

const VARIABLES = [
  {
    key: 'cronSecret',
    label: 'CRON_SECRET',
    detalle: 'Protege la ruta programada para que no quede abierta.',
  },
  {
    key: 'phoneNumberId',
    label: 'META_WHATSAPP_PHONE_NUMBER_ID',
    detalle: 'ID del numero conectado en Meta WhatsApp.',
  },
  {
    key: 'accessToken',
    label: 'META_WHATSAPP_ACCESS_TOKEN',
    detalle: 'Token permanente para enviar mensajes.',
  },
  {
    key: 'verifyToken',
    label: 'META_WHATSAPP_VERIFY_TOKEN',
    detalle: 'Token privado que Meta usa para verificar el webhook.',
  },
  {
    key: 'templateName',
    label: 'META_WHATSAPP_TEMPLATE_RECORDATORIO',
    detalle: 'Nombre exacto de la plantilla aprobada.',
  },
  {
    key: 'templateLanguage',
    label: 'META_WHATSAPP_TEMPLATE_LANGUAGE',
    detalle: 'Idioma de la plantilla, por ejemplo es_CO.',
  },
]

const PASOS = [
  {
    titulo: '1. Tu cliente queda agendado',
    texto: 'El negocio crea una cita con cliente, fecha, hora, servicio y empleado.',
  },
  {
    titulo: '2. Oboro prepara el mensaje',
    texto: 'El sistema toma los datos de la cita y arma el recordatorio con la plantilla aprobada.',
  },
  {
    titulo: '3. WhatsApp lo entrega',
    texto: 'El mensaje sale desde el numero de WhatsApp Business conectado para el negocio.',
  },
]

export default function AutomatizacionesPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [cargando, setCargando] = useState(true)
  const [probando, setProbando] = useState(false)
  const [mensajePrueba, setMensajePrueba] = useState('')

  useEffect(() => {
    async function cargarStatus() {
      const response = await fetch('/api/whatsapp/status')
      const data = await response.json()

      setStatus(data)
      setCargando(false)
    }

    cargarStatus()
  }, [])

  async function enviarPrueba() {
    setProbando(true)
    setMensajePrueba('')

    const { supabase } = await import('@/lib/supabase')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      setMensajePrueba('Inicia sesion de nuevo para enviar la prueba.')
      setProbando(false)
      return
    }

    const response = await fetch('/api/whatsapp/enviar-prueba', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const resultado = await response.json()

    if (!response.ok) {
      setMensajePrueba(resultado.error ?? 'No se pudo enviar la prueba.')
      setProbando(false)
      return
    }

    setMensajePrueba('WhatsApp de prueba enviado correctamente.')
    setProbando(false)
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">
              Automatizaciones
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Recordatorios automaticos para clientes conectados con WhatsApp.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-5 py-4 ${
              status?.listo
                ? 'border-green-500/50 bg-green-950/20 text-green-300'
                : 'border-orange-500/50 bg-orange-950/20 text-orange-200'
            }`}
          >
            <p className="text-sm text-zinc-400">Estado</p>
            <p className="text-xl font-bold">
              {cargando
                ? 'Revisando...'
                : status?.listo
                  ? 'Listo para enviar'
                  : 'Configuracion pendiente'}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
          <h2 className="text-2xl font-bold">
            Como funcionara para tu cliente
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            El negocio no tiene que copiar mensajes ni abrir WhatsApp a mano.
            Cuando haya citas creadas, Oboro Booking enviara recordatorios
            automaticamente desde el WhatsApp Business conectado.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {PASOS.map((paso) => (
              <div
                key={paso.titulo}
                className="rounded-xl border border-zinc-800 bg-black p-4"
              >
                <h3 className="font-bold text-orange-500">
                  {paso.titulo}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {paso.texto}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <p className="text-sm text-zinc-500">Recordatorio automatico</p>
            <h2 className="mt-2 text-2xl font-bold text-orange-500">
              {status?.schedule ?? 'Todos los dias a las 8:00 a. m. Colombia'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Revisa las citas del dia siguiente y envia el mensaje si todo
              esta configurado.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <p className="text-sm text-zinc-500">Mensaje aprobado</p>
            <h2 className="mt-2 text-2xl font-bold text-orange-500">
              {status?.template ?? 'recordatorio_cita'}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Idioma: {status?.language ?? 'es_CO'}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <p className="text-sm text-zinc-500">Envio manual</p>
            <h2 className="mt-2 text-2xl font-bold text-orange-500">
              Desde Citas
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              En cada cita aparece el boton Enviar WhatsApp para reenviar un
              recordatorio cuando el negocio lo necesite.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
          <p className="text-sm text-zinc-500">Numero que enviara mensajes</p>
          <h2 className="mt-2 text-2xl font-bold text-orange-500">
            WhatsApp Business conectado
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Para el MVP, Oboro Lab configura el numero en Meta. Mas adelante
            cada negocio podra conectar su propio WhatsApp Business desde esta
            misma seccion.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-zinc-500">Prueba rapida</p>
              <h2 className="mt-2 text-2xl font-bold text-orange-500">
                Enviar WhatsApp de prueba
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Usa el telefono guardado en la suscripcion de esta cuenta y la
                misma plantilla que usaran las citas.
              </p>
            </div>

            <button
              type="button"
              onClick={enviarPrueba}
              disabled={probando || !status?.listo}
              className="min-h-12 rounded-xl bg-orange-600 px-5 py-3 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {probando ? 'Enviando...' : 'Enviar prueba'}
            </button>
          </div>

          {mensajePrueba && (
            <p className="mt-4 rounded-xl border border-orange-500/40 bg-black px-4 py-3 text-sm text-orange-200">
              {mensajePrueba}
            </p>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
          <h2 className="text-2xl font-bold">
            Configuracion tecnica de Oboro Lab
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
            Esta parte es para administrar la conexion con Meta y Vercel. No es
            algo que el cliente final tenga que configurar.
          </p>

          <div className="mt-5 grid gap-3">
            {VARIABLES.map((variable) => {
              const configurada = Boolean(status?.variables?.[variable.key])

              return (
                <div
                  key={variable.key}
                  className="grid gap-3 rounded-xl border border-zinc-800 bg-black p-4 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="break-all font-bold text-white">
                      {variable.label}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {variable.detalle}
                    </p>
                  </div>

                  <span
                    className={`h-fit rounded-full px-4 py-2 text-sm font-bold ${
                      configurada
                        ? 'bg-green-500/15 text-green-300'
                        : 'bg-orange-500/15 text-orange-300'
                    }`}
                  >
                    {configurada ? 'Configurada' : 'Pendiente'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-5">
          <h2 className="text-2xl font-bold">
            Mensaje que recibira el cliente
          </h2>
          <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300">
            Hola {'{{1}}'}, te recordamos tu cita en Oboro Booking para el dia
            {' {{2}}'} a las {'{{3}}'}. Servicio: {'{{4}}'}. Te atendera
            {' {{5}}'}. Responde este mensaje si necesitas cambiar tu reserva.
          </p>
        </div>
      </section>
    </main>
  )
}
