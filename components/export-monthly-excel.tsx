"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAtila } from "@/store/atila-provider"
import * as XLSX from "xlsx"
import { formatCurrency } from "@/lib/date-utils"
import { Download, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function ExportMonthlyExcel() {
  const { listReservationsByMonth, state } = useAtila()
  const [period, setPeriod] = React.useState<"historico" | "anual" | "mensual">("historico")
  const [month, setMonth] = React.useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [year, setYear] = React.useState(() => new Date().getFullYear().toString())
  const [loading, setLoading] = React.useState(false)

  const exportExcel = async () => {
    setLoading(true)
    try {
      let data = [] as typeof state.reservas

      if (period === "mensual") {
        data = await listReservationsByMonth(month)
      } else if (period === "anual") {
        data = state.reservas.filter((r) => r.fecha.startsWith(`${year}-`))
      } else {
        // histórico (todas las reservas activas)
        data = state.reservas
      }

      // Build a backup-friendly, migration-compatible sheet with rich data
      const header = [
        "Fecha", // ISO YYYY-MM-DD
        "Cliente",
        "Telefono",
        "Estado",
        "Tipo",
        "Personas",
        "Total",
        "PrecioBaseFijo",
        "PrecioPorPersonaFijo",
        "ExtrasFijosTotal",
        "CantidadesTotal",
        "DescuentoPorcentaje",
        "IncluyeLimpieza",
        "CostoLimpieza",
        "ExtrasFijosSeleccionados", // JSON string of IDs
        "ExtrasFijosNombres",       // Human readable names
        "Cantidades",               // JSON of { id: { cantidad, precioUnitarioFijo } }
        "Notas",
        "Pagado",
        "PagadoEn",                 // JSON array [{fecha,monto}]
        "CreadoEn",                 // ISO timestamp
        "ID"
      ]

      const rows = data.map((r) => {
        const extrasIdsJson = JSON.stringify(r.extrasFijosSeleccionados || [])
        const extrasNames = (r.extrasFijosSeleccionados || [])
          .map((id) => state.config.extrasFijos.find((e) => e.id === id)?.nombre || id)
          .join(", ")

        const cantidadesJson = JSON.stringify(r.cantidades || {})
        const pagadoEnJson = JSON.stringify(r.pagadoEn ?? [])

        return [
          r.fecha,                             // ISO date
          r.nombreCliente,
          r.telefono || "",
          (r.estado || "").toUpperCase(),
          r.tipo || "salon",
          r.cantidadPersonas || 0,
          r.total || 0,
          r.precioBaseFijo ?? 0,
          r.precioPorPersonaFijo ?? 0,
          r.extrasFijosTotalFijo ?? 0,
          r.cantidadesTotalFijo ?? 0,
          r.descuentoPorcentaje ?? 0,
          r.incluirLimpieza ? "true" : "false",
          r.costoLimpieza ?? 0,
          extrasIdsJson,
          extrasNames,
          cantidadesJson,
          r.notas || "",
          r.pagado ?? 0,
          pagadoEnJson,
          r.creadoEn ? new Date(r.creadoEn).toISOString() : "",
          r.id
        ]
      })

      // Summary for the selected period
      const total = data.reduce((acc, r) => acc + (r.total || 0), 0)
      const totalReservations = data.length
      const confirmedReservations = data.filter((r) => r.estado === "confirmado").length
      const averageGuests =
        data.length > 0 ? Math.round(data.reduce((acc, r) => acc + (r.cantidadPersonas || 0), 0) / data.length) : 0

      const summary = [
        ["RESUMEN DEL PERIODO"],
        ["Total de reservas", totalReservations],
        ["Reservas confirmadas", confirmedReservations],
        ["Promedio de invitados", `${averageGuests} personas`],
        ["Ingresos totales", formatCurrency(total)],
      ]

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows, [], ...summary])

      // Set column widths (wider to accommodate JSON fields)
      ws["!cols"] = [
        { wch: 12 }, // Fecha
        { wch: 25 }, // Cliente
        { wch: 16 }, // Telefono
        { wch: 12 }, // Estado
        { wch: 10 }, // Tipo
        { wch: 10 }, // Personas
        { wch: 14 }, // Total
        { wch: 14 }, // PrecioBaseFijo
        { wch: 18 }, // PrecioPorPersonaFijo
        { wch: 16 }, // ExtrasFijosTotal
        { wch: 16 }, // CantidadesTotal
        { wch: 18 }, // DescuentoPorcentaje
        { wch: 16 }, // IncluyeLimpieza
        { wch: 14 }, // CostoLimpieza
        { wch: 28 }, // ExtrasFijosSeleccionados
        { wch: 28 }, // ExtrasFijosNombres
        { wch: 40 }, // Cantidades
        { wch: 40 }, // Notas
        { wch: 12 }, // Pagado
        { wch: 40 }, // PagadoEn
        { wch: 24 }, // CreadoEn
        { wch: 36 }, // ID
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Reservas")

      const filename = `atila-reservas-${
        period === "mensual" ? month : period === "anual" ? year : "historico"
      }.xlsx`
      XLSX.writeFile(wb, filename)

      toast({
        title: "Excel generado",
        description: `Archivo ${filename} descargado exitosamente.`,
      })
    } catch (error: any) {
      console.error("Error generating Excel:", error)
      toast({
        title: "Error al generar Excel",
        description: error.message || "Ocurrió un error al generar el reporte.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="w-full sm:w-56 animate-staggered-fade-in group">
          <Label className="block text-sm font-semibold text-gray-700 mb-2">Rango a exportar</Label>
          <Select value={period} onValueChange={(v: "historico" | "anual" | "mensual") => setPeriod(v)}>
            <SelectTrigger className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg">
              <SelectValue placeholder="Seleccionar rango" />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-xl">
              <SelectItem value="historico">Histórico (todas)</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {period === "mensual" && (
          <div className="w-full sm:w-auto animate-staggered-fade-in group">
            <Label className="block text-sm font-semibold text-gray-700 mb-2">Mes a exportar</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg"
            />
          </div>
        )}

        {period === "anual" && (
          <div className="w-full sm:w-40 animate-staggered-fade-in group">
            <Label className="block text-sm font-semibold text-gray-700 mb-2">Año a exportar</Label>
            <Input
              type="number"
              min={2000}
              step={1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg"
            />
          </div>
        )}

        <Button
          onClick={exportExcel}
          disabled={loading}
          className="h-12 px-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold transition-all duration-300 hover-lift hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          size="default"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 animate-spin" />
              <span>Generando...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <span>Descargar Excel</span>
            </div>
          )}
        </Button>
      </div>

      <div className="text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl animate-staggered-fade-in delay-200">
        <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Información del reporte y respaldo:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 animate-staggered-fade-in delay-300">
            <span className="text-blue-500 mt-1">•</span>
            <span>Puedes exportar Histórico (todas), Anual o Mensual. Por defecto: Histórico.</span>
          </li>
          <li className="flex items-start gap-2 animate-staggered-fade-in delay-400">
            <span className="text-blue-500 mt-1">•</span>
            <span>Incluye columnas ricas para respaldo: teléfono, tipo, limpieza, descuentos, extras seleccionados, cantidades y pagos.</span>
          </li>
          <li className="flex items-start gap-2 animate-staggered-fade-in delay-500">
            <span className="text-blue-500 mt-1">•</span>
            <span>El archivo es compatible con el sistema de migración/importación para restaurar reservas.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}