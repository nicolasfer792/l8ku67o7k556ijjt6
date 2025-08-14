"use server"

import { getSupabaseServer } from "@/lib/supabase/server"
import type { AppStateShape, Expense, PricingConfig, Reservation, DayStatus } from "@/lib/types"
import { computeReservationTotal } from "@/lib/pricing"
import { isWeekend } from "@/lib/date-utils"

// Helpers de mapeo entre DB y tipos
function mapRowToReservation(row: any): Reservation {
  return {
    id: row.id,
    nombreCliente: row.nombre_cliente,
    fecha: row.fecha,
    cantidadPersonas: row.cantidad_personas,
    extrasFijosSeleccionados: row.extras_fijos_seleccionados ?? [],
    cantidades: row.cantidades ?? {},
    estado: row.estado,
    esFinDeSemana: row.es_fin_de_semana,
    total: Number(row.total || 0),
    creadoEn: row.creado_en,
    notas: row.notas ?? undefined,
    deletedAt: row.deleted_at ?? null,
    tipo: row.tipo ?? "normal", // Adding tipo field to distinguish migrated reservations
  }
}
function mapRowToExpense(row: any): Expense {
  return {
    id: row.id,
    nombre: row.nombre,
    monto: Number(row.monto),
    fecha: row.fecha,
  }
}
function mapRowToConfig(row: any): PricingConfig {
  return {
    baseEntreSemana: Number(row.base_entre_semana),
    baseFinDeSemana: Number(row.base_fin_de_semana),
    precioPorPersonaEntreSemana: Number(row.precio_por_persona_entre_semana),
    precioPorPersonaFinDeSemana: Number(row.precio_por_persona_fin_de_semana),
    costoLimpiezaFijo: Number(row.costo_limpieza_fijo),
    extrasFijos: (row.extras_fijos || []) as PricingConfig["extrasFijos"],
    itemsPorCantidad: (row.items_por_cantidad || []) as PricingConfig["itemsPorCantidad"],
  }
}

export async function fetchInitialData(): Promise<AppStateShape> {
  const supabase = getSupabaseServer()

  // Config: si no existe, creamos una por defecto
  const { data: cfgRows, error: cfgErr } = await supabase
    .from("pricing_config")
    .select("*")
    .eq("id", "singleton") // <-- Aseguramos que siempre busque el ID 'singleton'
    .limit(1)
  if (cfgErr) {
    console.error("Error al cargar configuración inicial:", cfgErr)
    throw new Error(`Error al cargar configuración: ${cfgErr.message}`)
  }

  let config: PricingConfig
  if (!cfgRows || cfgRows.length === 0) {
    // crea por defecto
    const defaultCfg: PricingConfig = {
      baseEntreSemana: 100000,
      baseFinDeSemana: 140000,
      precioPorPersonaEntreSemana: 3000,
      precioPorPersonaFinDeSemana: 4000,
      costoLimpiezaFijo: 20000,
      extrasFijos: [
        { id: "vajillas", nombre: "Vajillas", precio: 15000 },
        { id: "sonido", nombre: "Equipo de sonido", precio: 22000 },
        { id: "decoracion", nombre: "Decoración básica", precio: 18000 },
      ],
      itemsPorCantidad: [
        { id: "vasos", nombre: "Vasos", precioUnitario: 120 },
        { id: "sillas", nombre: "Sillas", precioUnitario: 300 },
        { id: "manteles", nombre: "Manteles", precioUnitario: 800 },
      ],
    }
    const { error: insErr } = await supabase.from("pricing_config").insert({
      id: "singleton", // Usar un ID fijo para el singleton
      base_entre_semana: defaultCfg.baseEntreSemana,
      base_fin_de_semana: defaultCfg.baseFinDeSemana,
      precio_por_persona_entre_semana: defaultCfg.precioPorPersonaEntreSemana,
      precio_por_persona_fin_de_semana: defaultCfg.precioPorPersonaFinDeSemana,
      costo_limpieza_fijo: defaultCfg.costoLimpiezaFijo,
      extras_fijos: defaultCfg.extrasFijos,
      items_por_cantidad: defaultCfg.itemsPorCantidad,
    })
    if (insErr) {
      console.error("Error al insertar configuración por defecto:", insErr)
      throw new Error(`Error al insertar configuración por defecto: ${insErr.message}`)
    }
    config = defaultCfg
  } else {
    config = mapRowToConfig(cfgRows[0])
  }

  // Solo cargar reservas activas (no trashed)
  const { data: resRows, error: resErr } = await supabase
    .from("reservations")
    .select("*")
    .neq("estado", "trashed") // Excluir trashed
    .order("fecha", { ascending: true })
  if (resErr) {
    console.error("Error al cargar reservas iniciales:", resErr)
    throw new Error(`Error al cargar reservas: ${resErr.message}`)
  }

  const reservas = (resRows || []).map(mapRowToReservation)

  const { data: expRows, error: expErr } = await supabase
    .from("expenses")
    .select("*")
    .order("fecha", { ascending: true })
  if (expErr) {
    console.error("Error al cargar gastos iniciales:", expErr)
    throw new Error(`Error al cargar gastos: ${expErr.message}`)
  }

  const gastos = (expRows || []).map(mapRowToExpense)

  return { reservas, gastos, config }
}

