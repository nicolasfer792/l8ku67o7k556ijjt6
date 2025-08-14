import { createClient } from "@supabase/supabase-js"

// Lee variables de entorno
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const service =
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !service) {
  console.error("Faltan variables: SUPABASE_URL y SERVICE_ROLE/ANON. Revisa tu .env.local")
  process.exit(1)
}

const supabase = createClient(url, service)

async function main() {
  console.log("Probando conexión a Supabase...")
  // 1) Seleccionar configuración (inserta por defecto si no existe)
  let { data: cfgRows, error: cfgErr } = await supabase.from("pricing_config").select("*").limit(1)
  if (cfgErr) throw cfgErr
  if (!cfgRows || cfgRows.length === 0) {
    console.log("No hay configuración; insertando una por defecto...")
    const { error: insErr } = await supabase.from("pricing_config").insert({
      id: "singleton",
      base_entre_semana: 100000,
      base_fin_de_semana: 140000,
      precio_por_persona_entre_semana: 3000,
      precio_por_persona_fin_de_semana: 4000,
      costo_limpieza_fijo: 20000,
      extras_fijos: [{ id: "vajillas", nombre: "Vajillas", precio: 15000 }],
      items_por_cantidad: [{ id: "sillas", nombre: "Sillas", precioUnitario: 300 }],
    })
    if (insErr) throw insErr
  }

  // 2) Insertar una reserva de prueba para este mes
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const dd = "15" // día 15 para pruebas
  const fecha = `${yyyy}-${mm}-${dd}`

  const { data: inserted, error: resErr } = await supabase
    .from("reservations")
    .insert({
      nombre_cliente: "Reserva de prueba",
      fecha,
      cantidad_personas: 50,
      extras_fijos_seleccionados: ["vajillas"],
      cantidades: { sillas: 50 },
      estado: "interesado",
      es_fin_de_semana: [0, 6].includes(new Date(`${fecha}T00:00:00`).getDay()),
      total: 123456,
      notas: "demo",
    })
    .select("*")
    .single()

  if (resErr) throw resErr
  console.log("Reserva insertada:", inserted)

  // 3) Consultar reservas del mes
  const { data: list, error: listErr } = await supabase
    .from("reservations")
    .select("id,nombre_cliente,fecha,total,estado")
    .gte("fecha", `${yyyy}-${mm}-01`)
    .lte("fecha", `${yyyy}-${mm}-31`)
    .order("fecha", { ascending: true })

  if (listErr) throw listErr
  console.log(`Reservas de ${yyyy}-${mm}:`, list)

  console.log("OK. Conexión y operaciones básicas funcionando.")
}

main().catch((e) => {
  console.error("Error:", e)
  process.exit(1)
})
