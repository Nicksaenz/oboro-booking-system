'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

export default function Navbar() {
 const [menuAbierto, setMenuAbierto] = useState(false)
 const pathname = usePathname()
 if (pathname === '/login') {
  return null
}
 async function cerrarSesion() {
  await supabase.auth.signOut()
  window.location.href = '/login'
} 
  return (
    <nav className="w-full border-b border-orange-500/20 bg-black">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        
        <div>
          <h1 className="text-orange-500 font-black text-2xl">
            OBORO BOOKING
          </h1>

          <p className="text-gray-500 text-sm">
            Powered by Oboro Lab
          </p>
        </div>

        <div className="hidden md:flex gap-4">
          <Link
            href="/"
            className="text-white hover:text-orange-500 transition"
          >
            Dashboard
          </Link>

          <Link
            href="/clientes"
            className="text-white hover:text-orange-500 transition"
          >
            Clientes
          </Link>

          <Link
            href="/citas"
            className="text-white hover:text-orange-500 transition"
          >
            Citas
          </Link>

          <Link
            href="/empleados"
            className="text-white hover:text-orange-500 transition"
          >
            Empleados
          </Link>
          
          <Link
            href="/servicios"
            className="text-white hover:text-orange-500 transition"
>
  Servicios
</Link>

          <button
  onClick={cerrarSesion}
  className="text-white hover:text-red-500 transition"
>
  Salir
</button>
        </div>
          
        <button
  onClick={() => setMenuAbierto(!menuAbierto)}
  className="md:hidden rounded-xl border border-orange-600/40 px-3 py-2 text-sm font-bold text-white"
>
  Menu
</button>
      </div>
    {menuAbierto && (
  <div className="md:hidden mx-4 mb-4 rounded-2xl border border-orange-600/30 bg-zinc-950/95 p-4 shadow-2xl shadow-orange-950/30 backdrop-blur-xl flex flex-col gap-3">
    <Link
      href="/"
      onClick={() => setMenuAbierto(false)}
      className="rounded-xl px-4 py-3 text-white hover:bg-orange-600/10 hover:text-orange-500 transition"
    >
      Dashboard
    </Link>

    <Link
      href="/clientes"
      onClick={() => setMenuAbierto(false)}
      className="rounded-xl px-4 py-3 text-white hover:bg-orange-600/10 hover:text-orange-500 transition"
    >
      Clientes
    </Link>

    <Link
      href="/citas"
      onClick={() => setMenuAbierto(false)}
      className="rounded-xl px-4 py-3 text-white hover:bg-orange-600/10 hover:text-orange-500 transition"
    >
      Citas
    </Link>

    <Link
      href="/empleados"
      onClick={() => setMenuAbierto(false)}
      className="rounded-xl px-4 py-3 text-white hover:bg-orange-600/10 hover:text-orange-500 transition"
    >
      Empleados
    </Link>

    <Link
      href="/servicios"
      onClick={() => setMenuAbierto(false)}
      className="rounded-xl px-4 py-3 text-white hover:bg-orange-600/10 hover:text-orange-500 transition"
    >
      Servicios
    </Link>

    <button
      onClick={cerrarSesion}
      className="rounded-xl px-4 py-3 text-white hover:bg-orange-600/10 hover:text-orange-500 transition"
    >
      Salir
    </button>

  </div>
)}
    </nav>
  )
}
