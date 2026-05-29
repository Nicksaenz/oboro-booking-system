'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Cita = {
  ID: string
  Fecha: string
  Hora: string
  Estado: string
  Clientes?: {
    Nombre?: string
  }
  SERVICIOS?: {
    'Nombre del servicio'?: string
    'Precio del servicio'?: number
  }
  Empleados?: {
    ID?: string
    Nombre?: string
  }
}

type Gasto = {
  id: string
  fecha: string
  categoria: string
  descripcion: string
  monto: number
}

function formatoDinero(valor: number) {
  return valor.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function mesActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

function porcentaje(valor: number) {
  if (!Number.isFinite(valor)) return '0%'

  return `${Math.round(valor)}%`
}

function estadoFinancieroColor(valor: number) {
  if (valor > 0) return 'text-green-300'
  if (valor < 0) return 'text-red-300'

  return 'text-zinc-300'
}

export default function FinanzasPage() {
  const router = useRouter()
  const [mes, setMes] = useState(mesActual())
  const [citas, setCitas] = useState<Cita[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [mensaje, setMensaje] = useState('')
  const [gastosActivos, setGastosActivos] = useState(true)
  const [accesoFinanzas, setAccesoFinanzas] = useState(true)
  const [planFinanzas, setPlanFinanzas] = useState<'pro' | 'business'>('pro')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [comision, setComision] = useState(50)
  const [adminPin, setAdminPin] = useState('')
  const [adminActivo, setAdminActivo] = useState(false)
  const [gastoForm, setGastoForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: 'General',
    descripcion: '',
    monto: '',
  })

  const ingresos = useMemo(
    () =>
      citas.reduce((total, cita) => {
        return total + Number(cita.SERVICIOS?.['Precio del servicio'] ?? 0)
      }, 0),
    [citas]
  )
  const esBusiness = planFinanzas === 'business'
  const totalGastos = useMemo(
    () => gastos.reduce((total, gasto) => total + Number(gasto.monto ?? 0), 0),
    [gastos]
  )
  const utilidad = ingresos - totalGastos
  const citasCompletadas = useMemo(
    () =>
      citas.filter((cita) => String(cita.Estado ?? '').toLowerCase() === 'completada')
        .length,
    [citas]
  )
  const ticketPromedio = citas.length ? ingresos / citas.length : 0
  const margenOperativo = ingresos ? (utilidad / ingresos) * 100 : 0
  const puntoEquilibrio = Math.max(totalGastos - ingresos, 0)
  const liquidaciones = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nombre: string
        citas: number
        completadas: number
        ingresos: number
      }
    >()

    citas.forEach((cita) => {
      const empleadoId = cita.Empleados?.ID ?? cita.Empleados?.Nombre ?? 'sin-empleado'
      const estado = String(cita.Estado ?? '').toLowerCase()
      const actual = mapa.get(empleadoId) ?? {
        nombre: cita.Empleados?.Nombre ?? 'Sin empleado',
        citas: 0,
        completadas: 0,
        ingresos: 0,
      }

      actual.citas += 1
      if (estado === 'completada') actual.completadas += 1
      actual.ingresos += Number(cita.SERVICIOS?.['Precio del servicio'] ?? 0)
      mapa.set(empleadoId, actual)
    })

    return Array.from(mapa.values())
      .map((item) => {
        const liquidar = Math.round((item.ingresos * comision) / 100)

        return {
          ...item,
          liquidar,
          negocio: item.ingresos - liquidar,
          ticketPromedio: item.citas ? item.ingresos / item.citas : 0,
        }
      })
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [citas, comision])
  const totalLiquidar = liquidaciones.reduce(
    (total, item) => total + item.liquidar,
    0
  )
  const utilidadDespuesLiquidacion = utilidad - totalLiquidar
  const gastosPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>()

    for (const gasto of gastos) {
      const categoria = gasto.categoria || 'General'
      mapa.set(categoria, (mapa.get(categoria) ?? 0) + Number(gasto.monto ?? 0))
    }

    return Array.from(mapa.entries())
      .map(([categoria, monto]) => ({
        categoria,
        monto,
        peso: totalGastos ? (monto / totalGastos) * 100 : 0,
      }))
      .sort((a, b) => b.monto - a.monto)
  }, [gastos, totalGastos])
  const topColaborador = liquidaciones[0]
  const resumenEjecutivo = [
    ingresos > 0
      ? `Ingresaste ${formatoDinero(ingresos)} en ${citas.length} citas.`
      : 'Aun no hay ingresos registrados para este mes.',
    totalGastos > 0
      ? `Tus gastos suman ${formatoDinero(totalGastos)}.`
      : 'No hay gastos cargados en el mes.',
    esBusiness
      ? totalLiquidar > 0
        ? `Liquidacion estimada para el equipo: ${formatoDinero(totalLiquidar)}.`
        : 'No hay liquidaciones pendientes calculadas.'
      : `Utilidad basica estimada: ${formatoDinero(utilidad)}.`,
    esBusiness
      ? utilidadDespuesLiquidacion >= 0
        ? `Resultado despues de gastos y liquidaciones: ${formatoDinero(utilidadDespuesLiquidacion)}.`
        : `El mes queda en negativo por ${formatoDinero(Math.abs(utilidadDespuesLiquidacion))}.`
      : 'Sube a Business para activar liquidacion avanzada de colaboradores.',
  ]

  async function cargarFinanzas() {
    setCargando(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      router.push('/login')
      return
    }

    const response = await fetch(`/api/finanzas?mes=${mes}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await response.json()

    if (!response.ok) {
      if (response.status === 403) {
        setAccesoFinanzas(false)
      }

      setMensaje(data.error ?? 'No se pudo cargar finanzas.')
      setCargando(false)
      return
    }

    setAccesoFinanzas(true)
    setPlanFinanzas(data.planFinanzas === 'business' ? 'business' : 'pro')
    setCitas(data.citas ?? [])
    setGastos(data.gastos ?? [])
    setGastosActivos(!data.gastosPendientes)
    setMensaje(
      data.gastosPendientes
        ? 'El registro de gastos esta casi listo. Oboro Lab debe activar esta funcion una sola vez en la base de datos.'
        : ''
    )
    setCargando(false)
  }

  async function guardarGasto(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      router.push('/login')
      return
    }

    const response = await fetch('/api/finanzas', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(adminPin ? { 'x-finanzas-admin-pin': adminPin } : {}),
      },
      body: JSON.stringify(gastoForm),
    })
    const data = await response.json()

    if (!response.ok) {
      setMensaje(
        data.error?.includes('administrador')
          ? 'Solo la cuenta administradora puede editar finanzas. Ingresa la clave admin.'
          : data.error?.includes('gastos')
          ? 'El registro de gastos aun no esta activo. Oboro Lab debe activar esta funcion una sola vez.'
          : data.error ?? 'No se pudo guardar el gasto.'
      )
      setGuardando(false)
      return
    }

    setMensaje('Gasto guardado correctamente.')
    setGastoForm({
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'General',
      descripcion: '',
      monto: '',
    })
    await cargarFinanzas()
    setGuardando(false)
  }

  async function eliminarGasto(id: string) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      router.push('/login')
      return
    }

    const response = await fetch(`/api/finanzas?id=${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(adminPin ? { 'x-finanzas-admin-pin': adminPin } : {}),
      },
    })
    const data = await response.json()

    if (!response.ok) {
      setMensaje(
        data.error?.includes('administrador')
          ? 'Solo la cuenta administradora puede editar finanzas. Ingresa la clave admin.'
          : data.error ?? 'No se pudo eliminar el gasto.'
      )
      return
    }

    setMensaje('Gasto eliminado.')
    cargarFinanzas()
  }

  function mensajeLiquidacion(item: { nombre: string; citas: number; completadas: number; ingresos: number; liquidar: number; negocio: number }) {
    return encodeURIComponent(
      `Hola ${item.nombre}, este es tu resumen de liquidacion:\n\nCitas del mes: ${item.citas}\nCitas completadas: ${item.completadas}\nIngresos generados: ${formatoDinero(item.ingresos)}\nComision (${comision}%): ${formatoDinero(item.liquidar)}\nBase del negocio: ${formatoDinero(item.negocio)}\n\nGracias por tu trabajo.`
    )
  }

  useEffect(() => {
    const pinGuardado = window.sessionStorage.getItem('oboro_finanzas_admin_pin')

    if (pinGuardado) {
      setAdminPin(pinGuardado)
      setAdminActivo(true)
    }

    cargarFinanzas()
  }, [mes])

  function desbloquearAdmin(e: React.FormEvent) {
    e.preventDefault()

    if (!adminPin.trim()) {
      setMensaje('Ingresa la clave admin para editar finanzas.')
      return
    }

    window.sessionStorage.setItem('oboro_finanzas_admin_pin', adminPin.trim())
    setAdminPin(adminPin.trim())
    setAdminActivo(true)
    setMensaje('Modo administrador financiero activo en este navegador.')
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              {esBusiness ? 'Finanzas Business' : 'Finanzas Pro'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              {esBusiness
                ? 'Control ejecutivo de ingresos, gastos, utilidad y liquidacion de colaboradores para tomar decisiones con datos.'
                : 'Control basico de ingresos, gastos y utilidad para que el negocio mida el mes sin complicarse.'}
            </p>
          </div>

          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
          />
        </div>

        {mensaje && (
          <div className="mt-6 rounded-2xl border border-orange-600/50 bg-zinc-950 px-5 py-4 text-sm text-orange-200">
            {mensaje}
          </div>
        )}

        {!accesoFinanzas ? (
          <div className="mt-8 rounded-2xl border border-orange-600/40 bg-zinc-950 p-6 shadow-2xl shadow-orange-950/20">
            <h2 className="text-3xl font-black text-orange-500">
              Disponible desde Pro
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              El plan Pro incluye finanzas basicas. Business activa la
              liquidacion avanzada de colaboradores y analisis mas completo.
            </p>
            <button
              type="button"
              onClick={() => router.push('/suscripcion')}
              className="mt-5 min-h-12 rounded-xl bg-orange-600 px-5 py-3 font-bold transition hover:bg-orange-700"
            >
              Ver planes
            </button>
          </div>
        ) : (
          <>

        <form
          onSubmit={desbloquearAdmin}
          className="mt-6 grid gap-3 rounded-2xl border border-green-600/40 bg-green-950/10 p-4 sm:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="font-bold text-green-300">
              Acceso administrador financiero
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Solo quien tenga la clave admin puede crear o eliminar gastos.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[180px_auto]">
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Clave admin"
              className="min-h-12 rounded-xl border border-green-600/50 bg-black p-4 outline-none"
            />
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-green-600 px-5 py-3 font-bold transition hover:bg-green-700"
            >
              {adminActivo ? 'Activo' : 'Desbloquear'}
            </button>
          </div>
        </form>

        <div className={`mt-8 grid gap-4 md:grid-cols-2 ${esBusiness ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
          <div className="rounded-2xl border border-green-600/40 bg-green-950/10 p-5 shadow-lg shadow-green-950/20">
            <p className="text-zinc-400">Ingresos del mes</p>
            <h2 className="mt-2 text-3xl font-black text-green-300">
              {formatoDinero(ingresos)}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">{citas.length} citas facturadas</p>
          </div>

          <div className="rounded-2xl border border-red-600/40 bg-red-950/10 p-5 shadow-lg shadow-red-950/20">
            <p className="text-zinc-400">Gastos del mes</p>
            <h2 className="mt-2 text-3xl font-black text-red-300">
              {formatoDinero(totalGastos)}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">{gastos.length} gastos registrados</p>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <p className="text-zinc-400">Utilidad estimada</p>
            <h2 className="mt-2 text-3xl font-black text-orange-500">
              {formatoDinero(utilidad)}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">Ingresos menos gastos</p>
          </div>

          {esBusiness && (
            <div className="rounded-2xl border border-blue-600/40 bg-blue-950/10 p-5 shadow-lg shadow-blue-950/20">
              <p className="text-zinc-400">Despues de liquidar</p>
              <h2 className={`mt-2 text-3xl font-black ${estadoFinancieroColor(utilidadDespuesLiquidacion)}`}>
                {formatoDinero(utilidadDespuesLiquidacion)}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Utilidad menos comisiones
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[3px] text-orange-500">
                  Resumen ejecutivo
                </p>
                <h2 className="mt-2 text-2xl font-black">Lectura del mes</h2>
              </div>
              <span className="rounded-xl border border-orange-500/30 bg-black px-4 py-3 text-sm font-black text-orange-200">
                Margen {porcentaje(margenOperativo)}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {resumenEjecutivo.map((item) => (
                <p
                  key={item}
                  className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm leading-6 text-zinc-300"
                >
                  {item}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs font-bold uppercase tracking-[3px] text-green-300">
              Indicadores
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs text-zinc-500">Ticket promedio</p>
                <p className="mt-1 text-xl font-black text-white">
                  {formatoDinero(ticketPromedio)}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs text-zinc-500">Completadas</p>
                <p className="mt-1 text-xl font-black text-blue-300">
                  {citasCompletadas}/{citas.length}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs text-zinc-500">
                  {esBusiness ? 'Por liquidar' : 'Plan actual'}
                </p>
                <p className="mt-1 text-xl font-black text-orange-300">
                  {esBusiness ? formatoDinero(totalLiquidar) : 'Pro'}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs text-zinc-500">Falta equilibrio</p>
                <p className="mt-1 text-xl font-black text-yellow-300">
                  {formatoDinero(puntoEquilibrio)}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={guardarGasto}
            className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20"
          >
            <h2 className="text-2xl font-bold">Registrar gasto</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Arriendo, insumos, publicidad, comisiones externas o cualquier
              salida de dinero del negocio.
            </p>

            <div className="mt-5 grid gap-3">
              <input
                type="date"
                value={gastoForm.fecha}
                onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })}
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                required
              />

              <select
                value={gastoForm.categoria}
                onChange={(e) => setGastoForm({ ...gastoForm, categoria: e.target.value })}
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
              >
                <option>General</option>
                <option>Arriendo</option>
                <option>Insumos</option>
                <option>Nomina</option>
                <option>Publicidad</option>
                <option>Servicios</option>
                <option>Otro</option>
              </select>

              <input
                value={gastoForm.descripcion}
                onChange={(e) => setGastoForm({ ...gastoForm, descripcion: e.target.value })}
                placeholder="Descripcion"
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                required
              />

              <input
                type="number"
                value={gastoForm.monto}
                onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })}
                placeholder="Valor"
                className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none"
                required
              />

              <button
                type="submit"
                disabled={guardando || !gastosActivos || !adminActivo}
                className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {!gastosActivos
                  ? 'Activacion pendiente'
                  : !adminActivo
                    ? 'Bloqueado por admin'
                  : guardando
                    ? 'Guardando...'
                    : 'Guardar gasto'}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
            <h2 className="text-2xl font-bold">Gastos registrados</h2>
            {gastosPorCategoria.length > 0 && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {gastosPorCategoria.map((item) => (
                  <div
                    key={item.categoria}
                    className="rounded-xl border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-zinc-200">{item.categoria}</p>
                      <p className="text-sm font-bold text-red-300">
                        {formatoDinero(item.monto)}
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${Math.min(100, item.peso)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {porcentaje(item.peso)} de los gastos
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 space-y-3">
              {cargando && <p className="text-zinc-400">Cargando finanzas...</p>}

              {!cargando && gastos.length === 0 && (
                <p className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
                  Aun no hay gastos para este mes.
                </p>
              )}

              {gastos.map((gasto) => (
                <div
                  key={gasto.id}
                  className="grid gap-3 rounded-xl border border-zinc-800 bg-black p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-bold text-orange-400">{gasto.descripcion}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {gasto.fecha} · {gasto.categoria}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-red-300">
                      {formatoDinero(Number(gasto.monto))}
                    </p>
                    <button
                      type="button"
                      onClick={() => eliminarGasto(gasto.id)}
                      disabled={!adminActivo}
                      className="rounded-xl border border-red-600/60 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-600/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {esBusiness ? (
        <div className="mt-8 rounded-2xl border border-green-600/40 bg-zinc-950 p-5 shadow-2xl shadow-green-950/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Liquidacion de colaboradores</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Calcula cuanto debe recibir cada empleado segun las citas del
                mes y el porcentaje de comision.
              </p>
            </div>

            <label className="grid gap-2 text-sm font-bold text-green-300">
              Comision %
              <input
                type="number"
                min="0"
                max="100"
                value={comision}
                onChange={(e) => setComision(Number(e.target.value))}
                className="min-h-12 w-32 rounded-xl border border-green-600/50 bg-black p-4 text-white outline-none"
              />
            </label>
          </div>

          {topColaborador && (
            <div className="mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-950/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[3px] text-yellow-300">
                Mejor productor
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {topColaborador.nombre}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Genero {formatoDinero(topColaborador.ingresos)} en{' '}
                {topColaborador.citas} citas.
              </p>
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800">
            <div className="hidden grid-cols-[1.2fr_0.6fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-zinc-800 bg-black px-4 py-3 text-xs font-bold uppercase tracking-[2px] text-zinc-500 md:grid">
              <p>Colaborador</p>
              <p>Citas</p>
              <p>Ingresos</p>
              <p>Liquidar</p>
              <p>Negocio</p>
            </div>
            {liquidaciones.length === 0 ? (
              <p className="bg-black p-4 text-sm text-zinc-400">
                No hay citas para liquidar en este mes.
              </p>
            ) : (
              liquidaciones.map((item) => (
                <div
                  key={item.nombre}
                  className="grid gap-3 border-b border-zinc-900 bg-black p-4 last:border-b-0 md:grid-cols-[1.2fr_0.6fr_0.8fr_0.8fr_0.8fr] md:items-center"
                >
                  <div>
                    <h3 className="text-xl font-bold text-green-300">{item.nombre}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Ticket promedio {formatoDinero(item.ticketPromedio)}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-300">
                    {item.citas} citas · {item.completadas} hechas
                  </p>
                  <p className="font-bold text-zinc-100">
                    {formatoDinero(item.ingresos)}
                  </p>
                  <p className="text-xl font-black text-orange-500">
                    {formatoDinero(item.liquidar)}
                  </p>
                  <div>
                    <p className="font-bold text-blue-300">
                      {formatoDinero(item.negocio)}
                    </p>
                    <a
                      href={`https://wa.me/?text=${mensajeLiquidacion(item)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex min-h-10 items-center rounded-xl border border-green-600/60 px-3 py-2 text-xs font-bold text-green-200 transition hover:bg-green-600/10"
                    >
                      Enviar resumen
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">Total equipo</p>
              <p className="mt-1 text-2xl font-black text-orange-400">
                {formatoDinero(totalLiquidar)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">Base negocio</p>
              <p className="mt-1 text-2xl font-black text-blue-300">
                {formatoDinero(ingresos - totalLiquidar)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">Resultado final</p>
              <p className={`mt-1 text-2xl font-black ${estadoFinancieroColor(utilidadDespuesLiquidacion)}`}>
                {formatoDinero(utilidadDespuesLiquidacion)}
              </p>
            </div>
          </div>
        </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-blue-600/40 bg-blue-950/10 p-5 shadow-2xl shadow-blue-950/20">
            <p className="text-xs font-bold uppercase tracking-[3px] text-blue-300">
              Finanzas Pro
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Modulo basico activado
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Pro permite ver ingresos, registrar gastos, medir utilidad,
              revisar ticket promedio y entender el margen mensual. La
              liquidacion avanzada por colaborador queda reservada para
              Business.
            </p>
            <button
              type="button"
              onClick={() => router.push('/suscripcion')}
              className="mt-5 min-h-12 rounded-xl border border-blue-400/60 px-5 py-3 text-sm font-bold text-blue-100 transition hover:bg-blue-500/10"
            >
              Ver Business
            </button>
          </div>
        )}
          </>
        )}
      </section>
    </main>
  )
}
