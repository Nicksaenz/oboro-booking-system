"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  

  const router = useRouter()
  const [clientes, setClientes] = useState(0)
  const [empleados, setEmpleados] = useState(0)
  const [servicios, setServicios] = useState(0)
  const [citas, setCitas] = useState(0)
  const [citasHoy, setCitasHoy] = useState(0)
  const [citasPendientes, setCitasPendientes] = useState(0)
  const [ingresosMes, setIngresosMes] = useState(0)
  const [ultimasCitas, setUltimasCitas] = useState<any[]>([])

  async function cargarDatos() {

    const { count: clientesCount } = await supabase
      .from("Clientes")
      .select("*", { count: "exact", head: true })

    const { count: empleadosCount } = await supabase
      .from("Empleados")
      .select("*", { count: "exact", head: true })

    const { count: serviciosCount } = await supabase
      .from("SERVICIOS")
      .select("*", { count: "exact", head: true })

    const { count: citasCount } = await supabase
      .from("Citas")
      .select("*", { count: "exact", head: true })

    const hoy = new Date().toISOString().split("T")[0]

const { count: citasHoyCount } = await supabase
.from("Citas")
.select("*", { count: "exact", head: true })
.eq("Fecha", hoy)

const { count: citasPendientesCount } = await supabase
.from("Citas")
.select("*", { count: "exact", head: true })
.eq("Estado", "pendiente")

    const { data: citasData } = await supabase
  .from("Citas")
  .select(`
    *,
    Clientes ( Nombre ),
   SERVICIOS (
  "Nombre del servicio",
  "Precio del servicio"
),
    Empleados ( Nombre )
  `)
  .order("Fecha", { ascending: false })
  .limit(5)

  const totalIngresos =
  citasData?.reduce((acc, cita) => {
    return acc + (cita.SERVICIOS?.["Precio del servicio"] || 0)
  }, 0) || 0
setUltimasCitas(citasData || [])

    setClientes(clientesCount || 0)
    setEmpleados(empleadosCount || 0)
    setServicios(serviciosCount || 0)
    setCitas(citasCount || 0)
    setCitasHoy(citasHoyCount || 0)
    setCitasPendientes(citasPendientesCount || 0)
    setIngresosMes(totalIngresos)
  }

  useEffect(() => {
    cargarDatos()
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

      <section className="mx-auto w-full max-w-7xl">

        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
          Dashboard
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Visualiza el estado general de tu negocio.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <p className="text-zinc-400">Clientes</p>
            <h2 className="text-4xl font-bold text-orange-500 mt-2">
              {clientes}
            </h2>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <p className="text-zinc-400">Empleados</p>
            <h2 className="text-4xl font-bold text-orange-500 mt-2">
              {empleados}
            </h2>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <p className="text-zinc-400">Servicios</p>
            <h2 className="text-4xl font-bold text-orange-500 mt-2">
              {servicios}
            </h2>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
            <p className="text-zinc-400">Citas</p>
            <h2 className="text-4xl font-bold text-orange-500 mt-2">
              {citas}
            </h2>
          </div>
          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
  <p className="text-zinc-300">Citas hoy</p>
  <h2 className="text-4xl font-bold text-orange-500 mt-4">
    {citasHoy}
  </h2>
</div>

<div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20">
  <p className="text-zinc-300">Pendientes</p>
  <h2 className="text-4xl font-bold text-orange-500 mt-4">
    {citasPendientes}
  </h2>
</div>

<div className="rounded-2xl border border-green-600/50 bg-zinc-950 p-5 shadow-lg shadow-green-950/20">
  <p className="text-zinc-400">Ingresos estimados</p>

  <h2 className="text-4xl font-bold text-green-500 mt-2">
    ${ingresosMes.toLocaleString()}
  </h2>
</div>
        </div>

          <div className="mt-14">

  <h2 className="mb-5 text-2xl font-bold text-white">
    Últimas citas
  </h2>

  <div className="grid gap-5">

    {ultimasCitas.map((cita) => (

      <div
        key={cita.ID}
        className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20"
      >

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h3 className="text-xl font-bold text-orange-500">
              {cita.Clientes?.Nombre}
            </h3>

            <p className="text-zinc-300 mt-2">
              Servicio: {cita.SERVICIOS?.["Nombre del servicio"]}
            </p>

            <p className="text-zinc-400">
              Empleado: {cita.Empleados?.Nombre}
            </p>
          </div>

          <div className="text-zinc-400">
            <p>Fecha: {cita.Fecha}</p>
            <p>Hora: {cita.Hora}</p>
          </div>

        </div>

      </div>

    ))}

  </div>

</div>

      </section>

    </main>
  )
}
