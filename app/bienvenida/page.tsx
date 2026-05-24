'use client'

import Link from 'next/link'

const pasos = [
  {
    titulo: '1. Crea tus servicios',
    texto: 'Registra lo que vendes, el precio y el tiempo aproximado de atencion.',
    href: '/servicios',
    boton: 'Crear servicios',
  },
  {
    titulo: '2. Agrega empleados',
    texto: 'Crea el equipo que atendera las citas y manten activo solo a quien recibe reservas.',
    href: '/empleados',
    boton: 'Agregar empleados',
  },
  {
    titulo: '3. Guarda clientes',
    texto: 'Registra nombre, WhatsApp, correo y notas importantes para atender mejor.',
    href: '/clientes',
    boton: 'Guardar clientes',
  },
  {
    titulo: '4. Agenda la primera cita',
    texto: 'Une cliente, servicio, empleado, fecha y hora. Desde ahi puedes avisar por WhatsApp.',
    href: '/citas',
    boton: 'Agendar cita',
  },
]

const beneficios = [
  'Agenda organizada desde celular o computador.',
  'WhatsApp listo para avisar al cliente sin escribir todo a mano.',
  'QR publico disponible desde Pro para que el cliente agende solo.',
  'Recordatorios automaticos al negocio desde Pro cuando Oboro Lab active Meta.',
  'Finanzas y liquidacion de colaboradores en Business.',
]

export default function BienvenidaPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <div className="mt-3 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
              Bienvenido a tu panel de reservas
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Configura tu negocio una vez y empieza a manejar clientes,
              servicios, empleados y citas desde un solo lugar.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-2xl shadow-orange-950/20">
            <p className="text-sm text-zinc-400">Recomendado para empezar</p>
            <h2 className="mt-2 text-2xl font-bold text-orange-500">
              Completa estos 4 pasos
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Si haces esto, tu negocio queda listo para recibir y administrar
              reservas.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pasos.map((paso) => (
            <article
              key={paso.titulo}
              className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20"
            >
              <h2 className="text-xl font-bold text-orange-500">
                {paso.titulo}
              </h2>
              <p className="mt-3 min-h-24 text-sm leading-6 text-zinc-400">
                {paso.texto}
              </p>
              <Link
                href={paso.href}
                className="mt-5 block min-h-12 rounded-xl bg-orange-600 px-4 py-3 text-center font-bold transition hover:bg-orange-700"
              >
                {paso.boton}
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border border-green-600/40 bg-green-950/10 p-5">
            <h2 className="text-2xl font-bold text-green-300">
              Como se usa en el dia a dia
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              El negocio agenda o recibe reservas por QR, confirma la cita,
              avisa al cliente por WhatsApp y revisa su calendario. En Business
              tambien puede controlar ingresos, gastos y liquidaciones.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-2xl font-bold">Lo que incluye tu sistema</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {beneficios.map((beneficio) => (
                <div
                  key={beneficio}
                  className="rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300"
                >
                  {beneficio}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