export async function createReservation(formData: FormData) {
  const supabase = getSupabaseServer()

  // Extract data from FormData
  const nombreCliente = formData.get("cliente") as string
  const fecha = formData.get("fecha") as string
  const cantidadPersonas = Number.parseInt(formData.get("personas") as string)
  const extrasFijosSeleccionados = JSON.parse((formData.get("extrasFijos") as string) || "[]")
  const cantidades = JSON.parse((formData.get("itemsPorCantidad") as string) || "{}")
  const notas = formData.get("notas") as string
  const tipo = (formData.get("tipo") as string) || "normal" // 'migrada' for migrated reservations
  const estado = (formData.get("estado") as DayStatus) || "confirmado"

  const payload = {
    nombreCliente,
    fecha,
    cantidadPersonas,
    extrasFijosSeleccionados,
    cantidades,
    estado,
    notas,
  }

  // Cargar config
  const { data: cfgRows, error: cfgLoadErr } = await supabase
    .from("pricing_config")
    .select("*")
    .eq("id", "singleton")
    .limit(1)
  if (cfgLoadErr) throw new Error(`Error al cargar configuración para crear reserva: ${cfgLoadErr.message}`)

  const cfg = cfgRows?.[0] ? mapRowToConfig(cfgRows[0]) : undefined
  if (!cfg) throw new Error("No hay configuración de precios disponible para calcular la reserva.")

  const calc = computeReservationTotal(payload, cfg)
  const reservationId = crypto.randomUUID()

  const reservationRow = {
    id: reservationId,
    nombre_cliente: payload.nombreCliente,
    fecha: payload.fecha,
    cantidad_personas: payload.cantidadPersonas,
    extras_fijos_seleccionados: payload.extrasFijosSeleccionados,
    cantidades: payload.cantidades,
    estado: payload.estado,
    es_fin_de_semana: calc.esFinDeSemana,
    total: calc.total,
    creado_en: new Date().toISOString(),
    notas: payload.notas ?? null,
    deleted_at: null,
    tipo: tipo, // Adding tipo field to distinguish migrated reservations
  }

  const { data: savedReservation, error: resErr } = await supabase
    .from("reservations")
    .insert(reservationRow)
    .select("*")
    .single()
  if (resErr) {
    console.error("Error al insertar reserva:", resErr)
    throw new Error(`Error de DB al crear reserva: ${resErr.message} (Código: ${resErr.code})`)
  }

  // Registrar el gasto de limpieza solo para reservas normales y migradas
  if (cfg.costoLimpiezaFijo > 0) {
    const expenseRow = {
      id: crypto.randomUUID(),
      nombre: `Limpieza - ${payload.nombreCliente} (${payload.fecha})`,
      monto: cfg.costoLimpiezaFijo,
      fecha: payload.fecha,
    }
    const { error: expErr } = await supabase.from("expenses").insert(expenseRow)
    if (expErr) {
      console.error("ERROR: No se pudo registrar el gasto de limpieza:", expErr.message, expErr.details, expErr.hint)
    } else {
      console.log("Gasto de limpieza registrado con éxito:", expenseRow.nombre, expenseRow.monto)
    }
  }

  return mapRowToReservation(savedReservation)
}

export async function createReservationLegacy(
  payload: Omit<Reservation, "id" | "total" | "esFinDeSemana" | "creadoEn" | "deletedAt">,
) {
  const formData = new FormData()
  formData.append("cliente", payload.nombreCliente)
  formData.append("fecha", payload.fecha)
  formData.append("personas", payload.cantidadPersonas.toString())
  formData.append("extrasFijos", JSON.stringify(payload.extrasFijosSeleccionados))
  formData.append("itemsPorCantidad", JSON.stringify(payload.cantidades))
  formData.append("estado", payload.estado)
  if (payload.notas) formData.append("notas", payload.notas)

  return createReservation(formData)
}

