import type { PricingConfig, Reservation } from "./types"
import { isWeekend } from "./date-utils"

export function computeReservationTotal(
  input: Omit<Reservation, "total" | "esFinDeSemana" | "creadoEn" | "id" | "deletedAt"> & {
    tipo?: "salon" | "patio" | "migrada"
    incluirLimpieza?: boolean
    costoLimpieza?: number
  },
  config: PricingConfig,
) {
  const weekend = isWeekend(input.fecha)
  
  // Determine base price based on type and day of the week
  let base = 0;
  if (input.tipo === "patio") {
    base = config.precioPatio || 0; // Use specific patio price, default to 0 if not set
  } else {
    base = weekend ? config.baseFinDeSemana : config.baseEntreSemana;
  }

  const perPerson = weekend ? config.precioPorPersonaFinDeSemana : config.precioPorPersonaEntreSemana

  const extrasFijosTotal = input.extrasFijosSeleccionados.reduce((acc, id) => {
    const extra = config.extrasFijos.find((e) => e.id === id)
    return acc + (extra ? extra.precio : 0)
  }, 0)

  const cantidadesTotal = Object.entries(input.cantidades).reduce((acc, [id, qty]) => {
    const item = config.itemsPorCantidad.find((i) => i.id === id)
    const cantidad = typeof qty === "number" && !isNaN(qty) ? qty : 0
    return acc + (item ? item.precioUnitario * cantidad : 0)
  }, 0)

  // Calculate cleaning cost if applicable
  let limpieza = 0;
  if (input.incluirLimpieza && input.costoLimpieza !== undefined && input.costoLimpieza > 0) {
    limpieza = input.costoLimpieza;
  } else if (input.incluirLimpieza && config.costoLimpiezaFijo > 0) {
    // Fallback to default if specific cost is not provided but included
    limpieza = config.costoLimpiezaFijo;
  }

  const total = base + input.cantidadPersonas * perPerson + extrasFijosTotal + cantidadesTotal + limpieza;
 
  return {
    total,
    esFinDeSemana: weekend,
    breakdown: {
      base,
      perPerson,
      extrasFijosTotal,
      cantidadesTotal,
      limpieza: limpieza, // The actual cleaning cost added to the total
    },
  }
}
