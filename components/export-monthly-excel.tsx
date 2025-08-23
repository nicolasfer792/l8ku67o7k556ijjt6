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
            if (cantidad > 0) {
              const item = config.itemsPorCantidad.find((i) => i.id === id)
              return item ? `${cantidad}x ${item.nombre}` : `${cantidad}x ${id}`
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
        <div className="w-full sm:w-auto animate-staggered-fade-in">
          <label className="block text-sm mb-1 font-medium">Mes a exportar</label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full sm:w-auto transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50" />
        </div>
        <Button onClick={exportExcel} disabled={loading} className="w-full sm:w-auto hover-lift transition-all duration-200 hover:shadow-md" size="default">
          {loading ? (
            <>
              <FileText className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Descargar Excel
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md animate-staggered-fade-in delay-200">
        <p className="font-medium mb-1">Información del reporte:</p>
        <ul className="space-y-1">
          <li className="animate-staggered-fade-in delay-300">• Incluye todas las reservas activas del mes seleccionado</li>
          <li className="animate-staggered-fade-in delay-400">• Contiene resumen estadístico al final del archivo</li>
          <li className="animate-staggered-fade-in delay-500">• El archivo se guardará en tu carpeta de descargas en formato .xlsx</li>
        </ul>
      </div>
    </div>
  )
}