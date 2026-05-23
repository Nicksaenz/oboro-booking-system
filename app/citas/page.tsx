'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'


export default function CitasPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [citas, setCitas] = useState<any[]>([])

  const [clienteId, setClienteId] = useState('')
  const [servicioId, setServicioId] = useState('')
  const [empleadoId, setEmpleadoId] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [filtroEmpleado, setFiltroEmpleado] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [plantillaWhatsApp, setPlantillaWhatsApp] = useState(
    'Hola {{cliente}}, te recordamos tu cita para el dia {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Te atendera {{empleado}}. Si necesitas cambiar tu reserva, responde este mensaje.'
  )
  const [plantillaNegocioWhatsApp, setPlantillaNegocioWhatsApp] = useState(
    'Recordatorio: tienes una cita con {{cliente}} el dia {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Atiende: {{empleado}}.'
  )
  const [telefonoNegocio, setTelefonoNegocio] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')

  useEffect(() => {
  if (mensaje) {
    const timer = setTimeout(() => {
      setMensaje('')
    }, 3000)

    return () => clearTimeout(timer)
  }
}, [mensaje])
  const [guardandoCita, setGuardandoCita] = useState(false)
  const [citaEditando, setCitaEditando] = useState<any>(null)
  const [citaDetalle, setCitaDetalle] = useState<any>(null)
  const [editFecha, setEditFecha] = useState('')
  const [editHora, setEditHora] = useState('')
  const [editEmpleadoId, setEditEmpleadoId] = useState('')
  const hoy = new Date()
  const [mesActual, setMesActual] = useState(hoy.getMonth())
  const [anioActual, setAnioActual] = useState(hoy.getFullYear())

  const primerDiaMes = new Date(anioActual, mesActual, 1)
const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0)
const diasEnMes = ultimoDiaMes.getDate()
const inicioSemana = primerDiaMes.getDay()

const diasCalendario = [
  ...Array(inicioSemana).fill(null),
  ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
]

const nombreMes = primerDiaMes.toLocaleDateString('es-CO', {
  month: 'long',
  year: 'numeric',
})
function cambiarMes(direccion: number) {
  if (mesActual + direccion > 11) {
    setMesActual(0)
    setAnioActual(anioActual + 1)
  } else if (mesActual + direccion < 0) {
    setMesActual(11)
    setAnioActual(anioActual - 1)
  } else {
    setMesActual(mesActual + direccion)
  }
}

