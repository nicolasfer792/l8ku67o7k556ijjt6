import type { PricingConfig, Reservation } from "./types"
import { isWeekend } from "./date-utils"

export function computeReservationTotal(
  input: Omit<Reservation, "total" | "esFinDeSemana" | "creadoEn" | "id" | "deletedAt">,
  config: PricingConfig,
) {
  const weekend = isWeekend(input.fecha)
  const base = weekend ? config.baseFinDeSemana : config.baseEntreSemana
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

  // La limpieza ya NO se suma al total del cliente, es un gasto del negocio.
  // const limpieza = config.costoLimpiezaFijo;

  const total = base + input.cantidadPersonas * perPerson + extrasFijosTotal + cantidadesTotal

  return {
    total,
    esFinDeSemana: weekend,
    breakdown: {
      base,
      perPerson,
      extrasFijosTotal,
      cantidadesTotal,
      limpieza: config.costoLimpiezaFijo, // Se mantiene para mostrar en el desglose, pero no suma al total del cliente
    },
  }
}
