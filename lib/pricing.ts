import type { PricingConfig, Reservation } from "./types"
import { isWeekend } from "./date-utils"

export function computeReservationTotal(
  input: Omit<Reservation, "total" | "esFinDeSemana" | "creadoEn" | "id" | "deletedAt" | "cantidades"> & {
    cantidades: Record<string, number | { cantidad: number; precioUnitarioFijo: number }>;
    tipo?: "salon" | "patio" | "migrada"
    incluirLimpieza?: boolean
    costoLimpieza?: number
    precioBaseFijo?: number
    precioPorPersonaFijo?: number
    extrasFijosTotalFijo?: number
    cantidadesTotalFijo?: number
    descuentoPorcentaje?: number
  },
  config: PricingConfig,
) {
  const weekend = isWeekend(input.fecha)
  
  // Determine base price - use fixed price if available, otherwise calculate from config
  let base = 0;
  if (input.precioBaseFijo !== undefined && input.precioBaseFijo > 0) {
    // Use the fixed price stored in the reservation
    base = input.precioBaseFijo;
  } else if (input.tipo === "patio") {
    base = config.precioPatio || 0; // Use specific patio price, default to 0 if not set
  } else {
    base = weekend ? config.baseFinDeSemana : config.baseEntreSemana;
  }

  // Determine per-person price - use fixed price if available, otherwise calculate from config
  const perPerson = input.precioPorPersonaFijo !== undefined && input.precioPorPersonaFijo > 0
    ? input.precioPorPersonaFijo
    : (weekend ? config.precioPorPersonaFinDeSemana : config.precioPorPersonaEntreSemana)

  
    // Calculate extras total - use fixed price if available, otherwise calculate from config
    let extrasFijosTotal = 0;
    if (input.extrasFijosTotalFijo !== undefined && input.extrasFijosTotalFijo > 0) {
      // Use the fixed price stored in the reservation
      extrasFijosTotal = input.extrasFijosTotalFijo;
    } else {
      extrasFijosTotal = input.extrasFijosSeleccionados.reduce((acc, id) => {
        const extra = config.extrasFijos.find((e) => e.id === id)
        return acc + (extra ? extra.precio : 0)
      }, 0)
    }
    if (input.tipo === "patio") extrasFijosTotal = 0;
  
    // Calculate quantities total - use fixed price if available, otherwise calculate from config
    let cantidadesTotal = 0;
    if (input.cantidadesTotalFijo !== undefined && input.cantidadesTotalFijo > 0) {
      // Use the fixed price stored in the reservation
      cantidadesTotal = input.cantidadesTotalFijo;
    } else {
      cantidadesTotal = Object.entries(input.cantidades).reduce((acc, [id, data]) => {
        if (typeof data === "object" && data !== null && "precioUnitarioFijo" in data) {
          const itemData = data as { cantidad: number; precioUnitarioFijo: number }
          return acc + itemData.cantidad * itemData.precioUnitarioFijo
        }

        if (typeof data === "number") {
          const item = config.itemsPorCantidad.find((i) => i.id === id)
          return acc + (item ? item.precioUnitario * data : 0)
        }

        return acc
      }, 0)
    }
    if (input.tipo === "patio") cantidadesTotal = 0;
  // Calculate cleaning cost if applicable
  let limpieza = 0;
  if (input.tipo === "salon") {
    if (input.incluirLimpieza && input.costoLimpieza !== undefined && input.costoLimpieza > 0) {
      limpieza = input.costoLimpieza;
    } else if (input.incluirLimpieza && config.costoLimpiezaFijo > 0) {
      // Fallback to default if specific cost is not provided but included
      limpieza = config.costoLimpiezaFijo;
    }
  }

  const totalSinDescuento = base + input.cantidadPersonas * perPerson + extrasFijosTotal + cantidadesTotal;
  
  // Aplicar descuento si existe
  const descuentoPorcentaje = input.descuentoPorcentaje || 0;
  const montoDescuento = (totalSinDescuento * descuentoPorcentaje) / 100;
  const totalConDescuento = totalSinDescuento - montoDescuento;
 
  return {
    total: totalConDescuento,
    totalSinDescuento,
    totalConDescuento,
    esFinDeSemana: weekend,
    breakdown: {
      base,
      perPerson,
      extrasFijosTotal,
      cantidadesTotal,
      patio: input.tipo === "patio" ? config.precioPatio || 0 : 0,
    },
    costoLimpieza: limpieza, // The actual cleaning cost (for internal profit calculation)
  }
}