export async function updateReservationStatusByDate(fechaISO: string, estado: DayStatus) {
  const supabase = getSupabaseServer()
  // buscar reserva más reciente por fecha (que no esté trashed)
  const { data: rows, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("fecha", fechaISO)
    .neq("estado", "trashed") // Solo considerar reservas activas
    .order("creado_en", { ascending: false })
    .limit(1)
  if (error) {
    console.error("Error al buscar reserva por fecha para actualizar estado:", error)
    throw new Error(`Error de DB al actualizar estado: ${error.message}`)
  }

  if (!rows || rows.length === 0) {
    // crear placeholder si no hay reservas activas para esa fecha
    const row = {
      id: crypto.randomUUID(),
      nombre_cliente: "Interesado",
      fecha: fechaISO,
      cantidad_personas: 0,
      extras_fijos_seleccionados: [],
      cantidades: {},
      estado,
      es_fin_de_semana: isWeekend(fechaISO),
      total: 0,
      creado_en: new Date().toISOString(),
      notas: null,
      deleted_at: null,
      tipo: "normal", // Adding tipo field to distinguish migrated reservations
    }
    const { data: inserted, error: insErr } = await supabase.from("reservations").insert(row).select("*").single()
    if (insErr) {
      console.error("Error al insertar placeholder de reserva:", insErr)
      throw new Error(`Error de DB al insertar placeholder: ${insErr.message}`)
    }
    return mapRowToReservation(inserted)
  } else {
    const id = rows[0].id
    const { data: updated, error: updErr } = await supabase
      .from("reservations")
      .update({ estado })
      .eq("id", id)
      .select("*")
      .single()
    if (updErr) {
      console.error("Error al actualizar estado de reserva:", updErr)
      throw new Error(`Error de DB al actualizar estado: ${updErr.message}`)
    }
    return mapRowToReservation(updated)
  }
}

export async function trashReservationAction(id: string) {
  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from("reservations")
    .update({ estado: "trashed", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()
  if (error) {
    console.error("Error al enviar reserva a papelera:", error)
    throw new Error(`Error de DB al enviar a papelera: ${error.message}`)
  }
  return mapRowToReservation(data)
}

export async function recoverReservationAction(id: string) {
  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from("reservations")
    .update({ estado: "interesado", deleted_at: null }) // O el estado anterior si lo guardáramos
    .eq("id", id)
    .select("*")
    .single()
  if (error) {
    console.error("Error al recuperar reserva:", error)
    throw new Error(`Error de DB al recuperar reserva: ${error.message}`)
  }
  return mapRowToReservation(data)
}

export async function purgeOldTrashedReservationsAction() {
  const supabase = getSupabaseServer()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from("reservations").delete().eq("estado", "trashed").lt("deleted_at", sevenDaysAgo)
  if (error) {
    console.error("Error al purgar reservas antiguas:", error)
    throw new Error(`Error de DB al purgar papelera: ${error.message}`)
  }
  return { ok: true }
}

export async function deleteReservationPermanentlyAction(id: string) {
  const supabase = getSupabaseServer()
  const { error } = await supabase.from("reservations").delete().eq("id", id)
  if (error) {
    console.error("Error al eliminar reserva permanentemente:", error)
    throw new Error(`Error de DB al eliminar permanentemente: ${error.message}`)
  }
  return { ok: true }
}

export async function saveConfigAction(cfg: PricingConfig) {
  const supabase = getSupabaseServer()
  // upsert (singleton)
  const { data, error } = await supabase.from("pricing_config").upsert(
    {
      id: "singleton", // Aseguramos que siempre se use el mismo ID para el singleton
      base_entre_semana: cfg.baseEntreSemana,
      base_fin_de_semana: cfg.baseFinDeSemana,
      precio_por_persona_entre_semana: cfg.precioPorPersonaEntreSemana,
      precio_por_persona_fin_de_semana: cfg.precioPorPersonaFinDeSemana,
      costo_limpieza_fijo: cfg.costoLimpiezaFijo,
      extras_fijos: cfg.extrasFijos,
      items_por_cantidad: cfg.itemsPorCantidad,
    },
    { onConflict: "id" },
  )
  if (error) {
    console.error("Error al guardar configuración:", error)
    throw new Error(`Error de DB al guardar configuración: ${error.message} (Código: ${error.code})`)
  }
  return { ok: true }
}

export async function addExpenseAction(g: Omit<Expense, "id">) {
  const supabase = getSupabaseServer()
  const row = { id: crypto.randomUUID(), nombre: g.nombre, monto: g.monto, fecha: g.fecha }
  const { data, error } = await supabase.from("expenses").insert(row).select("*").single()
  if (error) {
    console.error("Error al agregar gasto:", error)
    throw new Error(`Error de DB al agregar gasto: ${error.message}`)
  }
  return mapRowToExpense(data)
}

export async function deleteExpenseAction(id: string) {
  const supabase = getSupabaseServer()
  const { error } = await supabase.from("expenses").delete().eq("id", id)
  if (error) {
    console.error("Error al eliminar gasto:", error)
    throw new Error(`Error de DB al eliminar gasto: ${error.message}`)
  }
  return { ok: true }
}

export async function listReservationsByMonthAction(yyyyMM: string, includeTrashed = false) {
  const supabase = getSupabaseServer()
  let query = supabase
    .from("reservations")
    .select("*")
    .gte("fecha", `${yyyyMM}-01`)
    .lte("fecha", `${yyyyMM}-31`)
    .order("fecha", { ascending: true })

  if (!includeTrashed) {
    query = query.neq("estado", "trashed")
  }

  const { data, error } = await query
  if (error) {
    console.error("Error al listar reservas por mes:", error)
    throw new Error(`Error de DB al listar reservas: ${error.message}`)
  }
  return (data || []).map(mapRowToReservation)
}

export async function listTrashedReservationsAction() {
  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("estado", "trashed")
    .order("deleted_at", { ascending: false })
  if (error) {
    console.error("Error al listar reservas en papelera:", error)
    throw new Error(`Error de DB al listar papelera: ${error.message}`)
  }
  return (data || []).map(mapRowToReservation)
}
