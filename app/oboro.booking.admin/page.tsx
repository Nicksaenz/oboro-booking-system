'use client'

import { useEffect, useMemo, useState } from 'react'

type RegistroCrm = {
  id: string
  usuario_id: string | null
  email: string | null
  email_auth: string | null
  nombre_negocio: string
  telefono: string
  plan: string
  plan_nombre: string
  monto_mensual: number
  estado: string
  pago: 'pago_confirmado' | 'prueba_o_activa' | 'pendiente' | 'sin_pago'
  activo: boolean
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  ultimo_ingreso: string | null
  whatsapp_enviado: boolean
  ultimo_pago_at: string | null
  ultimo_pago_monto_centavos: number | null
  ultimo_pago_moneda: string | null
  ultimo_pago_referencia: string | null
  ultimo_pago_transaccion_id: string | null
  origen_estado: string | null
}

type ResumenCrm = {
  total: number
  activos: number
  pagos_confirmados: number
  pruebas_o_activas: number
  pendientes: number
  mrr_estimado: number
  mrr_confirmado: number
}

type RespuestaCrm = {
  actualizado_en: string
  resumen: ResumenCrm
  registros: RegistroCrm[]
}

const resumenVacio: ResumenCrm = {
  total: 0,
  activos: 0,
  pagos_confirmados: 0,
  pruebas_o_activas: 0,
  pendientes: 0,
  mrr_estimado: 0,
  mrr_confirmado: 0,
}

