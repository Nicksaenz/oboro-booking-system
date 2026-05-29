import Link from 'next/link'

const pasos = [
  {
    titulo: 'Instala desde el navegador',
    texto:
      'Mientras terminamos la publicacion en tiendas, Oboro Booking ya funciona como app instalable en Android, iPhone y computador.',
  },
  {
    titulo: 'Play Store primero',
    texto:
      'Android sera la primera tienda porque la app ya cumple muy bien como PWA y puede empaquetarse para negocios.',
  },
  {
    titulo: 'App Store despues',
    texto:
      'iPhone requiere una experiencia mas nativa para pasar revision con fuerza. La haremos despues de reforzar el flujo movil.',
  },
]

export default function InstalarPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <h1 className="text-5xl font-black leading-tight sm:text-6xl">
              Lleva Oboro en tu celular.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
              Administra citas, clientes, servicios, QR, recordatorios y
              finanzas desde una app instalable. Estamos preparando la version
              de tienda, pero ya puedes usarla como aplicacion.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="min-h-12 rounded-xl bg-orange-600 px-6 py-3 text-center font-black transition hover:bg-orange-700"
              >
                Abrir Oboro Booking
              </Link>
              <a
                href="/manifest.webmanifest"
                className="min-h-12 rounded-xl border border-orange-600/60 px-6 py-3 text-center font-black text-orange-200 transition hover:bg-orange-600/10"
              >
                Ver manifest
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/30">
            <div className="mx-auto max-w-xs rounded-[2rem] border border-zinc-800 bg-black p-4">
              <img
                src="/icons/icon-512.png"
                alt="Icono de Oboro Booking"
                className="mx-auto h-28 w-28 rounded-3xl"
              />
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-bold uppercase tracking-[3px] text-orange-500">
                  App instalada
                </p>
                <h2 className="mt-2 text-2xl font-black">Oboro Booking</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Agenda, QR y WhatsApp automatico para negocios de servicios.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pasos.map((paso) => (
            <article
              key={paso.titulo}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-black text-orange-500">
                {paso.titulo}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {paso.texto}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
