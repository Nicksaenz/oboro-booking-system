'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

const LINKS = [
  ['Inicio', '/bienvenida'],
  ['Dashboard', '/'],
  ['Clientes', '/clientes'],
  ['Citas', '/citas'],
  ['Empleados', '/empleados'],
  ['Equipo', '/equipo'],
  ['Servicios', '/servicios'],
  ['Automatizaciones', '/automatizaciones'],
  ['Finanzas', '/finanzas'],
  ['Manual', '/manual-admin'],
]

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const pathname = usePathname()

  if (
    pathname === '/login' ||
    pathname.startsWith('/reservar') ||
    pathname.startsWith('/reserva/')
  ) {
    return null
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function linkClass(href: string) {
    const activo = href === '/' ? pathname === href : pathname.startsWith(href)

    return `rounded-xl px-3 py-2 text-sm font-bold transition ${
      activo
        ? 'border border-orange-500/40 bg-orange-600/15 text-orange-200'
        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
    }`
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-[3px] text-orange-500">
              OBORO BOOKING
            </h1>
            <p className="text-sm text-zinc-500">
              Powered by Oboro Lab
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className={linkClass(href)}>
              {label}
            </Link>
          ))}

          <button
            onClick={cerrarSesion}
            className="ml-2 rounded-xl border border-red-600/40 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-600/10"
          >
            Salir
          </button>
        </div>

        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="lg:hidden rounded-xl border border-orange-600/40 px-4 py-2 text-sm font-bold text-white"
        >
          Menu
        </button>
      </div>

      {menuAbierto && (
        <div className="mx-4 mb-4 grid gap-2 rounded-2xl border border-orange-600/30 bg-zinc-950/95 p-4 shadow-2xl shadow-orange-950/30 backdrop-blur-xl lg:hidden">
          {LINKS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuAbierto(false)}
              className={linkClass(href)}
            >
              {label}
            </Link>
          ))}

          <button
            onClick={cerrarSesion}
            className="rounded-xl border border-red-600/40 px-4 py-3 text-left text-sm font-bold text-red-200 transition hover:bg-red-600/10"
          >
            Salir
          </button>
        </div>
      )}
    </nav>
  )
}
