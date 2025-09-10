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
  precioPatio: number // Precio base para el patio
  costoLimpiezaFijo: number // Este es un gasto del negocio, no se suma al cliente
  extrasFijos: FixedExtra[]
  itemsPorCantidad: QuantityItem[]
  // Flags de visibilidad/uso de funciones
  enableExtrasFijos?: boolean
  enableItemsPorCantidad?: boolean
  enableDescuento?: boolean
  enableCostoExtra?: boolean
}

export type Reservation = {
  id: string
  nombreCliente: string
  fecha: string // ISO date YYYY-MM-DD
  cantidadPersonas: number
  extrasFijosSeleccionados: string[] // ids de FixedExtra
  cantidades: Record<string, { cantidad: number; precioUnitarioFijo: number }> // id de QuantityItem -> { cantidad, precioUnitarioFijo }
  estado: DayStatus // interesado, señado, confirmado, trashed
  esFinDeSemana: boolean
  total: number // Total a cobrar al cliente
  creadoEn: string
  notas?: string // Nueva nota para el evento
  deletedAt?: string | null // Para la papelera de reciclaje
  tipo?: "salon" | "patio" | "migrada" // Tipo de reserva: salon, patio, o migrada
  incluirLimpieza: boolean // Indica si se incluye el costo de limpieza
  costoLimpieza: number // Costo de limpieza específico para esta reserva
  precioBaseFijo?: number
  precioPorPersonaFijo?: number
  extrasFijosTotalFijo?: number
  cantidadesTotalFijo?: number
  telefono?: string // Número de teléfono del cliente
  // Campos para el estado de pago
  pagado?: number // Monto total pagado por el cliente
  pagadoEn?: Array<{
    fecha: string
    monto: number
  }> // Registro de pagos con fecha y monto
  // Campos para descuentos
  descuentoPorcentaje?: number // Porcentaje de descuento aplicado (0-100)
  totalConDescuento?: number // Total final con descuento aplicado

  // Nuevo: costo extra (cargo adicional directo al cliente)
  costoExtra?: number
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
  clientNameFilter?: string
}
