export type PlanOboroId = 'basico' | 'pro' | 'business'

export type PlanOboro = {
  id: PlanOboroId
  nombre: string
  precio: string
  precioCop: number
  recomendado: boolean
  detalle: string
  limites: {
    administradores: number
    empleados: number
    accesosEquipo: number
  }
  funciones: string[]
}

export const PLANES_OBORO: PlanOboro[] = [
  {
    id: 'basico',
    nombre: 'Basico',
    precio: '$70.000 COP / mes',
    precioCop: 70000,
    recomendado: false,
    detalle: 'Para negocios que quieren ordenar su agenda y dejar de manejar citas en papel.',
    limites: {
      administradores: 1,
      empleados: 2,
      accesosEquipo: 1,
    },
    funciones: [
      '1 administrador principal incluido',
      'Hasta 2 empleados o colaboradores',
      '1 acceso adicional de lectura',
      'Clientes, servicios, empleados y citas',
      'Dashboard de reservas',
      'WhatsApp manual al cliente',
      'Soporte inicial de Oboro Lab',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: '$90.000 COP / mes',
    precioCop: 90000,
    recomendado: true,
    detalle: 'El plan mas equilibrado para negocios que quieren vender mas y ahorrar tiempo.',
    limites: {
      administradores: 1,
      empleados: 5,
      accesosEquipo: 3,
    },
    funciones: [
      'Todo lo del plan Basico',
      '1 administrador principal incluido',
      'Hasta 5 empleados o colaboradores',
      'Hasta 3 accesos adicionales para equipo',
      'QR publico para que el cliente agende solo',
      'Links de confirmar y cancelar cita',
      'Recordatorio automatico al negocio',
    ],
  },
  {
    id: 'business',
    nombre: 'Business',
    precio: '$120.000 COP / mes',
    precioCop: 120000,
    recomendado: false,
    detalle: 'Para negocios con equipo, comisiones, gastos y mas control administrativo.',
    limites: {
      administradores: 1,
      empleados: 10,
      accesosEquipo: 6,
    },
    funciones: [
      'Todo lo del plan Pro',
      '1 administrador financiero incluido',
      'Hasta 10 empleados o colaboradores',
      'Hasta 6 accesos adicionales para equipo',
      'Modulo de finanzas',
      'Registro de gastos',
      'Liquidacion de colaboradores',
    ],
  },
]

export function normalizarPlanOboro(plan?: string | null): PlanOboroId {
  const valor = String(plan ?? '').toLowerCase()

  if (valor === 'business' || valor === 'premium') return 'business'
  if (valor === 'pro') return 'pro'

  return 'basico'
}

export function obtenerPlanOboro(plan?: string | null) {
  const id = normalizarPlanOboro(plan)

  return PLANES_OBORO.find((item) => item.id === id) ?? PLANES_OBORO[0]
}
