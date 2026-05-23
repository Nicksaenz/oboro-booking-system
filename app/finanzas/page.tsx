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

export default function FinanzasPage() {
  const router = useRouter()
  const [mes, setMes] = useState(mesActual())
  const [citas, setCitas] = useState<Cita[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [comision, setComision] = useState(50)
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
  const totalGastos = useMemo(
    () => gastos.reduce((total, gasto) => total + Number(gasto.monto ?? 0), 0),
    [gastos]
  )
  const utilidad = ingresos - totalGastos
  const liquidaciones = useMemo(() => {
    const mapa = new Map<string, { nombre: string; citas: number; ingresos: number }>()

    citas.forEach((cita) => {
      const empleadoId = cita.Empleados?.ID ?? cita.Empleados?.Nombre ?? 'sin-empleado'
      const actual = mapa.get(empleadoId) ?? {
        nombre: cita.Empleados?.Nombre ?? 'Sin empleado',
        citas: 0,
        ingresos: 0,
      }

      actual.citas += 1
      actual.ingresos += Number(cita.SERVICIOS?.['Precio del servicio'] ?? 0)
      mapa.set(empleadoId, actual)
    })

    return Array.from(mapa.values()).map((item) => ({
      ...item,
      liquidar: Math.round((item.ingresos * comision) / 100),
    }))
  }, [citas, comision])

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
      setMensaje(data.error ?? 'No se pudo cargar finanzas.')
      setCargando(false)
      return
    }

    setCitas(data.citas ?? [])
    setGastos(data.gastos ?? [])
    setMensaje(data.gastosError ?? '')
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
      },
      body: JSON.stringify(gastoForm),
    })
    const data = await response.json()

    if (!response.ok) {
      setMensaje(data.error ?? 'No se pudo guardar el gasto.')
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
      },
    })
    const data = await response.json()

    if (!response.ok) {
      setMensaje(data.error ?? 'No se pudo eliminar el gasto.')
      return
    }

    setMensaje('Gasto eliminado.')
    cargarFinanzas()
  }

  function mensajeLiquidacion(item: { nombre: string; citas: number; ingresos: number; liquidar: number }) {
    return encodeURIComponent(
      `Hola ${item.nombre}, este es tu resumen de liquidacion:\n\nCitas atendidas: ${item.citas}\nIngresos generados: ${formatoDinero(item.ingresos)}\nComision (${comision}%): ${formatoDinero(item.liquidar)}\n\nGracias por tu trabajo.`
    )
  }

  useEffect(() => {
    cargarFinanzas()
  }, [mes])

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              Finanzas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Registra ingresos, controla gastos y liquida colaboradores en
              segundos.
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

        <div className="mt-8 grid gap-4 md:grid-cols-3">
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
                disabled={guardando}
                className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : 'Guardar gasto'}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
            <h2 className="text-2xl font-bold">Gastos registrados</h2>
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

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {liquidaciones.length === 0 && (
              <p className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
                No hay citas para liquidar en este mes.
              </p>
            )}

            {liquidaciones.map((item) => (
              <div
                key={item.nombre}
                className="rounded-xl border border-zinc-800 bg-black p-4"
              >
                <h3 className="text-xl font-bold text-green-300">{item.nombre}</h3>
                <p className="mt-3 text-sm text-zinc-400">Citas: {item.citas}</p>
                <p className="text-sm text-zinc-400">
                  Ingresos: {formatoDinero(item.ingresos)}
                </p>
                <p className="mt-3 text-2xl font-black text-orange-500">
                  {formatoDinero(item.liquidar)}
                </p>
                <a
                  href={`https://wa.me/?text=${mensajeLiquidacion(item)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-green-600/60 px-4 py-2 text-sm font-bold text-green-200 transition hover:bg-green-600/10"
                >
                  Enviar resumen
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
