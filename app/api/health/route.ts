import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    // contar registros para verificar acceso a tablas
    const [{ count: cfgCount }, { count: resCount }, { count: expCount }] = await Promise.all([
      supabase.from("pricing_config").select("*", { count: "exact", head: true }),
      supabase.from("reservations").select("*", { count: "exact", head: true }),
      supabase.from("expenses").select("*", { count: "exact", head: true }),
    ])
    return NextResponse.json({
      ok: true,
      tables: {
        pricing_config: cfgCount ?? 0,
        reservations: resCount ?? 0,
        expenses: expCount ?? 0,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 })
  }
}
