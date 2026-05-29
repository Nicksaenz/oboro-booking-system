export type CitaBloqueo = {
  Fecha: string
  Hora: string
  Estado?: string | null
  ID_Empleado?: string | null
}

export type HorarioDisponible = {
  fecha: string
  hora: string
  label: string
}

const DIAS_ADELANTE = 21
const HORA_INICIO = 8
const HORA_FIN = 18
const INTERVALO_MINUTOS = 30
const ESTADOS_BLOQUEADOS = new Set(['pendiente', 'confirmada'])

function fechaBogota(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function diaSemanaBogota(date: Date) {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    weekday: 'short',
  }).format(date)

  return value
}

function sumarDias(date: Date, dias: number) {
  const siguiente = new Date(date)
  siguiente.setDate(siguiente.getDate() + dias)
  return siguiente
}

function formatoHora(totalMinutos: number) {
  const horas = Math.floor(totalMinutos / 60)
  const minutos = totalMinutos % 60

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
}

function normalizarHora(hora: string) {
  return hora.length >= 5 ? hora.slice(0, 5) : hora
}

export function construirDisponibilidad({
  empleadoId,
  citas,
  fechaBase = new Date(),
}: {
  empleadoId: string
  citas: CitaBloqueo[]
  fechaBase?: Date
}) {
  const hoy = fechaBogota(fechaBase)
  const ocupadas = new Set(
    citas
      .filter((cita) => {
        if (cita.ID_Empleado && cita.ID_Empleado !== empleadoId) return false
        if (!ESTADOS_BLOQUEADOS.has(String(cita.Estado ?? '').toLowerCase())) return false
        return true
      })
      .map((cita) => `${cita.Fecha} ${normalizarHora(cita.Hora)}`)
  )
  const disponibilidad: HorarioDisponible[] = []

  for (let dia = 0; dia < DIAS_ADELANTE; dia += 1) {
    const fechaDate = sumarDias(fechaBase, dia)
    const weekday = diaSemanaBogota(fechaDate)

    if (weekday === 'Sun') continue

    const fecha = fechaBogota(fechaDate)

    for (
      let minutos = HORA_INICIO * 60;
      minutos < HORA_FIN * 60;
      minutos += INTERVALO_MINUTOS
    ) {
      const hora = formatoHora(minutos)

      if (fecha === hoy) {
        const ahora = new Date()
        const slot = new Date(`${fecha}T${hora}:00-05:00`)

        if (slot.getTime() <= ahora.getTime() + 30 * 60_000) continue
      }

      if (ocupadas.has(`${fecha} ${hora}`)) continue

      disponibilidad.push({
        fecha,
        hora,
        label: `${fecha} ${hora}`,
      })
    }
  }

  return disponibilidad
}

export function horarioEstaDisponible({
  empleadoId,
  fecha,
  hora,
  citas,
}: {
  empleadoId: string
  fecha: string
  hora: string
  citas: CitaBloqueo[]
}) {
  return construirDisponibilidad({ empleadoId, citas }).some(
    (slot) => slot.fecha === fecha && slot.hora === normalizarHora(hora)
  )
}
