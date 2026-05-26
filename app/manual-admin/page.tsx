'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { PlanOboro } from '@/lib/planes'

type ManualAdmin = {
  negocio: string
  telefono: string
  plan: PlanOboro
  fecha_vencimiento: string | null
  clave_finanzas: string
  app_url: string
}

const PASOS = [
  {
    titulo: '1. Configura la base del negocio',
    texto:
      'Crea servicios, empleados y clientes antes de llenar la agenda. Esto hace que las citas queden completas y faciles de consultar.',
  },
  {
    titulo: '2. Agenda y avisa por WhatsApp',
    texto:
      'Desde Citas puedes crear una reserva, cambiar su estado, avisar al cliente y avisar al negocio. El mensaje se abre listo para enviar.',
  },
  {
    titulo: '3. Comparte el QR publico',
    texto:
      'En Pro y Business, el QR permite que el cliente seleccione servicio, empleado, fecha y hora sin escribirte primero.',
  },
  {
    titulo: '4. Controla tu equipo',
    texto:
      'En Equipo agregas correos por rol. Operativo puede manejar agenda. Solo lectura puede consultar. El administrador conserva el control.',
  },
  {
    titulo: '5. Usa finanzas solo en Business',
    texto:
      'Finanzas registra gastos, calcula ingresos y ayuda a liquidar colaboradores. Esta parte queda protegida con clave admin.',
  },
]

export default function ManualAdminPage() {
  const router = useRouter()
  const [manual, setManual] = useState<ManualAdmin | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarManual() {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        router.replace('/login')
        return
      }

      const response = await fetch('/api/manual-admin', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const resultado = await response.json()

      if (!response.ok) {
        setMensaje(resultado.error ?? 'No se pudo abrir el manual.')
        setCargando(false)
        return
      }

      setManual(resultado)
      setCargando(false)
    }

    cargarManual()
  }, [router])

  if (cargando) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white">
        <p className="font-bold tracking-[4px] text-orange-500">CARGANDO MANUAL...</p>
      </main>
    )
  }

  if (!manual) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white">
        <section className="mx-auto max-w-3xl rounded-2xl border border-red-600/40 bg-zinc-950 p-6">
          <h1 className="text-3xl font-black">Acceso restringido</h1>
          <p className="mt-3 text-zinc-300">{mensaje}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          <div>
            <p className="text-sm font-bold tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              Manual del administrador
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
              Guia privada para operar, entregar y controlar la cuenta de{' '}
              <span className="font-bold text-white">{manual.negocio}</span>.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">Plan actual</p>
            <p className="mt-1 text-3xl font-black text-orange-500">
              {manual.plan.nombre}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              1 administrador, {manual.plan.limites.empleados} empleados y{' '}
              {manual.plan.limites.accesosEquipo} accesos adicionales.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-600/30 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">URL de acceso</p>
            <p className="mt-2 break-all text-xl font-black text-orange-500">
              {manual.app_url}/login
            </p>
          </div>
          <div className="rounded-2xl border border-orange-600/30 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">Clave admin finanzas</p>
            <p className="mt-2 break-all text-xl font-black text-green-300">
              {manual.clave_finanzas}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-600/30 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">WhatsApp del negocio</p>
            <p className="mt-2 break-all text-xl font-black text-orange-500">
              {manual.telefono || 'Pendiente'}
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Como usar la app</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {PASOS.map((paso) => (
              <div key={paso.titulo} className="rounded-2xl border border-zinc-800 bg-black p-5">
                <h3 className="text-xl font-black text-orange-500">{paso.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{paso.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-green-600/30 bg-green-950/10 p-5">
          <h2 className="text-2xl font-black text-green-300">Reglas para venderlo bien</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
            <li>1. El primer usuario que compra queda como administrador principal.</li>
            <li>2. Los empleados son los profesionales que atienden citas.</li>
            <li>3. Los accesos de equipo son usuarios que entran al panel con su correo.</li>
            <li>4. Business no es ilimitado: incluye 10 empleados y 6 accesos adicionales.</li>
            <li>5. La clave admin solo se comparte con quien controla finanzas.</li>
          </ul>
        </section>
      </section>
    </main>
  )
}
