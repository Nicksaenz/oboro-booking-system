export const metadata = {
  title: 'Terminos de servicio | Oboro Booking',
  description: 'Terminos de servicio de Oboro Booking.',
}

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-12 text-white">
      <article className="mx-auto max-w-4xl rounded-2xl border border-orange-600/40 bg-zinc-950 p-6 shadow-2xl shadow-orange-950/20 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[4px] text-orange-500">
          Oboro Booking
        </p>
        <h1 className="mt-3 text-4xl font-black">Terminos de servicio</h1>
        <p className="mt-4 text-sm text-zinc-500">Ultima actualizacion: 27 de mayo de 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-300">
          <section>
            <h2 className="text-xl font-bold text-white">1. Uso del servicio</h2>
            <p className="mt-2">
              Oboro Booking permite a negocios de servicios administrar citas, clientes, empleados, servicios, recordatorios, reservas publicas y operaciones relacionadas. El usuario se compromete a usar la plataforma de forma legal y responsable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">2. Cuenta y acceso</h2>
            <p className="mt-2">
              Cada negocio es responsable de mantener la confidencialidad de sus credenciales, revisar los accesos de su equipo y mantener actualizada la informacion de contacto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">3. Mensajes y automatizaciones</h2>
            <p className="mt-2">
              Los mensajes enviados por WhatsApp se usan para fines transaccionales, como recordatorios de citas, recuperacion de acceso o notificaciones operativas. El negocio debe contar con autorizacion suficiente para comunicarse con sus clientes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">4. Pagos y planes</h2>
            <p className="mt-2">
              Los planes, precios, limites y funcionalidades pueden variar segun la version contratada. La continuidad del servicio puede depender del pago oportuno y de las condiciones vigentes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">5. Disponibilidad</h2>
            <p className="mt-2">
              Trabajamos para mantener el servicio disponible, pero pueden existir interrupciones por mantenimiento, proveedores externos, cambios de API o causas fuera de nuestro control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">6. Contacto</h2>
            <p className="mt-2">
              Para soporte, preguntas legales o solicitudes relacionadas con estos terminos, escribe a contacto@oborolab.com.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
