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

type WhatsAppConfiguracion = {
  telefono_negocio: string
  phone_number_id: string
  access_token_configurado: boolean
  template_recordatorio: string
  template_language: string
  activo: boolean
}

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
  const [configuracion, setConfiguracion] = useState<WhatsAppConfiguracion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [mensajePrueba, setMensajePrueba] = useState('')
  const [mensajeConfig, setMensajeConfig] = useState('')
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false)
  const [telefonoNegocio, setTelefonoNegocio] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [templateRecordatorio, setTemplateRecordatorio] = useState('recordatorio_cita')
  const [templateLanguage, setTemplateLanguage] = useState('es_CO')

  useEffect(() => {
    async function cargarStatus() {
      const { supabase } = await import('@/lib/supabase')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const [statusResponse, configResponse] = await Promise.all([
        fetch('/api/whatsapp/status'),
        token
          ? fetch('/api/whatsapp/configuracion', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          : Promise.resolve(null),
      ])
      const data = await statusResponse.json()

      setStatus(data)

      if (configResponse) {
        const configData = await configResponse.json()
        const config = configData.configuracion ?? null

        setConfiguracion(config)

        if (config) {
          setTelefonoNegocio(config.telefono_negocio ?? '')
          setPhoneNumberId(config.phone_number_id ?? '')
          setTemplateRecordatorio(config.template_recordatorio ?? 'recordatorio_cita')
          setTemplateLanguage(config.template_language ?? 'es_CO')
        }
      }

      setCargando(false)
    }

    cargarStatus()
  }, [])

  async function guardarConfiguracion(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMensajeConfig('')

    const { supabase } = await import('@/lib/supabase')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      setMensajeConfig('Inicia sesion de nuevo para guardar la configuracion.')
      setGuardando(false)
      return
    }

    const response = await fetch('/api/whatsapp/configuracion', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telefono_negocio: telefonoNegocio,
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        template_recordatorio: templateRecordatorio,
        template_language: templateLanguage,
      }),
    })

    const resultado = await response.json()

    if (!response.ok) {
      setMensajeConfig(resultado.error ?? 'No se pudo guardar la configuracion.')
      setGuardando(false)
      return
    }

    setConfiguracion(resultado.configuracion)
    setAccessToken('')
    setMensajeConfig('WhatsApp Business conectado para este negocio.')
    setGuardando(false)
  }

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
                : configuracion?.activo
                    ? 'Numero conectado'
                    : 'Sin conectar'}
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
            automaticamente desde el WhatsApp Business propio de ese negocio.
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
            {configuracion?.activo
              ? configuracion.telefono_negocio
              : 'Conecta el WhatsApp de tu negocio'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Los recordatorios de tus citas saldran desde el numero de tu
            negocio. Tus clientes veran tu marca y podran responderte a ti.
          </p>
        </div>

        <form
          onSubmit={guardarConfiguracion}
          className="mt-4 rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20"
        >
          <h2 className="text-2xl font-bold">
            Conectar mi WhatsApp Business
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Para activar los recordatorios desde tu numero, primero debes tener
            WhatsApp Business verificado en Meta. Si no sabes como hacerlo,
            solicita ayuda y Oboro Lab te guia en la conexion.
          </p>

          <div className="mt-5 grid gap-3">
            <input
              className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
              placeholder="Numero de WhatsApp del negocio, ej: 573001234567"
              value={telefonoNegocio}
              onChange={(e) => setTelefonoNegocio(e.target.value)}
            />
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
            <h3 className="font-bold text-white">
              Conexion asistida
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Si no tienes los datos de Meta, guarda este numero y pide a Oboro
              Lab que lo conecte. Cuando quede activo, esta pantalla mostrara
              Numero conectado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMostrarAvanzado(!mostrarAvanzado)}
            className="mt-5 rounded-xl border border-orange-600/60 px-5 py-3 font-bold text-orange-200 transition hover:bg-orange-600/10"
          >
            {mostrarAvanzado
              ? 'Ocultar configuracion avanzada'
              : 'Ya tengo los datos de Meta'}
          </button>

          {mostrarAvanzado && (
            <div className="mt-5 grid gap-3 rounded-xl border border-zinc-800 bg-black p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <h3 className="font-bold text-white">
                  Configuracion avanzada
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Esta parte normalmente la completa Oboro Lab durante la
                  conexion del WhatsApp Business.
                </p>
              </div>

              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                placeholder="Phone Number ID de Meta"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />

              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                placeholder={
                  configuracion?.access_token_configurado
                    ? 'Token configurado. Escribe uno nuevo solo si deseas cambiarlo.'
                    : 'Access Token permanente de Meta'
                }
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />

              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                placeholder="Plantilla aprobada"
                value={templateRecordatorio}
                onChange={(e) => setTemplateRecordatorio(e.target.value)}
              />

              <input
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                placeholder="Idioma, ej: es_CO"
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
              />

              <button
                type="submit"
                disabled={guardando}
                className="min-h-12 rounded-xl bg-orange-600 px-5 py-3 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
              >
                {guardando ? 'Guardando...' : 'Guardar conexion'}
              </button>
            </div>
          )}

          {mensajeConfig && (
            <p className="mt-4 rounded-xl border border-orange-500/40 bg-black px-4 py-3 text-sm text-orange-200">
              {mensajeConfig}
            </p>
          )}
        </form>

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
              disabled={probando || !configuracion?.activo}
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
