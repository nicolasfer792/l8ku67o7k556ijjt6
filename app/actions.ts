"use server"

import { getSupabaseServer } from "@/lib/supabase/server"
import type { AppStateShape, Expense, PricingConfig, Reservation, DayStatus } from "@/lib/types"
import { computeReservationTotal } from "@/lib/pricing"
import { isWeekend, startOfMonth, endOfMonth, toISODate } from "@/lib/date-utils"
import { processExcelFile, validateExcelData, type ProcessedReservationData } from "@/lib/excel-processor"

// Helpers de mapeo entre DB y tipos
function mapRowToReservation(row: any): Reservation {
  return {
    id: row.id,
    nombreCliente: row.nombre_cliente,
    fecha: row.fecha,
    cantidadPersonas: row.cantidad_personas,
    extrasFijosSeleccionados: row.extras_fijos_seleccionados ?? [],
    cantidades: row.cantidades ?? {}, // This will now be Record<string, { cantidad: number; precioUnitarioFijo: number }>
    estado: row.estado,
    esFinDeSemana: row.es_fin_de_semana,
    total: Number(row.total || 0),
    creadoEn: row.creado_en,
    notas: row.notas ?? undefined,
    deletedAt: row.deleted_at ?? null,
    tipo: row.tipo ?? "normal", // Adding tipo field to distinguish migrated reservations
    incluirLimpieza: row.incluir_limpieza ?? false,
    costoLimpieza: Number(row.costo_limpieza || 0),
    precioBaseFijo: Number(row.precio_base_fijo || 0),
    precioPorPersonaFijo: Number(row.precio_por_persona_fijo || 0),
    extrasFijosTotalFijo: Number(row.extras_fijos_total_fijo || 0),
    // Solo usar cantidades_total_fijo si la columna existe
    cantidadesTotalFijo: Number(row.cantidades_total_fijo ?? 0),
    descuentoPorcentaje: Number(row.descuento_porcentaje ?? 0),
    telefono: row.telefono || undefined,
    // Campos para el estado de pago
    pagado: Number(row.pagado || 0),
    pagadoEn: row.pagado_en ?
      (Array.isArray(row.pagado_en) ?
        row.pagado_en.map((p: any) => ({
          fecha: p.fecha ? new Date(p.fecha + 'T00:00:00').toISOString().split('T')[0] : p.fecha,
          monto: Number(p.monto || 0)
        })) :
        typeof row.pagado_en === 'string' ?
          JSON.parse(row.pagado_en).map((p: any) => ({
            fecha: p.fecha ? new Date(p.fecha + 'T00:00:00').toISOString().split('T')[0] : p.fecha,
            monto: Number(p.monto || 0)
          })) :
          []) :
      undefined
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
    precioPatio: Number(row.precio_patio || 0), // Add precioPatio
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
      precioPatio: 50000, // Add default for precioPatio
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
      precio_patio: defaultCfg.precioPatio, // Add precioPatio to insert
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
  const { data: resRows, error: resErr } = await supabase.from("reservations").select("*").neq("estado", "trashed").order("fecha", { ascending: true })
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

export async function createReservation(
  formData:
    | FormData
    | (Omit<Reservation, "id" | "total" | "esFinDeSemana" | "creadoEn" | "deletedAt"> & {
        precioBaseFijo: number
        precioPorPersonaFijo: number
        extrasFijosTotalFijo: number
        cantidadesTotalFijo: number
      })
) {
  const supabase = getSupabaseServer()

  // Handle both FormData and plain object inputs
  let nombreCliente: string
  let telefono: string
  let fecha: string
  let cantidadPersonas: number
  let extrasFijosSeleccionados: string[]
  let cantidades: Record<string, { cantidad: number; precioUnitarioFijo: number }>
  let notas: string
  let tipo: "salon" | "patio" | "migrada"
  let estado: DayStatus
  let incluirLimpieza: boolean
  let costoLimpieza: number
  let precioBaseFijo: number
  let precioPorPersonaFijo: number
  let extrasFijosTotalFijo: number
  let cantidadesTotalFijo: number

  if (formData instanceof FormData) {
    // Extract data from FormData
    nombreCliente = formData.get("cliente") as string
    telefono = formData.get("telefono") as string
    fecha = formData.get("fecha") as string
    cantidadPersonas = Number.parseInt(formData.get("personas") as string)
    extrasFijosSeleccionados = JSON.parse((formData.get("extrasFijos") as string) || "[]")
    // When processing FormData, we need to get the precioUnitarioFijo from the current config
    const rawCantidades = JSON.parse((formData.get("itemsPorCantidad") as string) || "{}")
    const config = await getPricingConfig() // Fetch config to get current item prices
    cantidades = Object.entries(rawCantidades).reduce((acc, [id, qty]) => {
      const item = config.itemsPorCantidad.find((i) => i.id === id)
      if (item) {
        acc[id] = { cantidad: Number(qty), precioUnitarioFijo: item.precioUnitario }
      }
      return acc
    }, {} as Record<string, { cantidad: number; precioUnitarioFijo: number }>)
    notas = formData.get("notas") as string
    tipo = (formData.get("tipo") as "salon" | "patio" | "migrada") || "salon"
    estado = (formData.get("estado") as DayStatus) || "confirmado"
    incluirLimpieza = formData.get("incluirLimpieza") === "true"
    costoLimpieza = Number(formData.get("costoLimpieza") || 0)
    precioBaseFijo = Number(formData.get("precioBaseFijo") || 0)
    precioPorPersonaFijo = Number(formData.get("precioPorPersonaFijo") || 0)
    extrasFijosTotalFijo = Number(formData.get("extrasFijosTotalFijo") || 0)
    cantidadesTotalFijo = Number(formData.get("cantidadesTotalFijo") || 0)
  } else {
    // Handle plain object input
    nombreCliente = formData.nombreCliente
    telefono = formData.telefono || ""
    fecha = formData.fecha
    cantidadPersonas = formData.cantidadPersonas
    extrasFijosSeleccionados = formData.extrasFijosSeleccionados || []
    cantidades = formData.cantidades || {} // Already in the correct format from plain object
    notas = formData.notas || ""
    tipo = formData.tipo || "salon"
    estado = formData.estado || "confirmado"
    incluirLimpieza = formData.incluirLimpieza ?? false
    costoLimpieza = formData.costoLimpieza ?? 0
    precioBaseFijo = formData.precioBaseFijo ?? 0
    precioPorPersonaFijo = formData.precioPorPersonaFijo ?? 0
    extrasFijosTotalFijo = formData.extrasFijosTotalFijo ?? 0
    cantidadesTotalFijo = formData.cantidadesTotalFijo ?? 0
  }

  // If it's a migrated reservation and no notes are provided, add a default note
  if (tipo === "migrada" && !notas) {
    notas = "Reserva migrada sin descripción original."
  }

  // Extract descuentoPorcentaje from payload (works for both FormData and plain objects)
  const descuentoPorcentaje = (formData as any).descuentoPorcentaje || 0

  const payload = {
    nombreCliente,
    telefono,
    fecha,
    cantidadPersonas,
    extrasFijosSeleccionados,
    cantidades,
    estado,
    notas,
    tipo, // Include tipo in payload for computeReservationTotal
    incluirLimpieza,
    costoLimpieza,
    precioBaseFijo,
    precioPorPersonaFijo,
    extrasFijosTotalFijo,
    cantidadesTotalFijo,
    descuentoPorcentaje,
  }

  // Helper function to get pricing config
  async function getPricingConfig(): Promise<PricingConfig> {
    const { data: cfgRows, error: cfgLoadErr } = await supabase
      .from("pricing_config")
      .select("*")
      .eq("id", "singleton")
      .limit(1)
    if (cfgLoadErr) throw new Error(`Error al cargar configuración: ${cfgLoadErr.message}`)
    const cfg = cfgRows?.[0] ? mapRowToConfig(cfgRows[0]) : undefined
    if (!cfg) throw new Error("No hay configuración de precios disponible.")
    return cfg
  }

  const cfg = await getPricingConfig()
  const calc = computeReservationTotal({
    ...payload,
    descuentoPorcentaje: (payload as any).descuentoPorcentaje || 0
  }, cfg)
  const reservationId = crypto.randomUUID()

  const reservationRow: any = {
    id: reservationId,
    nombre_cliente: payload.nombreCliente,
    telefono: payload.telefono,
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
    tipo: payload.tipo, // Use payload.tipo
    incluir_limpieza: payload.incluirLimpieza,
    costo_limpieza: calc.costoLimpieza,
  }
  
  // Solo agregar precio_base_fijo si la columna existe en la BD
  try {
    // Intentamos seleccionar la columna para ver si existe
    const { data: testColumn, error: testError } = await supabase
      .from("reservations")
      .select("precio_base_fijo")
      .limit(1)
    
    if (!testError) {
      // La columna existe, la incluimos
      reservationRow.precio_base_fijo = calc.breakdown.base
    }
  } catch (e) {
    // La columna no existe, no la incluimos
    console.log("Columna precio_base_fijo no encontrada, omitiendo...")
  }
  
  // Solo agregar precio_por_persona_fijo si la columna existe en la BD
  try {
    // Intentamos seleccionar la columna para ver si existe
    const { data: testColumn, error: testError } = await supabase
      .from("reservations")
      .select("precio_por_persona_fijo")
      .limit(1)
    
    if (!testError) {
      // La columna existe, la incluimos
      reservationRow.precio_por_persona_fijo = calc.breakdown.perPerson
    }
  } catch (e) {
    // La columna no existe, no la incluimos
    console.log("Columna precio_por_persona_fijo no encontrada, omitiendo...")
  }
  
  // Solo agregar extras_fijos_total_fijo si la columna existe en la BD
  try {
    // Intentamos seleccionar la columna para ver si existe
    const { data: testColumn, error: testError } = await supabase
      .from("reservations")
      .select("extras_fijos_total_fijo")
      .limit(1)
    
    if (!testError) {
      // La columna existe, la incluimos
      reservationRow.extras_fijos_total_fijo = calc.breakdown.extrasFijosTotal
    }
  } catch (e) {
    // La columna no existe, no la incluimos
    console.log("Columna extras_fijos_total_fijo no encontrada, omitiendo...")
  }
  
  // Solo agregar cantidades_total_fijo si la columna existe en la BD
  try {
    // Intentamos seleccionar la columna para ver si existe
    const { data: testColumn, error: testError } = await supabase
      .from("reservations")
      .select("cantidades_total_fijo")
      .limit(1)
    
    if (!testError) {
      // La columna existe, la incluimos
      reservationRow.cantidades_total_fijo = calc.breakdown.cantidadesTotal
    }
  } catch (e) {
    // La columna no existe, no la incluimos
    console.log("Columna cantidades_total_fijo no encontrada, omitiendo...")
  }

  // Agregar descuento_porcentaje si la columna existe en la BD
  try {
    // Intentamos seleccionar la columna para ver si existe (sin filtrar por id, ya que aún no insertamos)
    const { error: testError } = await supabase
      .from("reservations")
      .select("descuento_porcentaje")
      .limit(1)

    if (!testError) {
      // La columna existe, la incluimos en el insert
      reservationRow.descuento_porcentaje = (payload as any).descuentoPorcentaje || 0
    }
  } catch (e) {
    // La columna no existe, no la incluimos
    console.log("Columna descuento_porcentaje no encontrada, omitiendo...")
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

  // Registrar el gasto de limpieza solo para reservas normales y migradas, excepto para reservas de tipo "patio"
  // Registrar el gasto de limpieza solo para reservas de tipo "salon"
  if (calc.costoLimpieza > 0 && payload.tipo === "salon") {
    const expenseRow = {
      id: crypto.randomUUID(),
      nombre: `Limpieza - ${payload.nombreCliente} (${payload.fecha})`,
      monto: calc.costoLimpieza,
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
  payload: Omit<Reservation, "id" | "total" | "esFinDeSemana" | "creadoEn" | "deletedAt"> & {
    precioBaseFijo: number
    precioPorPersonaFijo: number
    extrasFijosTotalFijo: number
    cantidadesTotalFijo: number
  },
) {
  const formData = new FormData()
  formData.append("cliente", payload.nombreCliente)
  formData.append("fecha", payload.fecha)
  formData.append("personas", payload.cantidadPersonas.toString())
  formData.append("extrasFijos", JSON.stringify(payload.extrasFijosSeleccionados))
  formData.append("itemsPorCantidad", JSON.stringify(payload.cantidades))
  formData.append("estado", payload.estado)
  if (payload.notas) formData.append("notas", payload.notas)
  if (payload.tipo) formData.append("tipo", payload.tipo)
  formData.append("incluirLimpieza", payload.incluirLimpieza ? "true" : "false")
  formData.append("costoLimpieza", payload.costoLimpieza.toString())
  formData.append("precioBaseFijo", payload.precioBaseFijo.toString())
  formData.append("precioPorPersonaFijo", payload.precioPorPersonaFijo.toString())
  formData.append("extrasFijosTotalFijo", payload.extrasFijosTotalFijo.toString())
  formData.append("cantidadesTotalFijo", payload.cantidadesTotalFijo.toString())

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
      incluir_limpieza: false, // Default value
      costo_limpieza: 0, // Default value
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
  // Buscar la reserva original para mantener el estado
  const { data: original, error: findErr } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single()
  if (findErr) throw new Error(`Error al buscar reserva: ${findErr.message}`)

  const { data, error } = await supabase
    .from("reservations")
    .update({ estado: "confirmado", deleted_at: null })
    .eq("id", id)
    .select("*")
    .single()
  if (error) {
    console.error("Error al recuperar reserva:", error)
    throw new Error(`Error de DB al recuperar reserva: ${error.message}`)
  }
  return mapRowToReservation(data)
}

export async function updateReservation(
  id: string,
  data: {
    nombreCliente?: string
    fecha?: string
    cantidadPersonas?: number
    extrasFijosSeleccionados?: string[]
    cantidades?: Record<string, number | { cantidad: number; precioUnitarioFijo: number }>
    estado?: DayStatus
    notas?: string
    tipo?: "salon" | "patio" | "migrada"
    incluirLimpieza?: boolean
    costoLimpieza?: number
    precioBaseFijo?: number
    precioPorPersonaFijo?: number
    extrasFijosTotalFijo?: number
    cantidadesTotalFijo?: number
    telefono?: string
    pagado?: number
    pagadoEn?: Array<{ fecha: string; monto: number }>
    descuentoPorcentaje?: number
  }
 ) {
   const supabase = getSupabaseServer()
 
   // Obtener la reserva actual
   const { data: currentReservation, error: currentErr } = await supabase
     .from("reservations")
     .select("*")
     .eq("id", id)
     .single()
   if (currentErr) throw new Error(`Error al buscar reserva: ${currentErr.message}`)
 
   // Cargar config solo si es necesario (si no hay precios fijos o si se están actualizando precios)
   const { data: cfgRows, error: cfgLoadErr } = await supabase
     .from("pricing_config")
     .select("*")
     .eq("id", "singleton")
     .limit(1)
   if (cfgLoadErr) throw new Error(`Error al cargar configuración para actualizar reserva: ${cfgLoadErr.message}`)
 
   const cfg = cfgRows?.[0] ? mapRowToConfig(cfgRows[0]) : undefined
   if (!cfg) throw new Error("No hay configuración de precios disponible.")
 
   // Preparar payload para el cálculo
   const payload = {
     nombreCliente: data.nombreCliente ?? currentReservation.nombre_cliente,
     telefono: data.telefono ?? currentReservation.telefono,
     fecha: data.fecha ?? currentReservation.fecha,
     cantidadPersonas: data.cantidadPersonas ?? currentReservation.cantidad_personas,
     extrasFijosSeleccionados: data.extrasFijosSeleccionados ?? currentReservation.extras_fijos_seleccionados,
     cantidades: data.cantidades ?? currentReservation.cantidades,
     estado: data.estado ?? currentReservation.estado,
     notas: data.notas ?? currentReservation.notas,
     tipo: data.tipo ?? currentReservation.tipo,
     incluirLimpieza: data.incluirLimpieza ?? currentReservation.incluir_limpieza,
     costoLimpieza: data.costoLimpieza ?? currentReservation.costo_limpieza,
     // Usar precios fijos existentes si no se están actualizando explícitamente
     precioBaseFijo: data.precioBaseFijo ?? currentReservation.precio_base_fijo,
     precioPorPersonaFijo: data.precioPorPersonaFijo ?? currentReservation.precio_por_persona_fijo,
     extrasFijosTotalFijo: data.extrasFijosTotalFijo ?? currentReservation.extras_fijos_total_fijo,
     cantidadesTotalFijo: data.cantidadesTotalFijo ?? currentReservation.cantidades_total_fijo,
     descuentoPorcentaje: data.descuentoPorcentaje ?? currentReservation.descuento_porcentaje,
   }

   const descuentoPorcentajeValue = payload.descuentoPorcentaje

   const calc = computeReservationTotal({
     ...payload,
     descuentoPorcentaje: descuentoPorcentajeValue
   }, cfg)
 
   const updateData: any = {
     nombre_cliente: payload.nombreCliente,
     fecha: payload.fecha,
     cantidad_personas: payload.cantidadPersonas,
     extras_fijos_seleccionados: payload.extrasFijosSeleccionados,
     cantidades: payload.cantidades,
     estado: payload.estado,
     es_fin_de_semana: calc.esFinDeSemana,
     total: calc.total,
     notas: payload.notas ?? null,
     tipo: payload.tipo,
     incluir_limpieza: payload.incluirLimpieza,
     costo_limpieza: calc.costoLimpieza,
   }
   
   // Incluir campos de pago si existen en los datos
   if (data.pagado !== undefined) {
     updateData.pagado = data.pagado
   }
   
   if (data.pagadoEn !== undefined) {
     // Convertir array de objetos a JSONB para la base de datos
     updateData.pagado_en = JSON.stringify(data.pagadoEn)
   }
   
   // Incluir teléfono si existe en los datos
   if (data.telefono !== undefined) {
     updateData.telefono = data.telefono
   }
   
   // Solo agregar precio_base_fijo si la columna existe en la BD
   try {
     // Intentamos seleccionar la columna para ver si existe
     const { data: testColumn, error: testError } = await supabase
       .from("reservations")
       .select("precio_base_fijo")
       .eq("id", id)
       .limit(1)
     
     if (!testError) {
       // La columna existe, la incluimos
       updateData.precio_base_fijo = payload.precioBaseFijo || calc.breakdown.base
     }
   } catch (e) {
     // La columna no existe, no la incluimos
     console.log("Columna precio_base_fijo no encontrada, omitiendo...")
   }
   
   // Solo agregar precio_por_persona_fijo si la columna existe en la BD
   try {
     // Intentamos seleccionar la columna para ver si existe
     const { data: testColumn, error: testError } = await supabase
       .from("reservations")
       .select("precio_por_persona_fijo")
       .eq("id", id)
       .limit(1)
     
     if (!testError) {
       // La columna existe, la incluimos
       updateData.precio_por_persona_fijo = payload.precioPorPersonaFijo || calc.breakdown.perPerson
     }
   } catch (e) {
     // La columna no existe, no la incluimos
     console.log("Columna precio_por_persona_fijo no encontrada, omitiendo...")
   }
   
   // Solo agregar extras_fijos_total_fijo si la columna existe en la BD
   try {
     // Intentamos seleccionar la columna para ver si existe
     const { data: testColumn, error: testError } = await supabase
       .from("reservations")
       .select("extras_fijos_total_fijo")
       .eq("id", id)
       .limit(1)
     
     if (!testError) {
       // La columna existe, la incluimos
       updateData.extras_fijos_total_fijo = payload.extrasFijosTotalFijo || calc.breakdown.extrasFijosTotal
     }
   } catch (e) {
     // La columna no existe, no la incluimos
     console.log("Columna extras_fijos_total_fijo no encontrada, omitiendo...")
   }
   
   // Solo agregar cantidades_total_fijo si la columna existe en la BD
   try {
     // Intentamos seleccionar la columna para ver si existe
     const { data: testColumn, error: testError } = await supabase
       .from("reservations")
       .select("cantidades_total_fijo")
       .eq("id", id)
       .limit(1)
     
     if (!testError) {
       // La columna existe, la incluimos
       updateData.cantidades_total_fijo = payload.cantidadesTotalFijo || calc.breakdown.cantidadesTotal
     }
   } catch (e) {
     // La columna no existe, no la incluimos
     console.log("Columna cantidades_total_fijo no encontrada, omitiendo...")
   }

   // Solo agregar descuento_porcentaje si la columna existe en la BD
   try {
     // Intentamos seleccionar la columna para ver si existe
     const { data: testColumn, error: testError } = await supabase
       .from("reservations")
       .select("descuento_porcentaje")
       .eq("id", id)
       .limit(1)

     if (!testError) {
       // La columna existe, la incluimos
       updateData.descuento_porcentaje = (payload as any).descuentoPorcentaje || 0
     }
   } catch (e) {
     // La columna no existe, no la incluimos
     console.log("Columna descuento_porcentaje no encontrada, omitiendo...")
   }

  const { data: updatedReservation, error: updateErr } = await supabase
    .from("reservations")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single()
  if (updateErr) {
    console.error("Error al actualizar reserva:", updateErr)
    throw new Error(`Error de DB al actualizar reserva: ${updateErr.message}`)
  }

  return mapRowToReservation(updatedReservation)
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
      precio_patio: cfg.precioPatio,
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
    .gte("fecha", toISODate(startOfMonth(new Date(yyyyMM))))
    .lte("fecha", toISODate(endOfMonth(new Date(yyyyMM))))
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

export async function recalculateReservationTotals() {
  const supabase = getSupabaseServer()

  // Obtener todas las reservas activas
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*")
    .neq("estado", "trashed")

  if (error) {
    console.error("Error al obtener reservas para recálculo:", error)
    throw new Error(`Error al obtener reservas: ${error.message}`)
  }

  if (!reservations || reservations.length === 0) {
    return { message: "No hay reservas para recalcular" }
  }

  // Cargar configuración actual
  const { data: cfgRows, error: cfgErr } = await supabase
    .from("pricing_config")
    .select("*")
    .eq("id", "singleton")
    .limit(1)

  if (cfgErr) {
    throw new Error(`Error al cargar configuración: ${cfgErr.message}`)
  }

  const cfg = cfgRows?.[0] ? mapRowToConfig(cfgRows[0]) : undefined
  if (!cfg) {
    throw new Error("No hay configuración de precios disponible.")
  }

  let updatedCount = 0

  for (const reservation of reservations) {
    // Preparar payload para recálculo
    const payload = {
      nombreCliente: reservation.nombre_cliente,
      telefono: reservation.telefono,
      fecha: reservation.fecha,
      cantidadPersonas: reservation.cantidad_personas,
      extrasFijosSeleccionados: reservation.extras_fijos_seleccionados || [],
      cantidades: reservation.cantidades || {},
      estado: reservation.estado,
      notas: reservation.notas,
      tipo: reservation.tipo || "salon",
      incluirLimpieza: reservation.incluir_limpieza || false,
      costoLimpieza: reservation.costo_limpieza || 0,
      precioBaseFijo: reservation.precio_base_fijo || 0,
      precioPorPersonaFijo: reservation.precio_por_persona_fijo || 0,
      extrasFijosTotalFijo: reservation.extras_fijos_total_fijo || 0,
      cantidadesTotalFijo: reservation.cantidades_total_fijo || 0,
      descuentoPorcentaje: reservation.descuento_porcentaje || 0,
    }

    // Recalcular total con descuento
    const calc = computeReservationTotal(payload, cfg)

    // Actualizar solo si el total cambió
    if (calc.total !== reservation.total) {
      const { error: updateErr } = await supabase
        .from("reservations")
        .update({
          total: calc.total,
          precio_base_fijo: calc.breakdown.base,
          precio_por_persona_fijo: calc.breakdown.perPerson,
          extras_fijos_total_fijo: calc.breakdown.extrasFijosTotal,
          cantidades_total_fijo: calc.breakdown.cantidadesTotal,
          costo_limpieza: calc.costoLimpieza,
        })
        .eq("id", reservation.id)

      if (updateErr) {
        console.error(`Error al actualizar reserva ${reservation.id}:`, updateErr)
      } else {
        updatedCount++
      }
    }
  }

  return {
    message: `Recálculo completado. ${updatedCount} reservas actualizadas.`,
    updatedCount
  }
}

export async function migrateReservationsToFixedPrices() {
  const supabase = getSupabaseServer()
  
  // Obtener todas las reservas activas
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*")
    .neq("estado", "trashed")
    
  if (error) {
    console.error("Error al obtener reservas para migración:", error)
    throw new Error(`Error al obtener reservas: ${error.message}`)
  }
  
  if (!reservations || reservations.length === 0) {
    return { message: "No hay reservas para migrar" }
  }
  
  // Cargar configuración actual
  const { data: cfgRows, error: cfgErr } = await supabase
    .from("pricing_config")
    .select("*")
    .eq("id", "singleton")
    .limit(1)
    
  if (cfgErr) {
    throw new Error(`Error al cargar configuración: ${cfgErr.message}`)
  }
  
  const cfg = cfgRows?.[0] ? mapRowToConfig(cfgRows[0]) : undefined
  if (!cfg) {
    throw new Error("No hay configuración de precios disponible.")
  }
  
  let migratedCount = 0
  
  for (const reservation of reservations) {
    // Verificar si la reserva necesita migración (formato antiguo de cantidades)
    const needsMigration = Object.entries(reservation.cantidades).some(([_, data]) =>
      typeof data === 'number'
    )
    
    if (needsMigration) {
      // Migrar la reserva
      const migratedCantidades = Object.entries(reservation.cantidades).reduce((acc, [id, data]) => {
        if (typeof data === 'number') {
          // Formato antiguo: convertir a formato nuevo con precio actual
          const item = cfg.itemsPorCantidad.find(item => item.id === id)
          if (item) {
            acc[id] = { cantidad: data, precioUnitarioFijo: item.precioUnitario }
          }
        } else if (typeof data === 'object' && data !== null && 'cantidad' in data && 'precioUnitarioFijo' in data) {
          // Formato nuevo: usar tal cual
          acc[id] = data
        }
        return acc
      }, {} as Record<string, any>)
      
      // Actualizar la reserva
      const { error: updateErr } = await supabase
        .from("reservations")
        .update({
          cantidades: migratedCantidades,
          // Recalcular el total con los nuevos precios fijos
          total: reservation.total // Mantener el total original para no afectar los precios
        })
        .eq("id", reservation.id)
        
      if (updateErr) {
        console.error(`Error al migrar reserva ${reservation.id}:`, updateErr)
      } else {
        migratedCount++
      }
    }
  }
  
  return {
    message: `Migración completada. ${migratedCount} reservas actualizadas.`,
    migratedCount
  }
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

  async function fetchReservationByIdAction(id: string): Promise<Reservation | null> {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single()
    if (error) {
      console.error("Error al buscar reserva por ID:", error)
      throw new Error(`Error de DB al buscar reserva por ID: ${error.message}`)
    }
    return data ? mapRowToReservation(data) : null
  }
  return (data || []).map(mapRowToReservation)
}

export async function migrateReservationsFromExcel(file: File) {
  "use server"
  
  const supabase = getSupabaseServer()
  
  console.log(`Iniciando migración desde archivo: ${file.name}`)
  console.log(`Tamaño del archivo: ${file.size} bytes`)
  
  try {
    // Procesar el archivo Excel
    console.log("Procesando archivo Excel...")
    const processedData = await processExcelFile(file)
    console.log(`Datos procesados: ${processedData.length} reservas encontradas`)
    
    // Validar los datos procesados
    const validation = validateExcelData(processedData)
    if (!validation.valid) {
      throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`)
    }
    
    // Cargar configuración actual para obtener precios de items
    console.log("Cargando configuración de precios...")
    const { data: cfgRows, error: cfgErr } = await supabase
      .from("pricing_config")
      .select("*")
      .eq("id", "singleton")
      .limit(1)
      
    if (cfgErr) {
      console.error("Error al cargar configuración:", cfgErr)
      throw new Error(`Error al cargar configuración: ${cfgErr.message}`)
    }
    
    const cfg = cfgRows?.[0] ? mapRowToConfig(cfgRows[0]) : undefined
    if (!cfg) {
      throw new Error("No hay configuración de precios disponible.")
    }
    
    console.log("Configuración cargada exitosamente")
    
    let migratedCount = 0
    const errors: string[] = []
    
    // Procesar cada reserva
    for (const data of processedData) {
      try {
        // Mapear los items por cantidad a precios fijos actuales
        const cantidadesWithPrices = Object.entries(data.cantidades).reduce((acc, [id, qtyData]) => {
          const item = cfg.itemsPorCantidad.find(item => item.id === id)
          if (item) {
            acc[id] = {
              cantidad: qtyData.cantidad,
              precioUnitarioFijo: item.precioUnitario
            }
          }
          return acc
        }, {} as Record<string, { cantidad: number; precioUnitarioFijo: number }>)
        
        // Preparar payload para la reserva (usando la mayor cantidad de datos disponibles)
        const payload = {
          nombreCliente: data.nombreCliente,
          telefono: data.telefono,
          fecha: data.fecha,
          cantidadPersonas: data.cantidadPersonas,
          extrasFijosSeleccionados: data.extrasFijosSeleccionados,
          cantidades: cantidadesWithPrices,
          estado: data.estado,
          notas: data.notas,
          tipo: (data.tipo as any) || "migrada",
          incluirLimpieza: data.incluirLimpieza ?? false,
          costoLimpieza: data.costoLimpieza ?? 0,
          precioBaseFijo: data.precioBaseFijo ?? 0,
          precioPorPersonaFijo: data.precioPorPersonaFijo ?? 0,
          extrasFijosTotalFijo: data.extrasFijosTotalFijo ?? 0,
          cantidadesTotalFijo: data.cantidadesTotalFijo ?? 0,
          descuentoPorcentaje: data.descuentoPorcentaje ?? 0,
        }
        
        // Calcular total usando la función existente
        const calc = computeReservationTotal(payload, cfg)
        
        // Crear la reserva en la base de datos
        const reservationRow: any = {
          id: crypto.randomUUID(),
          nombre_cliente: payload.nombreCliente,
          telefono: payload.telefono,
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
          tipo: payload.tipo,
          incluir_limpieza: payload.incluirLimpieza,
          costo_limpieza: calc.costoLimpieza,
          // Preferir 'pagado' si viene explícito; si no, usar 'saldo' como fallback
          pagado: (data.pagado ?? data.saldo) || 0,
          // Intentar guardar el historial de pagos si está disponible
          pagado_en: data.pagadoEn ?? undefined,
          // Guardar el porcentaje de descuento si existe la columna (la mayoría de BDs ya lo tienen)
          descuento_porcentaje: data.descuentoPorcentaje ?? 0,
        }
        
        // Insertar la reserva
        console.log(`Intentando insertar reserva: ${data.nombreCliente} para la fecha: ${data.fecha}`)
        console.log('Datos de la reserva:', reservationRow)
        
        const { error: insertErr } = await supabase
          .from("reservations")
          .insert(reservationRow)
          
        if (insertErr) {
          console.error(`Error al insertar reserva ${data.nombreCliente}:`, insertErr)
          throw new Error(`Error al insertar reserva ${data.nombreCliente}: ${insertErr.message} (Código: ${insertErr.code})`)
        }
        
        console.log(`Reserva ${data.nombreCliente} insertada exitosamente`)
        
        migratedCount++
        
      } catch (error) {
        errors.push(`Error al procesar ${data.nombreCliente}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }
    
    return {
      message: `Migración completada. ${migratedCount} reservas importadas con éxito.`,
      migratedCount,
      errors: errors.length > 0 ? errors : undefined
    }
    
  } catch (error) {
    console.error('Error en migración desde Excel:', error)
    throw new Error(`Error durante la migración: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}
