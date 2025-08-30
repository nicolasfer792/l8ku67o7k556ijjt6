"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAtila } from "@/store/atila-provider"
import * as XLSX from "xlsx"
import { formatCurrency } from "@/lib/date-utils"
import { Download, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function ExportMonthlyExcel() {
  const { listReservationsByMonth, state } = useAtila()
  const [month, setMonth] = React.useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [loading, setLoading] = React.useState(false)

  const exportExcel = async () => {
    setLoading(true)
    try {
      const data = await listReservationsByMonth(month)

      const header = ["Fecha", "Cliente", "Estado", "Personas", "Total", "Extras y Items", "Notas"]
      const rows = data.map((r) => {
        const { config } = state

        const extrasFijosDetails = r.extrasFijosSeleccionados
          .map((id) => {
            const extra = config.extrasFijos.find((e) => e.id === id)
            return extra ? extra.nombre : id
          })
          .join(", ")

        const cantidadesDetails = Object.entries(r.cantidades)
          .map(([id, cantidad]) => {
            const qty = typeof cantidad === 'object' ? cantidad.cantidad : cantidad
            if (qty > 0) {
              const item = config.itemsPorCantidad.find((i) => i.id === id)
              return item ? `${qty}x ${item.nombre}` : `${qty}x ${id}`
            }
            return null
          })
          .filter(Boolean)
          .join(", ")

        const details = [extrasFijosDetails, cantidadesDetails].filter(Boolean).join(" | ")

        return [
          new Date(r.fecha + "T00:00:00").toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
          }),
          r.nombreCliente,
          r.estado.toUpperCase(),
          r.cantidadPersonas,
          r.total,
          details || "-",
          r.notas || "-",
        ]
      })

      const total = data.reduce((acc, r) => acc + r.total, 0)
      const totalReservations = data.length
      const confirmedReservations = data.filter((r) => r.estado === "confirmado").length
      const averageGuests =
        data.length > 0 ? Math.round(data.reduce((acc, r) => acc + r.cantidadPersonas, 0) / data.length) : 0

      const summary = [
        ["RESUMEN DEL MES"],
        ["Total de reservas", totalReservations],
        ["Reservas confirmadas", confirmedReservations],
        ["Promedio de invitados", `${averageGuests} personas`],
        ["Ingresos totales", formatCurrency(total)],
      ]

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows, [], ...summary])

      // Set column widths
      ws["!cols"] = [
        { wch: 10 }, // Fecha
        { wch: 25 }, // Cliente
        { wch: 15 }, // Estado
        { wch: 10 }, // Personas
        { wch: 15 }, // Total
        { wch: 30 }, // Extras y Items
        { wch: 40 }, // Notas
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Reservas")

      const filename = `atila-reservas-${month}.xlsx`
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
        <div className="w-full sm:w-auto animate-staggered-fade-in group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Mes a exportar</label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg"
          />
        </div>
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
          Información del reporte:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 animate-staggered-fade-in delay-300">
            <span className="text-blue-500 mt-1">•</span>
            <span>Incluye todas las reservas activas del mes seleccionado</span>
          </li>
          <li className="flex items-start gap-2 animate-staggered-fade-in delay-400">
            <span className="text-blue-500 mt-1">•</span>
            <span>Contiene resumen estadístico al final del archivo</span>
          </li>
          <li className="flex items-start gap-2 animate-staggered-fade-in delay-500">
            <span className="text-blue-500 mt-1">•</span>
            <span>El archivo se guardará en tu carpeta de descargas en formato .xlsx</span>
          </li>
        </ul>
      </div>
    </div>
  )
}