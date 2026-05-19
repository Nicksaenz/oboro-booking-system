'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function verificarSesion() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      setCargando(false)
    }

    verificarSesion()
  }, [])

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-orange-500 font-bold tracking-[4px]">
          Cargando Oboro Booking...
        </p>
      </main>
    )
  }

  return <>{children}</>
}