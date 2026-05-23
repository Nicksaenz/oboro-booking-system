'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Navbar from './Navbar'
import { supabase } from '@/lib/supabase'

type EstadoAcceso = 'cargando' | 'permitido' | 'bloqueado'

const RUTAS_PUBLICAS = ['/login']
const RUTAS_SUSCRIPCION = ['/suscripcion']
const ESTADOS_VALIDOS = ['trial', 'activa', 'activo', 'pagada', 'paid']

function trialVigente(fechaVencimiento: string | null) {
  if (!fechaVencimiento) {
    return true
  }

  return new Date(fechaVencimiento).getTime() >= Date.now()
}

export default function ProtectedShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [estadoAcceso, setEstadoAcceso] = useState<EstadoAcceso>('cargando')
  const esRutaPublica = RUTAS_PUBLICAS.includes(pathname)
  const esRutaSuscripcion = RUTAS_SUSCRIPCION.includes(pathname)

  useEffect(() => {
    async function verificarAcceso() {
      if (esRutaPublica) {
        setEstadoAcceso('permitido')
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        router.replace('/login')
        return
      }

      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        router.replace('/login')
        return
      }

      const response = await fetch('/api/suscripcion', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const resultado = await response.json()
      const suscripcion = resultado.suscripcion

      if (!response.ok || !suscripcion) {
        if (!esRutaSuscripcion) {
          router.replace('/suscripcion')
          return
        }

        setEstadoAcceso('bloqueado')
        return
      }

      const estado = String(suscripcion.estado ?? '').toLowerCase()
      const accesoPermitido =
        ESTADOS_VALIDOS.includes(estado) &&
        trialVigente(suscripcion.fecha_vencimiento)

      if (!accesoPermitido && !esRutaSuscripcion) {
        router.replace('/suscripcion')
        return
      }

      setEstadoAcceso(accesoPermitido ? 'permitido' : 'bloqueado')
    }

    verificarAcceso()
  }, [esRutaPublica, esRutaSuscripcion, router])

  if (estadoAcceso === 'cargando') {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <p className="text-orange-500 font-bold tracking-[4px]">
          Cargando Oboro Booking...
        </p>
      </main>
    )
  }

  if (esRutaPublica) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
