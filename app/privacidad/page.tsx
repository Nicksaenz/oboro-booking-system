export const metadata = {
  title: 'Politica de privacidad | Oboro Booking',
  description: 'Politica de privacidad de Oboro Booking.',
}

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-12 text-white">
      <article className="mx-auto max-w-4xl rounded-2xl border border-orange-600/40 bg-zinc-950 p-6 shadow-2xl shadow-orange-950/20 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[4px] text-orange-500">
          Oboro Booking
        </p>
        <h1 className="mt-3 text-4xl font-black">Politica de privacidad</h1>
        <p className="mt-4 text-sm text-zinc-500">Ultima actualizacion: 27 de mayo de 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-300">
          <section>
            <h2 className="text-xl font-bold text-white">1. Responsable</h2>
            <p className="mt-2">
              Oboro Booking es operado por Laboratorios Oboro. Esta politica explica como tratamos la informacion usada para gestionar reservas, clientes, servicios, empleados, comunicaciones y automatizaciones del sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">2. Datos que tratamos</h2>
            <p className="mt-2">
              Podemos tratar datos como nombre, correo, telefono, informacion del negocio, servicios, horarios, empleados, citas, estados de reserva, mensajes transaccionales y datos tecnicos necesarios para operar la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">3. Finalidades</h2>
            <p className="mt-2">
              Usamos la informacion para crear y administrar cuentas, permitir reservas, enviar recordatorios, gestionar pagos, prestar soporte, mejorar el servicio, prevenir abuso y cumplir obligaciones legales aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">4. WhatsApp y proveedores</h2>
            <p className="mt-2">
              Oboro Booking puede usar WhatsApp Business Platform de Meta para enviar mensajes transaccionales relacionados con citas, recuperacion de acceso y notificaciones del negocio. Tambien usamos proveedores como Supabase, Vercel y pasarelas de pago para operar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">5. Conservacion y seguridad</h2>
            <p className="mt-2">
              Conservamos la informacion mientras sea necesaria para prestar el servicio, cumplir obligaciones o resolver solicitudes. Aplicamos medidas razonables de seguridad, control de acceso y separacion de datos por cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">6. Derechos</h2>
            <p className="mt-2">
              Los usuarios pueden solicitar acceso, actualizacion, correccion o eliminacion de sus datos cuando corresponda. Para ejercer derechos o hacer preguntas, escribe a contacto@oborolab.com.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
