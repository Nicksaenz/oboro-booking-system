import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="w-full border-b border-orange-500/20 bg-black">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        
        <div>
          <h1 className="text-orange-500 font-black text-2xl">
            OBORO BOOKING
          </h1>

          <p className="text-gray-500 text-sm">
            Powered by Oboro Labs
          </p>
        </div>

        <div className="flex gap-4">
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
        </div>
      </div>
    </nav>
  )
}