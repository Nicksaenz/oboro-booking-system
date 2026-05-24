'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { mensajePermiso, obtenerContextoEquipo, type ContextoEquipo } from '@/lib/equipo'

type Cliente = {
  id: string
  Nombre: string | null
  Numero: string | null
  Email: string | null
  Notas: string | null
}

type FormularioCliente = {
  nombre: string
  numero: string
  email: string
  notas: string
}

const FORMULARIO_INICIAL: FormularioCliente = {
  nombre: '',
  numero: '',
  email: '',
  notas: '',
}

function normalizarTelefono(valor: string | null) {
  const digitos = String(valor ?? '').replace(/\D/g, '')

  if (!digitos) return ''
  if (digitos.startsWith('57')) return digitos
  if (digitos.length === 10) return `57${digitos}`

  return digitos
}

export default function ClientesPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [formulario, setFormulario] = useState<FormularioCliente>(FORMULARIO_INICIAL)
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [contexto, setContexto] = useState<ContextoEquipo | null>(null)

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    if (!termino) return clientes

    return clientes.filter((cliente) =>
      [cliente.Nombre, cliente.Numero, cliente.Email, cliente.Notas]
        .join(' ')
        .toLowerCase()
        .includes(termino)
    )
  }, [busqueda, clientes])

  const clientesConWhatsApp = clientes.filter((cliente) =>
    Boolean(normalizarTelefono(cliente.Numero))
  ).length

  const clientesConEmail = clientes.filter((cliente) =>
    Boolean(cliente.Email?.trim())
  ).length

  function actualizarCampo(campo: keyof FormularioCliente, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }))
  }

  async function cargarClientes() {
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

    const { data, error } = await supabase
      .from('Clientes')
      .select('*')
      .eq('usuario_id', acceso.negocioId)
      .order('Nombre', { ascending: true })

    if (error) {
      setMensaje(`Error: ${error.message}`)
    } else {
      setClientes(data ?? [])
    }

    setCargando(false)
  }

  async function guardarCliente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    const acceso = contexto ?? (await obtenerContextoEquipo())

    if (!acceso?.puedeOperar) {
      setMensaje(mensajePermiso('crear o editar clientes'))
      setGuardando(false)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
      router.push('/login')
      return
    }

    const payload = {
      Nombre: formulario.nombre.trim(),
      Numero: formulario.numero.trim(),
      Email: formulario.email.trim(),
      Notas: formulario.notas.trim(),
      usuario_id: acceso.negocioId,
    }

    const operacion = clienteEditando
      ? supabase.from('Clientes').update(payload).eq('id', clienteEditando.id)
      : supabase.from('Clientes').insert([payload])

    const { error } = await operacion

    if (error) {
      setMensaje(`Error: ${error.message}`)
      setGuardando(false)
      return
    }

    setMensaje(clienteEditando ? 'Cliente actualizado correctamente.' : 'Cliente guardado correctamente.')
    setFormulario(FORMULARIO_INICIAL)
    setClienteEditando(null)
    setGuardando(false)
    cargarClientes()
  }

  function editarCliente(cliente: Cliente) {
    if (!contexto?.puedeOperar) {
      setMensaje(mensajePermiso('editar clientes'))
      return
    }

    setClienteEditando(cliente)
    setFormulario({
      nombre: cliente.Nombre ?? '',
      numero: cliente.Numero ?? '',
      email: cliente.Email ?? '',
      notas: cliente.Notas ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setClienteEditando(null)
    setFormulario(FORMULARIO_INICIAL)
  }

  async function eliminarCliente(cliente: Cliente) {
    if (!contexto?.esAdmin) {
      setMensaje('Solo el administrador puede eliminar clientes.')
      return
    }

    const confirmar = window.confirm(
      `Seguro que deseas eliminar a ${cliente.Nombre ?? 'este cliente'}?`
    )

    if (!confirmar) return

    const { error } = await supabase.from('Clientes').delete().eq('id', cliente.id)

    if (error) {
      setMensaje(`No se pudo eliminar. Si tiene citas creadas, primero elimina o reasigna esas citas. ${error.message}`)
      return
    }

    setMensaje('Cliente eliminado correctamente.')
    cargarClientes()
  }

  function abrirWhatsApp(cliente: Cliente) {
    const telefono = normalizarTelefono(cliente.Numero)

    if (!telefono) {
      setMensaje('Este cliente no tiene un WhatsApp valido.')
      return
    }

    window.open(`https://wa.me/${telefono}`, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[4px] text-orange-500">
              OBORO BOOKING
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
              Clientes
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Centraliza contactos, notas y WhatsApp para atender mejor y
              agendar mas rapido.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-orange-600/30 bg-zinc-950 p-3 shadow-2xl shadow-orange-950/20 sm:min-w-[420px]">
            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-xs text-zinc-500">Total</p>
              <p className="mt-1 text-2xl font-black text-orange-500">{clientes.length}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-xs text-zinc-500">WhatsApp</p>
              <p className="mt-1 text-2xl font-black text-green-400">{clientesConWhatsApp}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-xs text-zinc-500">Email</p>
              <p className="mt-1 text-2xl font-black text-zinc-100">{clientesConEmail}</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={guardarCliente}
          className="mt-8 rounded-2xl border border-orange-600/30 bg-zinc-950/80 p-4 shadow-2xl shadow-orange-950/20 sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none transition focus:border-orange-400"
              placeholder="Nombre del cliente"
              value={formulario.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              required
            />

            <input
              className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none transition focus:border-orange-400"
              placeholder="WhatsApp, ej: 3104040859"
              value={formulario.numero}
              onChange={(e) => actualizarCampo('numero', e.target.value)}
              required
            />

            <input
              className="min-h-12 rounded-xl border border-orange-600/50 bg-black p-4 outline-none transition focus:border-orange-400"
              placeholder="Correo electronico"
              type="email"
              value={formulario.email}
              onChange={(e) => actualizarCampo('email', e.target.value)}
            />

            <button
              type="submit"
              disabled={guardando || !contexto?.puedeOperar}
              className="min-h-12 rounded-xl bg-orange-600 px-5 py-4 font-bold transition hover:bg-orange-700 disabled:opacity-60"
            >
              {guardando
                ? 'Guardando...'
                : !contexto?.puedeOperar
                  ? 'Solo lectura'
                : clienteEditando
                  ? 'Guardar cambios'
                  : 'Guardar cliente'}
            </button>
          </div>

          <textarea
            className="mt-3 min-h-24 w-full rounded-xl border border-orange-600/50 bg-black p-4 outline-none transition focus:border-orange-400"
            placeholder="Notas importantes: preferencias, alergias, historial, gustos o pendientes."
            value={formulario.notas}
            onChange={(e) => actualizarCampo('notas', e.target.value)}
          />

          {clienteEditando && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className="mt-3 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:border-orange-500 hover:text-orange-300"
            >
              Cancelar edicion
            </button>
          )}
        </form>

        {mensaje && (
          <p className="mt-5 rounded-xl border border-orange-500/40 bg-orange-950/20 px-4 py-3 text-sm text-orange-200">
            {mensaje}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Base de clientes</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Busca por nombre, WhatsApp, correo o notas.
            </p>
          </div>
          <input
            className="min-h-12 w-full rounded-xl border border-zinc-800 bg-black p-4 outline-none transition focus:border-orange-500 sm:max-w-sm"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {cargando ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
            Cargando clientes...
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-orange-600/40 bg-zinc-950 p-8 text-center">
            <h2 className="text-2xl font-bold text-orange-500">
              Aun no hay clientes visibles
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Crea tu primer cliente o cambia el filtro de busqueda.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {clientesFiltrados.map((cliente) => (
              <article
                key={cliente.id}
                className="flex min-h-[260px] flex-col rounded-2xl border border-orange-600/35 bg-zinc-950 p-5 shadow-lg shadow-orange-950/20 transition hover:border-orange-500/70"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-orange-500">
                      {cliente.Nombre || 'Cliente sin nombre'}
                    </h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[2px] text-zinc-600">
                      Cliente registrado
                    </p>
                  </div>
                  <span className="rounded-full border border-green-600/40 bg-green-950/20 px-3 py-1 text-xs font-bold text-green-300">
                    Activo
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <p className="rounded-xl border border-zinc-800 bg-black px-4 py-3">
                    <span className="text-zinc-500">WhatsApp: </span>
                    <span className="font-bold text-zinc-100">{cliente.Numero || 'Sin numero'}</span>
                  </p>
                  <p className="rounded-xl border border-zinc-800 bg-black px-4 py-3">
                    <span className="text-zinc-500">Email: </span>
                    <span className="font-bold text-zinc-100">{cliente.Email || 'Sin correo'}</span>
                  </p>
                </div>

                {cliente.Notas && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-400">
                    {cliente.Notas}
                  </p>
                )}

                <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => abrirWhatsApp(cliente)}
                    className="min-h-11 rounded-xl border border-green-600/60 px-3 py-2 text-sm font-bold text-green-200 transition hover:bg-green-600/10"
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => editarCliente(cliente)}
                    className="min-h-11 rounded-xl border border-orange-600/60 px-3 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-600/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarCliente(cliente)}
                    className="min-h-11 rounded-xl border border-red-600/60 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-600/10"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
