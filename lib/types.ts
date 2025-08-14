export type DayStatus = "libre" | "interesado" | "señado" | "confirmado" | "trashed"

export type FixedExtra = {
  id: string
  nombre: string
  precio: number
}

export type QuantityItem = {
  id: string
  nombre: string
  precioUnitario: number
}

export type PricingConfig = {
  baseEntreSemana: number
  baseFinDeSemana: number
  precioPorPersonaEntreSemana: number
  precioPorPersonaFinDeSemana: number
  costoLimpiezaFijo: number // Este es un gasto del negocio, no se suma al cliente
  extrasFijos: FixedExtra[]
  itemsPorCantidad: QuantityItem[]
}

export type Reservation = {
  id: string
  nombreCliente: string
  fecha: string // ISO date YYYY-MM-DD
  cantidadPersonas: number
  extrasFijosSeleccionados: string[] // ids de FixedExtra
  cantidades: Record<string, number> // id de QuantityItem -> cantidad
  estado: DayStatus // interesado, señado, confirmado, trashed
  esFinDeSemana: boolean
  total: number // Total a cobrar al cliente
  creadoEn: string
  notas?: string // Nueva nota para el evento
  deletedAt?: string | null // Para la papelera de reciclaje
  tipo?: "normal" | "migrada" // Adding tipo field to distinguish migrated reservations
}

export type Expense = {
  id: string
  nombre: string
  monto: number
  fecha: string // ISO date
}

export type AppStateShape = {
  reservas: Reservation[]
  gastos: Expense[]
  config: PricingConfig
}
