'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { mensajePermiso, obtenerContextoEquipo, type ContextoEquipo } from '@/lib/equipo'


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
  const [nombreNegocio, setNombreNegocio] = useState('Oboro Booking')

  const [filtroEmpleado, setFiltroEmpleado] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [contexto, setContexto] = useState<ContextoEquipo | null>(null)

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

function normalizarNumeroWhatsApp(valor: unknown) {
  const digitos = String(valor ?? '').replace(/\D/g, '')

  if (!digitos) return ''
  if (digitos.startsWith('57')) return digitos
  if (digitos.length === 10) return `57${digitos}`

  return digitos
}

function formatoHoraAmPm(hora: string) {
  const [horasTexto, minutosTexto = '00'] = String(hora ?? '').split(':')
  const horas = Number(horasTexto)
  const minutos = Number(minutosTexto)

  if (Number.isNaN(horas)) return hora || 'Sin hora'

  const periodo = horas >= 12 ? 'PM' : 'AM'
  const hora12 = horas % 12 || 12

  return `${hora12}:${String(minutos).padStart(2, '0')} ${periodo}`
}

function construirMensajeWhatsApp(cita: any) {
  const cliente = cita.Clientes?.Nombre ?? 'cliente'
  const servicio = cita.SERVICIOS?.['Nombre del servicio'] ?? 'tu servicio'
  const empleado = cita.Empleados?.Nombre ?? 'nuestro equipo'
  const fecha = cita.Fecha ?? 'la fecha programada'
  const hora = formatoHoraAmPm(cita.Hora ?? '')

  return [
    `Hola ${cliente}, te recordamos tu cita en ${nombreNegocio}.`,
    '',
    `Servicio: ${servicio}`,
    `Profesional: ${empleado}`,
    `Fecha: ${fecha}`,
    `Hora: ${hora}`,
    '',
    'Te esperamos.',
  ].join('\n')
}