const citasFiltradas = citas.filter((cita) => {
  const coincideBusqueda = cita.Clientes?.Nombre
  ?.toLowerCase()
  .includes(busqueda.toLowerCase()) || false

  const coincideEmpleado = filtroEmpleado
    ? cita.Empleados?.Nombre === filtroEmpleado
    : true

  const coincideEstado = filtroEstado
    ? cita.Estado === filtroEstado
    : true

  return coincideBusqueda && coincideEmpleado && coincideEstado
})
  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

  if (!user) {
  router.push('/login')
  return
}
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      router.push('/login')
      return
    }

    const clientesRes = await supabase.from('Clientes').select('*').eq('usuario_id', user.id)
    const serviciosRes = await supabase.from('SERVICIOS').select('*').eq('ID DE USUARIO', user.id)
    const empleadosRes = await supabase.from('Empleados').select('*').eq('ID de Usuario', user.id)
    const suscripcionRes = await fetch('/api/suscripcion', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const suscripcionJson = suscripcionRes.ok
      ? await suscripcionRes.json()
      : { suscripcion: null }
    const citasRes = await supabase
  .from('Citas')
  .select(`
  *,
  Clientes:ID_Cliente (
    Nombre,
    Numero
  ),
  SERVICIOS:ID_Servicio (
    "Nombre del servicio"
  ),
  Empleados:ID_Empleado (
    Nombre
  )
`)
   .eq('ID_Usuario', user.id)
   .order('Fecha', { ascending: true })
   .order('Hora', { ascending: true })

    setClientes(clientesRes.data || [])
    setServicios(serviciosRes.data || [])
    setEmpleados(empleadosRes.data || [])
    setCitas(citasRes.data || [])
    setTelefonoNegocio(suscripcionJson.suscripcion?.telefono ?? '')
    setNombreNegocio(suscripcionJson.suscripcion?.nombre_negocio ?? '')
  }

  async function guardarCita(e: React.FormEvent) {
    e.preventDefault()
    setGuardandoCita(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

if (!user) {
  router.push('/login')
  return
}

if (!clienteId || !servicioId || !empleadoId || !fecha || !hora) {
  setMensaje('Por favor completa todos los campos antes de guardar la cita.')
  setGuardandoCita(false)
  return
}

    const { data: citaExistente } = await supabase
  .from('Citas')
  .select('*')
  .eq('Fecha', fecha)
  .eq('Hora', hora)
  .eq('ID_Empleado', empleadoId)
  .neq('Estado', 'cancelada')

if (citaExistente && citaExistente.length > 0) {
  setMensaje('Ese empleado ya tiene una cita en ese horario.')
  setGuardandoCita(false)
  return
}
    
    const { error } = await supabase.from('Citas').insert([
      {
        ID_Cliente: clienteId,
        ID_Servicio: servicioId,
        ID_Empleado: empleadoId,
        Fecha: fecha,
        Hora: hora,
        Estado: 'pendiente',
        ID_Usuario: user.id,
      },
    ])

    if (error) {
      setMensaje(`Error: ${error.message}`)
      setGuardandoCita(false)
      return
    }

    setMensaje('Cita guardada correctamente.')
    setClienteId('')
    setServicioId('')
    setEmpleadoId('')
    setFecha('')
    setHora('')
    cargarDatos()
    setGuardandoCita(false)
  }
    async function actualizarEstado(id: string, nuevoEstado: string) {
  const { error } = await supabase
    .from('Citas')
    .update({ Estado: nuevoEstado })
    .eq('ID', id)

  if (error) {
    setMensaje(`Error: ${error.message}`)
    return
  }

  setMensaje(`Cita marcada como ${nuevoEstado}.`)
  cargarDatos()
}

async function eliminarCita(id: string) {
  const { error } = await supabase
    .from('Citas')
    .delete()
    .eq('ID', id)

  if (error) {
    setMensaje(`Error: ${error.message}`)
    return
  }

  setMensaje('Cita eliminada correctamente.')
  cargarDatos()
}

function normalizarTelefonoWhatsApp(valor: unknown) {
  const digitos = String(valor ?? '').replace(/\D/g, '')

  if (!digitos) return ''
  if (digitos.startsWith('57')) return digitos
  if (digitos.length === 10) return `57${digitos}`

  return digitos
}

function aplicarPlantillaWhatsApp(cita: any, plantilla: string) {
  return plantilla
    .replaceAll('{{cliente}}', cita.Clientes?.Nombre ?? 'cliente')
    .replaceAll('{{fecha}}', cita.Fecha ?? '')
    .replaceAll('{{hora}}', cita.Hora ?? '')
    .replaceAll(
      '{{servicio}}',
      cita.SERVICIOS?.['Nombre del servicio'] ?? 'servicio'
    )
    .replaceAll('{{empleado}}', cita.Empleados?.Nombre ?? 'equipo')
    .replaceAll('{{negocio}}', nombreNegocio || 'tu negocio')
}

function abrirWhatsAppConMensaje(telefonoDestino: unknown, texto: string, error: string) {
  const telefono = normalizarTelefonoWhatsApp(telefonoDestino)

  if (!telefono) {
    setMensaje(error)
    return
  }

  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`

  window.open(url, '_blank', 'noopener,noreferrer')
  setMensaje('WhatsApp preparado. Revisa el mensaje y presiona enviar.')
}

function abrirWhatsAppCliente(cita: any) {
  abrirWhatsAppConMensaje(
    cita.Clientes?.Numero,
    aplicarPlantillaWhatsApp(cita, plantillaWhatsApp),
    'Agrega el WhatsApp del cliente en Clientes para preparar el mensaje.'
  )
}

function abrirWhatsAppNegocio(cita: any) {
  abrirWhatsAppConMensaje(
    telefonoNegocio,
    aplicarPlantillaWhatsApp(cita, plantillaNegocioWhatsApp),
    'Agrega el WhatsApp del negocio en la cuenta para preparar este aviso.'
  )
}

function abrirModalEditar(cita: any) {
  setCitaEditando(cita)
  setEditFecha(cita.Fecha)
  setEditHora(cita.Hora)
  setEditEmpleadoId(cita.ID_Empleado)
}

async function guardarEdicionCita() {

  if (!citaEditando) return

  const { error } = await supabase
    .from('Citas')
    .update({
      Fecha: editFecha,
      Hora: editHora,
      ID_Empleado: editEmpleadoId,
    })
    .eq('ID', citaEditando.ID)

  if (error) {
    setMensaje(`Error: ${error.message}`)
    return
  }

  setMensaje('Cita actualizada correctamente.')

  setCitaEditando(null)

  cargarDatos()
}
  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    const plantillaGuardada = window.localStorage.getItem('oboro_whatsapp_template')

    if (plantillaGuardada) {
      setPlantillaWhatsApp(plantillaGuardada)
    }

    const plantillaNegocioGuardada = window.localStorage.getItem('oboro_whatsapp_template_negocio')

    if (plantillaNegocioGuardada) {
      setPlantillaNegocioWhatsApp(plantillaNegocioGuardada)
    }
  }, [])

  useEffect(() => {
  async function verificarSesion() {
    const { data } = await supabase.auth.getSession()

    if (!data.session) {
      router.push('/login')
    }
  }

  verificarSesion()
}, [])

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <p className="text-sm font-bold tracking-[4px] text-orange-500">
          OBORO BOOKING
        </p>

        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
          Citas
        </h1>

        <p className="mt-3 mb-8 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Agenda reservas conectando clientes, servicios y empleados.
        </p>

        <div className="mb-8 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-4 shadow-xl shadow-orange-950/10">
            <p className="text-sm font-bold text-orange-500">
              Aviso al cliente
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              El boton abre WhatsApp con el mensaje listo. El negocio solo
              revisa y presiona enviar desde su propio WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl border border-green-600/40 bg-green-950/10 p-4 shadow-xl shadow-green-950/10">
            <p className="text-sm font-bold text-green-300">
              Aviso al negocio
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Oboro Lab enviara automaticamente un resumen de las citas del dia
              siguiente al numero registrado del negocio.
            </p>
          </div>
        </div>

        <form
          onSubmit={guardarCita}
          className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-orange-600/30 bg-zinc-950/70 p-4 shadow-2xl shadow-orange-950/20 sm:gap-4 sm:p-5 md:grid-cols-3"
          >
          <select
            className="min-h-12 w-full rounded-xl border border-orange-600/50 bg-black p-4 text-sm outline-none transition focus:border-orange-400"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            
          >
            <option value="">Seleccionar cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.Nombre}
              </option>
            ))}
          </select>

          <select
            className="min-h-12 w-full rounded-xl border border-orange-600/50 bg-black p-4 text-sm outline-none transition focus:border-orange-400"
            value={servicioId}
            onChange={(e) => setServicioId(e.target.value)}
            
          >
            <option value="">Seleccionar servicio</option>
            {servicios.map((servicio) => (
              <option key={servicio.ID} value={servicio.ID}>
                {servicio['Nombre del servicio']}
              </option>
            ))}
          </select>

          <select
            className="min-h-12 w-full rounded-xl border border-orange-600/50 bg-black p-4 text-sm outline-none transition focus:border-orange-400"
            value={empleadoId}
            onChange={(e) => setEmpleadoId(e.target.value)}
            
          >
            <option value="">Seleccionar empleado</option>
            {empleados.map((empleado) => (
              <option key={empleado.ID} value={empleado.ID}>
                {empleado.Nombre}
              </option>
            ))}
          </select>

          <input
            className="min-h-12 w-full rounded-xl border border-orange-600/50 bg-black p-4 text-sm outline-none transition focus:border-orange-400"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            
          />

          <input
            className="min-h-12 w-full rounded-xl border border-orange-600/50 bg-black p-4 text-sm outline-none transition focus:border-orange-400"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            
          />

          <button
            type="submit"
            disabled={guardandoCita}
            className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardandoCita ? 'Guardando...' : 'Guardar cita'} 
          </button>
        </form>

        {mensaje && (
  <div className="fixed left-4 right-4 top-4 z-50 rounded-2xl border border-orange-600/50 bg-zinc-950 px-5 py-4 text-sm text-orange-300 shadow-xl shadow-orange-950/40 sm:left-auto sm:right-6 sm:max-w-md">
    {mensaje}
  </div>
)}

        <div className="col-span-full mb-8 mt-6 w-full rounded-2xl border border-orange-600/40 bg-zinc-950 p-4 shadow-2xl shadow-orange-950/20 md:mt-10 md:p-6">
       <h2 className="mb-4 text-2xl font-bold text-orange-500">
    Calendario de citas
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">

  <input
    type="text"
    placeholder="Buscar cliente..."
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
    className="min-h-12 w-full rounded-xl border border-orange-600/50 bg-black p-3 text-white outline-none"
  />

  <select
    value={filtroEmpleado}
    onChange={(e) => setFiltroEmpleado(e.target.value)}
    className="min-h-12 w-full rounded-xl border border-orange-600/50 bg-black p-3 text-white outline-none"
  >
    <option value="">Todos los empleados</option>

    {empleados.map((empleado) => (
      <option key={empleado.ID} value={empleado.Nombre}>
        {empleado.Nombre}
      </option>
    ))}
  </select>

  <select
    value={filtroEstado}
    onChange={(e) => setFiltroEstado(e.target.value)}
    className="min-h-12 w-full rounded-xl border border-orange-600/50 bg-black p-3 text-white outline-none"
  >
    <option value="">Todos los estados</option>
    <option value="pendiente">Pendiente</option>
    <option value="confirmada">Confirmada</option>
    <option value="completada">Completada</option>
  </select>

</div>
  <div className="mt-6 md:hidden">
  <div className="mb-4 flex items-center justify-between gap-3">
    <button
      onClick={() => cambiarMes(-1)}
      className="min-h-11 rounded-xl border border-orange-600/50 px-4 py-2 text-white"
    >
      ←
    </button>

    <h3 className="text-center text-lg font-bold capitalize text-orange-500">
      {nombreMes}
    </h3>

    <button
      onClick={() => cambiarMes(1)}
      className="min-h-11 rounded-xl border border-orange-600/50 px-4 py-2 text-white"
    >
      →
    </button>
  </div>

  <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-orange-500">
    <span>Dom</span>
    <span>Lun</span>
    <span>Mar</span>
    <span>Mié</span>
    <span>Jue</span>
    <span>Vie</span>
    <span>Sáb</span>
  </div>

  <div className="grid grid-cols-7 gap-1">
    {diasCalendario.map((dia, index) => {
      const fechaDia = dia
        ? `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        : ''

      const citasDelDia = citasFiltradas.filter((cita) => cita.Fecha === fechaDia)

      return (
        <div
          key={index}
          className="min-h-[62px] rounded-xl border border-orange-600/40 bg-black p-1"
        >
          {dia && (
            <>
              <p className="text-xs font-bold text-orange-500">{dia}</p>

              {citasDelDia.map((cita) => (
                <div
                  key={cita.ID}
                  onClick={() => setCitaDetalle(cita)}
                  className="mt-1 cursor-pointer truncate rounded-md bg-orange-600 px-1 py-1 text-[10px] font-bold text-black"
                >
                  {cita.Hora}
                </div>
              ))}
            </>
          )}
        </div>
      )
    })}
  </div>
