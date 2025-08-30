"use client"

import React from "react"
import type { AppStateShape, Expense, PricingConfig, Reservation, DayStatus } from "@/lib/types"
import {
  addExpenseAction,
  createReservation,
  fetchInitialData,
  listReservationsByMonthAction,
  listTrashedReservationsAction,
  purgeOldTrashedReservationsAction,
  recoverReservationAction,
  saveConfigAction,
  trashReservationAction, // Nueva acción para enviar a papelera
  updateReservationStatusByDate,
  updateReservation,
  deleteReservationPermanentlyAction, // Declaración de la variable
  deleteExpenseAction, // Declaración de la variable
  recalculateReservationTotals,
} from "@/app/actions"
import { toast } from "@/hooks/use-toast"

type Ctx = {
  state: AppStateShape
  refresh: () => Promise<void>
  addReserva: (
    payload: Omit<Reservation, "id" | "total" | "esFinDeSemana" | "creadoEn" | "deletedAt"> & {
      precioBaseFijo: number
      precioPorPersonaFijo: number
      extrasFijosTotalFijo: number
      cantidadesTotalFijo: number
      descuentoPorcentaje?: number
    },
  ) => Promise<Reservation>
  actualizarEstadoDia: (fechaISO: string, estado: DayStatus) => Promise<void>
  updateReserva: (
    id: string,
    payload: Omit<Reservation, "id" | "total" | "esFinDeSemana" | "creadoEn" | "deletedAt"> & {
      precioBaseFijo: number
      precioPorPersonaFijo: number
      extrasFijosTotalFijo: number
      cantidadesTotalFijo: number
      descuentoPorcentaje?: number
    },
  ) => Promise<Reservation>
  enviarReservaAPapelera: (id: string) => Promise<void> // Nueva
  recuperarReserva: (id: string) => Promise<void> // Nueva
  eliminarReservaPermanentemente: (id: string) => Promise<void> // Nueva
  limpiarPapeleraAntigua: () => Promise<void> // Nueva
  guardarConfig: (cfg: PricingConfig) => Promise<void>
  agregarGasto: (g: Omit<Expense, "id">) => Promise<void>
  eliminarGasto: (id: string) => Promise<void>
  reservasPorFecha: (fechaISO: string) => Reservation[]
  listReservationsByMonth: (yyyyMM: string, includeTrashed?: boolean) => Promise<Reservation[]>
  listTrashedReservations: () => Promise<Reservation[]> // Nueva
}

const AtilaContext = React.createContext<Ctx | null>(null)