function formatoDinero(valor: number) {
  return valor.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function formatoFecha(valor: string | null) {
  if (!valor) return 'Pendiente'

  return new Date(valor).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function textoPago(pago: RegistroCrm['pago']) {
  if (pago === 'pago_confirmado') return 'Pago confirmado'
  if (pago === 'prueba_o_activa') return 'Prueba/activa'
  if (pago === 'pendiente') return 'Pendiente'
  return 'Sin pago'
}

function colorPago(pago: RegistroCrm['pago']) {
  if (pago === 'pago_confirmado') return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
  if (pago === 'prueba_o_activa') return 'border-sky-500/50 bg-sky-500/10 text-sky-200'
  if (pago === 'pendiente') return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200'
  return 'border-zinc-700 bg-zinc-900 text-zinc-300'
}

function limpiarCsv(valor: unknown) {
  return `"${String(valor ?? '').replaceAll('"', '""')}"`
}

export default function AdminCrmPage() {
  const [clave, setClave] = useState('')
  const [claveActiva, setClaveActiva] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('todos')
  const [plan, setPlan] = useState('todos')
  const [registros, setRegistros] = useState<RegistroCrm[]>([])
  const [resumen, setResumen] = useState<ResumenCrm>(resumenVacio)
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  const registrosOrdenados = useMemo(
    () =>
      [...registros].sort((a, b) => {
        const fechaA = new Date(a.ultimo_pago_at ?? a.fecha_inicio ?? 0).getTime()
        const fechaB = new Date(b.ultimo_pago_at ?? b.fecha_inicio ?? 0).getTime()

        return fechaB - fechaA
      }),
    [registros]
  )

  async function cargarCrm(secret = claveActiva) {
    if (!secret) return

    setCargando(true)
    const params = new URLSearchParams()

    if (busqueda) params.set('q', busqueda)
    if (estado !== 'todos') params.set('estado', estado)
    if (plan !== 'todos') params.set('plan', plan)

    const response = await fetch(`/api/oboro.booking.admin/crm?${params.toString()}`, {
      headers: {
        'x-crm-admin-secret': secret,
      },
      cache: 'no-store',
    })
    const data = (await response.json()) as Partial<RespuestaCrm> & {
      error?: string
    }

    if (!response.ok) {
      setMensaje(data.error ?? 'No se pudo cargar el CRM.')
      setCargando(false)
      return
    }

    setRegistros(data.registros ?? [])
    setResumen(data.resumen ?? resumenVacio)
    setActualizadoEn(data.actualizado_en ?? new Date().toISOString())
    setMensaje('')
    setCargando(false)
  }

  function entrar(e: React.FormEvent) {
    e.preventDefault()
    const secret = clave.trim()

    if (!secret) {
      setMensaje('Ingresa la clave admin.')
      return
    }

    setClaveActiva(secret)
    window.localStorage.setItem('oboro_crm_admin_secret', secret)
    cargarCrm(secret)
  }

  function cerrar() {
    window.localStorage.removeItem('oboro_crm_admin_secret')
    setClave('')
    setClaveActiva('')
    setRegistros([])
    setResumen(resumenVacio)
  }

  function exportarCsv() {
    const encabezados = [
      'negocio',
      'email',
      'telefono',
      'plan',
      'estado',
      'pago',
      'fecha_inicio',
      'vence',
      'ultimo_pago',
      'monto_pago',
      'referencia',
      'transaccion',
    ]
    const filas = registrosOrdenados.map((registro) => [
      registro.nombre_negocio,
      registro.email,
      registro.telefono,
      registro.plan_nombre,
      registro.estado,
      textoPago(registro.pago),
      registro.fecha_inicio,
      registro.fecha_vencimiento,
      registro.ultimo_pago_at,
      registro.ultimo_pago_monto_centavos
        ? registro.ultimo_pago_monto_centavos / 100
        : '',
      registro.ultimo_pago_referencia,
      registro.ultimo_pago_transaccion_id,
    ])
    const csv = [encabezados, ...filas]
      .map((fila) => fila.map(limpiarCsv).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `oboro-crm-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const guardada = window.localStorage.getItem('oboro_crm_admin_secret')

    if (guardada) {
      setClave(guardada)
      setClaveActiva(guardada)
      cargarCrm(guardada)
    }
  }, [])

  useEffect(() => {
    if (!claveActiva) return

    const timeout = window.setTimeout(() => cargarCrm(), 250)
    const intervalo = window.setInterval(() => cargarCrm(), 5000)

    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(intervalo)
    }
  }, [claveActiva, busqueda, estado, plan])

  if (!claveActiva) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-orange-500/30 bg-zinc-950 p-8 shadow-2xl shadow-orange-950/20">
          <p className="text-xs font-black uppercase tracking-[5px] text-orange-500">
            Oboro Lab
          </p>
          <h1 className="mt-4 text-4xl font-black">CRM de inscritos</h1>
          <p className="mt-3 text-zinc-400">
            Controla registros, planes, pagos, pruebas y vencimientos de Oboro Booking.
          </p>

          <form onSubmit={entrar} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-bold uppercase tracking-[3px] text-zinc-500">
                Clave admin
              </span>
              <input
                type="password"
                value={clave}
                onChange={(event) => setClave(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none focus:border-orange-500"
                placeholder="Clave privada de Oboro Lab"
              />
            </label>
            {mensaje && <p className="text-sm text-orange-300">{mensaje}</p>}
            <button className="w-full rounded-xl bg-orange-600 px-5 py-3 font-black uppercase tracking-[3px] text-white shadow-lg shadow-orange-950/40 hover:bg-orange-500">
              Entrar al CRM
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[5px] text-orange-500">
              CRM en vivo
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Inscritos y pagos
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Se actualiza cada 5 segundos para reflejar registros nuevos y pagos aprobados.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => cargarCrm()}
              className="rounded-xl border border-orange-500/40 px-4 py-3 text-sm font-bold text-orange-200 hover:bg-orange-600/10"
            >
              {cargando ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button
              onClick={exportarCsv}
              className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-900"
            >
              Exportar CSV
            </button>
            <button
              onClick={cerrar}
              className="rounded-xl border border-red-500/40 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-600/10"
            >
              Salir
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mt-6 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-orange-100">
            {mensaje}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Inscritos" value={resumen.total} />
          <MetricCard label="Activos" value={resumen.activos} />
          <MetricCard label="Pagaron" value={resumen.pagos_confirmados} />
          <MetricCard label="Prueba/activa" value={resumen.pruebas_o_activas} />
          <MetricCard label="Pendientes" value={resumen.pendientes} />
          <MetricCard label="MRR confirmado" value={formatoDinero(resumen.mrr_confirmado)} />
        </div>

        <div className="mt-8 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[1fr_180px_180px]">
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none focus:border-orange-500"
            placeholder="Buscar por negocio, email, telefono o estado..."
          />
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none focus:border-orange-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="pago_confirmado">Pago confirmado</option>
            <option value="prueba_o_activa">Prueba/activa</option>
            <option value="pendiente">Pendiente</option>
            <option value="sin_pago">Sin pago</option>
            <option value="activa">Activa</option>
          </select>
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none focus:border-orange-500"
          >
            <option value="todos">Todos los planes</option>
            <option value="basico">Basico</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-zinc-500">
          Ultima lectura: {formatoFecha(actualizadoEn)}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-[2px] text-zinc-500">
                <tr>
                  <th className="px-4 py-4">Negocio</th>
                  <th className="px-4 py-4">Contacto</th>
                  <th className="px-4 py-4">Plan</th>
                  <th className="px-4 py-4">Estado</th>
                  <th className="px-4 py-4">Pago</th>
                  <th className="px-4 py-4">Inicio</th>
                  <th className="px-4 py-4">Vence</th>
                  <th className="px-4 py-4">Ultimo pago</th>
                  <th className="px-4 py-4">Wompi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {registrosOrdenados.map((registro) => (
                  <tr key={registro.id} className="hover:bg-orange-500/5">
                    <td className="px-4 py-4 align-top">
                      <div className="font-black text-white">{registro.nombre_negocio}</div>
                      <div className="mt-1 max-w-[220px] truncate text-xs text-zinc-500">
                        {registro.usuario_id ?? 'Sin usuario'}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-zinc-200">{registro.email ?? 'Sin email'}</div>
                      <div className="mt-1 text-zinc-500">{registro.telefono}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-bold text-orange-300">{registro.plan_nombre}</div>
                      <div className="mt-1 text-zinc-500">{formatoDinero(registro.monto_mensual)}/mes</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="rounded-full border border-zinc-700 bg-black px-3 py-1 text-xs font-bold uppercase text-zinc-200">
                        {registro.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${colorPago(registro.pago)}`}>
                        {textoPago(registro.pago)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-zinc-300">
                      {formatoFecha(registro.fecha_inicio)}
                    </td>
                    <td className="px-4 py-4 align-top text-zinc-300">
                      {formatoFecha(registro.fecha_vencimiento)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-zinc-300">{formatoFecha(registro.ultimo_pago_at)}</div>
                      <div className="mt-1 text-zinc-500">
                        {registro.ultimo_pago_monto_centavos
                          ? formatoDinero(registro.ultimo_pago_monto_centavos / 100)
                          : 'Sin monto'}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="max-w-[180px] truncate text-zinc-300">
                        {registro.ultimo_pago_transaccion_id ?? 'Sin transaccion'}
                      </div>
                      <div className="mt-1 max-w-[180px] truncate text-xs text-zinc-500">
                        {registro.ultimo_pago_referencia ?? 'Sin referencia'}
                      </div>
                    </td>
                  </tr>
                ))}

                {registrosOrdenados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                      No hay registros con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs font-black uppercase tracking-[3px] text-zinc-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-black text-orange-400">{value}</div>
    </div>
  )
}