</div>
  <div className="mt-6 space-y-4 md:hidden">
  {citasFiltradas.map((cita) => (
    <div
      key={cita.ID}
      className="rounded-2xl border border-orange-600/40 bg-black p-4 shadow-lg shadow-orange-950/20"
    >
      <h3 className="mb-3 text-lg font-bold text-orange-500">
        Cita programada
      </h3>

      <p className="text-sm leading-6 text-zinc-300">Fecha: {cita.Fecha}</p>
      <p className="text-sm leading-6 text-zinc-300">Hora: {cita.Hora}</p>
      <p className="text-sm leading-6 text-zinc-300">Cliente: {cita.Clientes?.Nombre}</p>
      <p className="text-sm leading-6 text-zinc-300">Servicio: {cita.SERVICIOS?.['Nombre del servicio']}</p>
      <p className="text-sm leading-6 text-zinc-300">Empleado: {cita.Empleados?.Nombre}</p>

      <p className="mt-3 text-sm font-bold text-yellow-400">
        Estado: {cita.Estado}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => actualizarEstado(cita.ID, 'confirmada')}
          className="min-h-11 rounded-xl bg-green-600 px-3 py-2 text-sm font-bold"
        >
          Confirmar
        </button>

        <button
          onClick={() => actualizarEstado(cita.ID, 'completada')}
          className="min-h-11 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold"
        >
          Completar
        </button>

        <button
          onClick={() => abrirModalEditar(cita)}
          className="min-h-11 rounded-xl bg-yellow-500 px-3 py-2 text-sm font-bold text-black"
        >
          Editar
        </button>

        <button
          onClick={() => {
            const confirmar = confirm('¿Seguro que deseas eliminar esta cita?')
            if (confirmar) {
              eliminarCita(cita.ID)
            }
          }}
          className="min-h-11 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold"
        >
          Cancelar
        </button>

        <button
          onClick={() => abrirWhatsAppCliente(cita)}
          className="col-span-2 min-h-11 rounded-xl border border-orange-600/60 px-3 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10 disabled:opacity-60"
        >
          Avisar cliente
        </button>

        <button
          onClick={() => abrirWhatsAppNegocio(cita)}
          className="col-span-2 min-h-11 rounded-xl border border-green-600/60 px-3 py-2 text-sm font-bold text-green-200 transition hover:bg-green-600/10"
        >
          Avisar negocio
        </button>
      </div>
    </div>
  ))}