export function AtilaProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppStateShape>({
    reservas: [],
    gastos: [],
    config: {
      baseEntreSemana: 0,
      baseFinDeSemana: 0,
      precioPorPersonaEntreSemana: 0,
      precioPorPersonaFinDeSemana: 0,
      precioPatio: 0, // Precio base para el patio
      costoLimpiezaFijo: 0, // Este es un gasto del negocio, no se suma al cliente
      extrasFijos: [],
      itemsPorCantidad: [],
    },
  })

  const refresh = React.useCallback(async () => {
    const data = await fetchInitialData()
    setState(data)
  }, [])

  React.useEffect(() => {
    refresh().catch((e) => {
      console.error("Error al cargar datos iniciales:", e)
      toast({
        title: "Error al cargar datos",
        description: e.message || "Ocurrió un error desconocido al conectar con la base de datos.",
        variant: "destructive",
      })
    })
  }, [refresh])

  const addReserva: Ctx["addReserva"] = async (payload) => {
    try {
      const cantidadesConPrecio = Object.entries(payload.cantidades).reduce(
        (acc, [id, cantidad]) => {
          const item = state.config.itemsPorCantidad.find((i) => i.id === id)
          if (item) {
            acc[id] = {
              cantidad: (cantidad as any).cantidad as number,
              precioUnitarioFijo: item.precioUnitario,
            }
          }
          return acc
        },
        {} as Record<string, { cantidad: number; precioUnitarioFijo: number }>,
      )

      const saved = await createReservation({
        ...payload,
        cantidades: cantidadesConPrecio,
        precioBaseFijo: payload.precioBaseFijo,
        precioPorPersonaFijo: payload.precioPorPersonaFijo,
        extrasFijosTotalFijo: payload.extrasFijosTotalFijo,
        cantidadesTotalFijo: payload.cantidadesTotalFijo,
        descuentoPorcentaje: (payload as any).descuentoPorcentaje || 0,
      })
      // Después de crear la reserva (y su gasto de limpieza asociado),
      // refrescamos todo el estado para que los gráficos se actualicen con los nuevos gastos.
      await refresh()
      toast({ title: "Reserva creada", description: `Total: ${saved.total.toLocaleString("es-AR")}` })
      return saved
    } catch (error: any) {
      console.error("Error detallado al crear reserva:", error)
      toast({
        title: "Error al crear reserva",
        description:
          error.message ||
          (error.code ? `Código: ${error.code}` : "") +
            (error.details ? ` Detalles: ${error.details}` : "") +
            (error.hint ? ` Sugerencia: ${error.hint}` : "") +
            " Ocurrió un error desconocido.",
        variant: "destructive",
      })
      throw error // Re-lanzar el error para que el formulario pueda manejarlo si es necesario
    }
  }

  const actualizarEstadoDia: Ctx["actualizarEstadoDia"] = async (fechaISO, estado) => {
    const saved = await updateReservationStatusByDate(fechaISO, estado)
    setState((s) => {
      const others = s.reservas.filter((r) => r.id !== saved.id)
      return { ...s, reservas: [...others, saved] }
    })
  }

  const updateReserva: Ctx["updateReserva"] = async (id, payload) => {
    try {
      const updated = await updateReservation(id, {
        ...payload,
        precioBaseFijo: payload.precioBaseFijo,
        precioPorPersonaFijo: payload.precioPorPersonaFijo,
        extrasFijosTotalFijo: payload.extrasFijosTotalFijo,
        cantidadesTotalFijo: payload.cantidadesTotalFijo,
        descuentoPorcentaje: (payload as any).descuentoPorcentaje,
      })
      await refresh() // Refresh all data to ensure consistency
      toast({ title: "Reserva actualizada", description: `Total: ${updated.total.toLocaleString("es-AR")}` })
      return updated
    } catch (error: any) {
      console.error("Error detallado al actualizar reserva:", error)
      toast({
        title: "Error al actualizar reserva",
        description: error.message || "Ocurrió un error desconocido.",
        variant: "destructive",
      })
      throw error
    }
  }

  const enviarReservaAPapelera: Ctx["enviarReservaAPapelera"] = async (id) => {
    const trashed = await trashReservationAction(id)
    setState((s) => ({ ...s, reservas: s.reservas.filter((r) => r.id !== id) })) // Quitar de activas
    toast({ title: "Reserva enviada a papelera", description: "Se eliminará permanentemente en 7 días." })
  }

  const recuperarReserva: Ctx["recuperarReserva"] = async (id) => {
    const recovered = await recoverReservationAction(id)
    setState((s) => ({ ...s, reservas: [...s.reservas, recovered] })) // Añadir a activas
    toast({ title: "Reserva recuperada" })
  }

  const eliminarReservaPermanentemente: Ctx["eliminarReservaPermanentemente"] = async (id) => {
    await deleteReservationPermanentlyAction(id)
    // No actualizamos el estado local aquí, ya que se usa en la papelera que refresca su propia lista
    toast({ title: "Reserva eliminada permanentemente" })
  }

  const limpiarPapeleraAntigua: Ctx["limpiarPapeleraAntigua"] = async () => {
    await purgeOldTrashedReservationsAction()
    toast({ title: "Papelera limpiada", description: "Reservas antiguas eliminadas." })
  }


  const guardarConfig: Ctx["guardarConfig"] = async (cfg) => {
    try {
      await saveConfigAction(cfg)
      setState((s) => ({ ...s, config: { ...cfg } }))
      toast({ title: "Configuración guardada", description: "Los cambios se han guardado en la base de datos." })
    } catch (error: any) {
      console.error("Error detallado al guardar configuración:", error)
      toast({
        title: "Error al guardar configuración",
        description:
          error.message ||
          (error.code ? `Código: ${error.code}` : "") +
            (error.details ? ` Detalles: ${error.details}` : "") +
            (error.hint ? ` Sugerencia: ${error.hint}` : "") +
            " Ocurrió un error desconocido.",
        variant: "destructive",
      })
      throw error // Re-lanzar el error
    }
  }

  const agregarGasto: Ctx["agregarGasto"] = async (g) => {
    const saved = await addExpenseAction(g)
    setState((s) => ({ ...s, gastos: [...s.gastos, saved] }))
    toast({ title: "Gasto agregado" })
  }

  const eliminarGasto: Ctx["eliminarGasto"] = async (id) => {
    await deleteExpenseAction(id)
    setState((s) => ({ ...s, gastos: s.gastos.filter((e) => e.id !== id) }))
    toast({ title: "Gasto eliminado" })
  }

  const reservasPorFecha: Ctx["reservasPorFecha"] = (fechaISO) => state.reservas.filter((r) => r.fecha === fechaISO)

  const listReservationsByMonth: Ctx["listReservationsByMonth"] = async (yyyyMM, includeTrashed = false) => {
    return await listReservationsByMonthAction(yyyyMM, includeTrashed)
  }

  const listTrashedReservations: Ctx["listTrashedReservations"] = async () => {
    return await listTrashedReservationsAction()
  }

  const value: Ctx = {
    state,
    refresh,
    addReserva,
    actualizarEstadoDia,
    updateReserva,
    enviarReservaAPapelera,
    recuperarReserva,
    eliminarReservaPermanentemente,
    limpiarPapeleraAntigua,
    guardarConfig,
    agregarGasto,
    eliminarGasto,
    reservasPorFecha,
    listReservationsByMonth,
    listTrashedReservations,
  }

  return <AtilaContext.Provider value={value}>{children}</AtilaContext.Provider>
}

export function useAtila() {
  const ctx = React.useContext(AtilaContext)
  if (!ctx) throw new Error("useAtila debe usarse dentro de AtilaProvider")
  return ctx
}