function construirMensajeResena(cita: any) {
  const cliente = cita.Clientes?.Nombre ?? 'cliente'
  const servicio = cita.SERVICIOS?.['Nombre del servicio'] ?? 'tu servicio'
  const empleado = cita.Empleados?.Nombre ?? 'nuestro equipo'
  const enlace = `${window.location.origin}/reserva/${cita.ID}`

  return [
    `Hola ${cliente}, gracias por tu cita de ${servicio} con ${empleado}.`,
    '',
    'Nos ayudas calificando tu experiencia?',
    'Tu opinion ayuda a mejorar el servicio y suma al perfil del profesional.',
    '',
    `Califica aqui: ${enlace}`,
  ].join('\n')
}

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
const citasPendientes = citas.filter((cita) => cita.Estado === 'pendiente').length
const citasConfirmadas = citas.filter((cita) => cita.Estado === 'confirmada').length
const citasCompletadas = citas.filter((cita) => cita.Estado === 'completada').length
const citasHoy = citas.filter((cita) => cita.Fecha === new Date().toISOString().slice(0, 10)).length

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

  if (!user) {
  router.push('/login')
  return
}
    const acceso = await obtenerContextoEquipo()

    if (!acceso) {
      router.push('/login')
      return
    }

    setContexto(acceso)

    const empleadosQuery = supabase
      .from('Empleados')
      .select('*')
      .eq('ID de Usuario', acceso.negocioId)

    if (!acceso.esAdmin) {
      if (acceso.empleadoId) {
        empleadosQuery.eq('ID', acceso.empleadoId)
        setEmpleadoId(acceso.empleadoId)
      } else {
        empleadosQuery.eq('ID', '00000000-0000-0000-0000-000000000000')
      }
    }

    const clientesRes = await supabase.from('Clientes').select('*').eq('usuario_id', acceso.negocioId)
    const serviciosRes = await supabase.from('SERVICIOS').select('*').eq('ID DE USUARIO', acceso.negocioId)
    const empleadosRes = await empleadosQuery
    const citasQuery = supabase
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
   .eq('ID_Usuario', acceso.negocioId)

    if (!acceso.esAdmin) {
      citasQuery.eq(
        'ID_Empleado',
        acceso.empleadoId ?? '00000000-0000-0000-0000-000000000000'
      )
    }

    const citasRes = await citasQuery
      .order('Fecha', { ascending: true })
      .order('Hora', { ascending: true })
    const { data: suscripcionData } = await supabase
      .from('suscripciones')
      .select('nombre_negocio')
      .eq('usuario_id', acceso.negocioId)
      .maybeSingle()

    setClientes(clientesRes.data || [])
    setServicios(serviciosRes.data || [])
    setEmpleados(empleadosRes.data || [])
    setCitas(citasRes.data || [])
    setNombreNegocio(suscripcionData?.nombre_negocio ?? 'Oboro Booking')
  }

  async function guardarCita(e: React.FormEvent) {
    e.preventDefault()
    setGuardandoCita(true)

    const acceso = contexto ?? (await obtenerContextoEquipo())

    if (!acceso?.puedeOperar) {
      setMensaje(mensajePermiso('crear citas'))
      setGuardandoCita(false)
      return
    }

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

if (!acceso.esAdmin && (!acceso.empleadoId || empleadoId !== acceso.empleadoId)) {
  setMensaje('Tu acceso debe estar asociado a un empleado para crear citas propias.')
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
        ID_Usuario: acceso.negocioId,
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
    async function actualizarEstado(cita: any, nuevoEstado: string) {
  if (!contexto?.puedeOperar) {
    setMensaje(mensajePermiso('actualizar citas'))
    return
  }

  const { error } = await supabase
    .from('Citas')
    .update({ Estado: nuevoEstado })
    .eq('ID', cita.ID)

  if (error) {
    setMensaje(`Error: ${error.message}`)
    return
  }

  if (nuevoEstado === 'completada') {
    const numero = normalizarNumeroWhatsApp(cita.Clientes?.Numero)

    if (numero) {
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(
        construirMensajeResena(cita)
      )}`

      window.open(url, '_blank', 'noopener,noreferrer')
      setMensaje('Cita completada. WhatsApp se abrio con la solicitud de resena lista.')
    } else {
      setMensaje('Cita completada. El cliente no tiene un WhatsApp valido para pedir resena.')
    }
  } else {
    setMensaje(`Cita marcada como ${nuevoEstado}.`)
  }
  cargarDatos()
}

async function eliminarCita(id: string) {
  if (!contexto?.esAdmin) {
    setMensaje('Solo el administrador puede eliminar citas.')
    return
  }

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

function abrirWhatsAppManual(cita: any) {
  if (!contexto?.puedeOperar) {
    setMensaje(mensajePermiso('enviar recordatorios'))
    return
  }

  const numero = normalizarNumeroWhatsApp(cita.Clientes?.Numero)

  if (!numero) {
    setMensaje('Este cliente no tiene un numero de WhatsApp valido.')
    return
  }

  const mensaje = construirMensajeWhatsApp(cita)
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`

  window.open(url, '_blank', 'noopener,noreferrer')
  setMensaje('WhatsApp abierto con el recordatorio listo para enviar.')
}

function claseEstadoCita(estado: string) {
  if (estado === 'confirmada') {
    return 'border-green-600/40 bg-green-950/20 text-green-300'
  }

  if (estado === 'completada') {
    return 'border-blue-600/40 bg-blue-950/20 text-blue-300'
  }

  if (estado === 'cancelada') {
    return 'border-red-600/40 bg-red-950/20 text-red-300'
  }

  return 'border-yellow-600/40 bg-yellow-950/20 text-yellow-300'
}

function confirmarEliminacionCita(cita: any) {
  return confirm(
    `Seguro que deseas eliminar la cita de ${cita.Clientes?.Nombre ?? 'este cliente'}?`
  )
}

function abrirModalEditar(cita: any) {
  if (!contexto?.puedeOperar) {
    setMensaje(mensajePermiso('editar citas'))
    return
  }

  setCitaEditando(cita)
  setEditFecha(cita.Fecha)
  setEditHora(cita.Hora)
  setEditEmpleadoId(contexto?.empleadoId ?? cita.ID_Empleado)
}

async function guardarEdicionCita() {

  if (!citaEditando) return

  if (!contexto?.puedeOperar) {
    setMensaje(mensajePermiso('editar citas'))
    return
  }

  if (!contexto.esAdmin && (!contexto.empleadoId || editEmpleadoId !== contexto.empleadoId)) {
    setMensaje('Tu acceso debe estar asociado a un empleado para editar citas propias.')
    return
  }

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              Citas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Agenda reservas conectando clientes, servicios y empleados.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-500/30 bg-zinc-950 px-5 py-4 text-sm text-zinc-400 shadow-xl shadow-orange-950/10">
            <span className="font-bold text-orange-200">
              {contexto?.esAdmin ? 'Vista administrador' : 'Vista empleado'}
            </span>
            <span className="mx-2 text-zinc-700">/</span>
            {citasFiltradas.length} citas visibles
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Hoy', citasHoy, 'Movimiento del dia', 'border-blue-600/40 text-blue-300'],
            ['Pendientes', citasPendientes, 'Por confirmar', 'border-yellow-600/40 text-yellow-300'],
            ['Confirmadas', citasConfirmadas, 'Listas para atender', 'border-green-600/40 text-green-300'],
            ['Completadas', citasCompletadas, 'Servicios cerrados', 'border-orange-600/40 text-orange-300'],
          ].map(([titulo, valor, detalle, clase]) => (
            <div
              key={String(titulo)}
              className={`rounded-2xl border bg-zinc-950 p-4 shadow-lg shadow-black/30 ${clase}`}
            >
              <p className="text-sm text-zinc-500">{titulo}</p>
              <p className="mt-2 text-3xl font-black">{valor}</p>
              <p className="mt-1 text-xs text-zinc-500">{detalle}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 mb-8 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-600/40 bg-zinc-950 p-4 shadow-xl shadow-orange-950/10">
            <p className="text-sm font-bold text-orange-500">
              Recordatorio al cliente
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Oboro envia automaticamente el recordatorio al cliente final con
              servicio, fecha, hora y empleado asignado.
            </p>
          </div>

          <div className="rounded-2xl border border-green-600/40 bg-green-950/10 p-4 shadow-xl shadow-green-950/10">
            <p className="text-sm font-bold text-green-300">
              Recordatorio al negocio
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Oboro envia automaticamente al negocio un resumen de las citas del
              dia siguiente al WhatsApp registrado.
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[3px] text-orange-500">
                Acciones rapidas
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                Que hace cada boton
              </h2>
            </div>
            <p className="text-sm text-zinc-500">
              Usa estas acciones para operar cada cita sin salir de la agenda.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ['Confirmar', 'Marca la cita como aceptada por el negocio.', 'border-green-600/40 text-green-300'],
              ['Completar', 'Cierra el servicio y abre WhatsApp para pedir resena.', 'border-blue-600/40 text-blue-300'],
              ['WhatsApp', 'Abre un recordatorio listo para enviar al cliente.', 'border-emerald-600/40 text-emerald-300'],
              ['Editar', 'Cambia fecha, hora o profesional asignado.', 'border-orange-600/40 text-orange-300'],
              ['Eliminar', 'Borra la cita. Solo disponible para admin.', 'border-red-600/40 text-red-300'],
            ].map(([titulo, detalle, clase]) => (
              <div
                key={titulo}
                className={`rounded-xl border bg-black p-4 ${clase}`}
              >
                <p className="font-black">{titulo}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {detalle}
                </p>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={guardarCita}
          className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-orange-600/30 bg-zinc-950 p-4 shadow-2xl shadow-orange-950/20 sm:gap-4 sm:p-5 md:grid-cols-3"
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
            disabled={!contexto?.esAdmin && Boolean(contexto?.empleadoId)}
            
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
            disabled={guardandoCita || !contexto?.puedeOperar}
            className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardandoCita ? 'Guardando...' : !contexto?.puedeOperar ? 'Solo lectura' : 'Guardar cita'} 
          </button>
        </form>

        {mensaje && (
  <div className="fixed left-4 right-4 top-4 z-50 rounded-2xl border border-orange-600/50 bg-zinc-950 px-5 py-4 text-sm text-orange-300 shadow-xl shadow-orange-950/40 sm:left-auto sm:right-6 sm:max-w-md">
    {mensaje}
  </div>
)}

        <div className="col-span-full mb-8 mt-6 w-full rounded-2xl border border-orange-600/30 bg-zinc-950 p-4 shadow-2xl shadow-orange-950/20 md:mt-10 md:p-6">
       <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-xs font-bold uppercase tracking-[3px] text-orange-500">
        Gestion operativa
      </p>
      <h2 className="mt-1 text-2xl font-black text-white">
        Calendario de citas
      </h2>
    </div>
    <p className="text-sm text-zinc-500">
      {citasFiltradas.length} resultados
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">

  <input
    type="text"
    placeholder="Buscar cliente..."
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
    className="min-h-12 w-full rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none transition focus:border-orange-500"
  />

  <select
    value={filtroEmpleado}
    onChange={(e) => setFiltroEmpleado(e.target.value)}
    className="min-h-12 w-full rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none transition focus:border-orange-500"
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
    className="min-h-12 w-full rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none transition focus:border-orange-500"
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
      className="rounded-2xl border border-zinc-800 bg-black p-5 shadow-xl shadow-black/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[2px] text-orange-500">
            Cita programada
          </p>
          <h3 className="mt-1 text-2xl font-black text-white">
            {cita.Clientes?.Nombre ?? 'Cliente'}
          </h3>
        </div>
        <p className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${claseEstadoCita(cita.Estado)}`}>
          {cita.Estado}
        </p>
      </div>

      <div className="mt-4 grid gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4 text-sm text-zinc-300">
        <p>Servicio: {cita.SERVICIOS?.['Nombre del servicio']}</p>
        <p>Empleado: {cita.Empleados?.Nombre}</p>
        <p>
          Horario: {cita.Fecha} · {formatoHoraAmPm(cita.Hora)}
        </p>
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[2px] text-zinc-600">
        Gestion
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => actualizarEstado(cita, 'confirmada')}
          className="min-h-11 rounded-xl border border-green-600/50 px-3 py-2 text-sm font-bold text-green-200 transition hover:bg-green-600/10"
        >
          Confirmar
        </button>

        <button
          onClick={() => actualizarEstado(cita, 'completada')}
          className="min-h-11 rounded-xl border border-blue-600/50 px-3 py-2 text-sm font-bold text-blue-200 transition hover:bg-blue-600/10"
        >
          Completar
        </button>

        <button
          onClick={() => abrirWhatsAppManual(cita)}
          className="min-h-11 rounded-xl border border-emerald-600/50 px-3 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-600/10"
        >
          WhatsApp
        </button>

        <button
          onClick={() => abrirModalEditar(cita)}
          className="min-h-11 rounded-xl border border-orange-600/60 px-3 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
        >
          Editar
        </button>

        <button
          onClick={() => {
            if (confirmarEliminacionCita(cita)) {
              eliminarCita(cita.ID)
            }
          }}
          className="col-span-2 min-h-11 rounded-xl border border-red-600/50 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-600/10"
        >
          Eliminar
        </button>

      </div>
    </div>
  ))}
</div>
  <div className="hidden md:block overflow-x-auto rounded-2xl border border-zinc-800 bg-black">
   <table className="min-w-full border-collapse text-left">
      <thead className="bg-zinc-950">
        <tr className="border-b border-zinc-800 text-xs uppercase tracking-[2px] text-zinc-500">
          <th className="py-4 px-4">Fecha</th>
          <th className="py-4 px-4">Hora</th>
          <th className="py-4 px-4">Cliente</th>
          <th className="py-4 px-4">Servicio</th>
          <th className="py-4 px-4">Empleado</th>
          <th className="py-4 px-4">Estado</th>
          <th className="py-4 px-4">Acciones</th>
        </tr>
      </thead>

      <tbody>
        {citasFiltradas.map((cita) => (
          <tr
            key={cita.ID}
            className="border-b border-zinc-900 text-zinc-200 transition last:border-b-0 hover:bg-zinc-950"
          >
            <td className="py-4 px-4 text-sm text-zinc-400">{cita.Fecha}</td>
            <td className="py-4 px-4 font-bold text-zinc-100">{formatoHoraAmPm(cita.Hora)}</td>
            <td className="py-4 px-4 font-black text-white">{cita.Clientes?.Nombre}</td>
            <td className="py-4 px-4 text-sm text-zinc-300">
              {cita.SERVICIOS?.['Nombre del servicio']}
            </td>
            <td className="py-4 px-4 text-sm text-zinc-300">{cita.Empleados?.Nombre}</td>
            <td className="py-4 px-4">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${claseEstadoCita(cita.Estado)}`}
              >
                {cita.Estado}
              </span>
            </td>
            <td className="py-4 px-4">
              <div className="flex flex-wrap gap-2">
              <button
                onClick={() => actualizarEstado(cita, 'confirmada')}
                className="rounded-xl border border-green-600/50 px-3 py-2 text-sm font-bold text-green-200 transition hover:bg-green-600/10"
              >
                Confirmar
              </button>
              <button
                onClick={() => actualizarEstado(cita, 'completada')}
                className="rounded-xl border border-blue-600/50 px-3 py-2 text-sm font-bold text-blue-200 transition hover:bg-blue-600/10"
              >
                Completar
              </button>
              <button
                onClick={() => abrirWhatsAppManual(cita)}
                className="rounded-xl border border-emerald-600/50 px-3 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-600/10"
              >
                WhatsApp
              </button>
              <button
                onClick={() => abrirModalEditar(cita)}
                className="rounded-xl border border-orange-600/60 px-3 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  if (confirmarEliminacionCita(cita)) {
                    eliminarCita(cita.ID)
                  }
                }}
                className="rounded-xl border border-red-600/50 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-600/10"
              >
                Eliminar
              </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
            disabled={!contexto?.esAdmin && Boolean(contexto?.empleadoId)}
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