</div>
  <div className="hidden md:block overflow-x-auto">
   <table className="min-w-full text-left border-collapse">
      <thead>
        <tr className="text-orange-500 border-b border-orange-600/40">
          <th className="py-3 px-3">Fecha</th>
          <th className="py-3 px-3">Hora</th>
          <th className="py-3 px-3">Cliente</th>
          <th className="py-3 px-3">Servicio</th>
          <th className="py-3 px-3">Empleado</th>
          <th className="py-3 px-3">Estado</th>
          <th className="py-3 px-3">Recordatorios</th>
        </tr>
      </thead>

      <tbody>
        {citasFiltradas.map((cita) => (
          <tr
            key={cita.ID}
            className="border-b border-zinc-800 text-zinc-200 hover:bg-zinc-900/80 transition"
          >
            <td className="py-3 px-3">{cita.Fecha}</td>
            <td className="py-3 px-3">{cita.Hora}</td>
            <td className="py-3 px-3">{cita.Clientes?.Nombre}</td>
            <td className="py-3 px-3">
              {cita.SERVICIOS?.['Nombre del servicio']}
            </td>
            <td className="py-3 px-3">{cita.Empleados?.Nombre}</td>
            <td className="py-3 px-3">
              <span
                className={
                  cita.Estado === 'confirmada'
                    ? 'text-green-400 font-bold'
                    : cita.Estado === 'completada'
                    ? 'text-blue-400 font-bold'
                    : cita.Estado === 'cancelada'
                    ? 'text-red-400 font-bold'
                    : 'text-yellow-400 font-bold'
                }
              >
                {cita.Estado}
              </span>
            </td>
            <td className="py-3 px-3">
              <button
                onClick={() => abrirWhatsAppCliente(cita)}
                className="rounded-xl border border-orange-600/60 px-3 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10 disabled:opacity-60"
              >
                Avisar cliente
              </button>
              <button
                onClick={() => abrirWhatsAppNegocio(cita)}
                className="ml-2 rounded-xl border border-green-600/60 px-3 py-2 text-sm font-bold text-green-200 transition hover:bg-green-600/10"
              >
                Avisar negocio
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="hidden md:hidden">
  {citasFiltradas.map((cita) => (
    <div
      key={cita.ID}
      className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-4"
    >
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-orange-500 font-bold">
            {cita.Clientes?.Nombre}
          </p>
          <p className="text-sm text-zinc-300">
            ✂️ {cita.SERVICIOS?.['Nombre del servicio']}
          </p>
          <p className="text-sm text-zinc-300">
            🧑‍💼 {cita.Empleados?.Nombre}
          </p>
        </div>

        <div className="text-right text-sm text-zinc-300">
          <p>📅 {cita.Fecha}</p>
          <p>🕒 {cita.Hora}</p>
        </div>
      </div>

      <p className="mt-3 text-sm font-bold text-green-400">
        {cita.Estado}
      </p>
    </div>
  ))}
</div>

    <div className="mt-10">
  <div className="flex items-center justify-between mb-6">
    
    <button
      onClick={() => {
        if (mesActual === 0) {
          setMesActual(11)
          setAnioActual(anioActual - 1)
        } else {
          setMesActual(mesActual - 1)
        }
      }}
      className="bg-zinc-900 border border-orange-600/50 px-4 py-2 rounded-xl hover:bg-zinc-800"
    >
      ←
    </button>

    <h2 className="text-2xl font-bold text-orange-500 capitalize">
      {nombreMes}
    </h2>

    <button
      onClick={() => {
        if (mesActual === 11) {
          setMesActual(0)
          setAnioActual(anioActual + 1)
        } else {
          setMesActual(mesActual + 1)
        }
      }}
      className="bg-zinc-900 border border-orange-600/50 px-4 py-2 rounded-xl hover:bg-zinc-800"
    >
      →
    </button>

  </div>

  <div className="grid grid-cols-7 gap-1 md:gap-3">

    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia) => (
      <div
        key={dia}
        className="text-center font-bold text-orange-500"
      >
        {dia}
      </div>
    ))}

    {diasCalendario.map((dia, index) => {
      const fechaCompleta = dia
        ? `${anioActual}-${String(mesActual + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
        : null

      const citasDelDia = citas.filter(
        (cita) => cita.Fecha === fechaCompleta
      )

      return (
        <div
          key={index}
          className="min-h-[52px] md:min-h-[120px] rounded-xl md:rounded-2xl border border-orange-600/40 bg-zinc-950 p-1 md:p-2"
        >
          {dia && (
            <>
              <div className="font-bold text-orange-400 mb-2">
                {dia}
              </div>

              <div className="space-y-2">
                {citasDelDia.map((cita) => (
                  <div
                    key={cita.ID}
                    onClick={() => setCitaDetalle(cita)}
                    className="rounded-md bg-orange-600 text-black text-[10px] md:text-xs p-1 md:p-2 font-bold cursor-pointer hover:scale-105 transition truncate"
                  >
                    {cita.Hora}
                    <br />
                    {cita.Clientes?.Nombre}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )
    })}
  </div>
</div>
  </div>
</div>
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {citasFiltradas.map((cita) => (
            <div
              key={cita.ID}
              className="border border-orange-600/50 bg-zinc-950 rounded-3xl p-4 md:p-6"
            >
              <h2 className="text-2xl font-bold text-orange-500">
                Cita programada
              </h2>

              <p className="text-zinc-300 mt-4">
                📅 Fecha: {cita.Fecha}
              </p>

              <p className="text-zinc-300">
                🕒 Hora: {cita.Hora}
              </p>

              <p className="text-zinc-300">
                👤 Cliente: {cita.Clientes?.Nombre}
              </p>

              <p className="text-zinc-300">
                ✂️ Servicio: {cita.SERVICIOS?.['Nombre del servicio']}
              </p>

              <p className="text-zinc-300">
                🧑‍💼 Empleado: {cita.Empleados?.Nombre}
              </p>

              <div className="mt-5">
              <span
  className={
    cita.Estado === 'confirmada'
      ? 'text-green-400'
      : cita.Estado === 'completada'
      ? 'text-blue-400'
      : cita.Estado === 'cancelada'
      ? 'text-red-400'
      : 'text-yellow-400'
  }
>
  Estado: {cita.Estado}
</span>

              <div className="flex flex-wrap gap-3">

  <button
    onClick={() => actualizarEstado(cita['ID'], 'confirmada')}
    className="rounded-xl bg-green-600 px-4 py-2 font-bold"
  >
    Confirmar
  </button>

  <button
    onClick={() => actualizarEstado(cita['ID'], 'completada')}
    className="rounded-xl bg-blue-600 px-4 py-2 font-bold"
  >
    Completar
  </button>
   
  <button
  onClick={() => abrirModalEditar(cita)}
  className="rounded-xl bg-yellow-500 text-black px-4 py-2 font-bold"
>
  Editar
</button>

  <button
    onClick={() => {
  const confirmar = confirm('¿Seguro que deseas eliminar esta cita?')

  if (confirmar) {
    eliminarCita(cita.ID)
  }
}}
    className="rounded-xl bg-red-600 px-4 py-2 font-bold"
  >
    Cancelar
  </button>

  <button
    onClick={() => abrirWhatsAppCliente(cita)}
    className="rounded-xl border border-orange-600/60 px-4 py-2 font-bold text-orange-200 transition hover:bg-orange-600/10 disabled:opacity-60"
  >
    Avisar cliente
  </button>

  <button
    onClick={() => abrirWhatsAppNegocio(cita)}
    className="rounded-xl border border-green-600/60 px-4 py-2 font-bold text-green-200 transition hover:bg-green-600/10"
  >
    Avisar negocio
  </button>

</div>
</div>
            </div>
          ))}
        </div>
      </section>
  
  {citaEditando && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

    <div className="bg-zinc-950 border border-orange-600/50 rounded-3xl p-8 w-full max-w-md">

      <h2 className="text-3xl font-bold text-orange-500 mb-6">
        Editar cita
      </h2>

      <div className="space-y-4">

        <input
          type="date"
          value={editFecha}
          onChange={(e) => setEditFecha(e.target.value)}
          className="w-full rounded-xl bg-zinc-900 border border-orange-600/50 p-4"
        />

        <input
          type="time"
          value={editHora}
          onChange={(e) => setEditHora(e.target.value)}
          className="w-full rounded-xl bg-zinc-900 border border-orange-600/50 p-4"
        />

        <select
          value={editEmpleadoId}
          onChange={(e) => setEditEmpleadoId(e.target.value)}
          className="w-full rounded-xl bg-zinc-900 border border-orange-600/50 p-4"
        >
          {empleados.map((empleado) => (
            <option key={empleado.ID} value={empleado.ID}>
              {empleado.Nombre}
            </option>
          ))}
        </select>

      </div>

      <div className="flex gap-4 mt-8">

        <button
          onClick={() => setCitaEditando(null)}
          className="flex-1 rounded-xl bg-red-600 py-3 font-bold"
        >
          Cerrar
        </button>

        <button
          onClick={guardarEdicionCita}
          className="flex-1 rounded-xl bg-orange-600 py-3 font-bold"
        >
          Guardar cambios
       </button>

      </div>

    </div>

  </div>
)}
    
    {citaDetalle && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-zinc-950 animate-in zoom-in duration-200 border border-orange-600/50 rounded-3xl p-6 md:p-8 w-[92%] max-w-md shadow-2xl shadow-orange-950/40">

      <h2 className="text-3xl font-bold text-orange-500 mb-6">
        Detalles de la cita
      </h2>

      <div className="space-y-3 text-zinc-200">
        <p>👤 Cliente: {citaDetalle.Clientes?.Nombre}</p>
        <p>✂️ Servicio: {citaDetalle.SERVICIOS?.['Nombre del servicio']}</p>
        <p>🧑‍💼 Empleado: {citaDetalle.Empleados?.Nombre}</p>
        <p>📅 Fecha: {citaDetalle.Fecha}</p>
        <p>🕒 Hora: {citaDetalle.Hora}</p>
        <p>Estado: {citaDetalle.Estado}</p>
      </div>

      <button
        onClick={() => setCitaDetalle(null)}
        className="mt-8 w-full rounded-xl bg-orange-600 py-3 font-bold"
      >
        Cerrar
      </button>

    </div>
  </div>
)}
    </main>
  )
}
