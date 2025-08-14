"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAtila } from "@/store/atila-provider"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency } from "@/lib/date-utils"
import { Download, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function downloadPDFOnMobile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)

  // Create a temporary link element
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.style.display = "none"

  // Add to DOM, click, and remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function ExportMonthlyPDF() {
  const { listReservationsByMonth, state } = useAtila()
  const [month, setMonth] = React.useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [loading, setLoading] = React.useState(false)

  const exportPdf = async () => {
    setLoading(true)
    try {
      const data = await listReservationsByMonth(month)
      const doc = new jsPDF()

      const title = `Reporte Mensual - Atila Salón de Fiestas`
      const subtitle = `Período: ${new Date(month + "-01").toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`

      doc.setFontSize(16)
      doc.text(title, 14, 16)
      doc.setFontSize(12)
      doc.text(subtitle, 14, 24)
      doc.text(`Generado: ${new Date().toLocaleDateString("es-ES")}`, 14, 30)

      const rows = data.map((r) => [
        new Date(r.fecha + "T00:00:00").toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        }),
        r.nombreCliente,
        r.estado.toUpperCase(),
        String(r.cantidadPersonas),
        r.esFinDeSemana ? "Fin de semana" : "Entre semana",
        formatCurrency(r.total),
        r.notas ? r.notas.substring(0, 20) + (r.notas.length > 20 ? "..." : "") : "-",
      ])

      const total = data.reduce((acc, r) => acc + r.total, 0)
      const totalReservations = data.length
      const confirmedReservations = data.filter((r) => r.estado === "confirmado").length
      const averageGuests =
        data.length > 0 ? Math.round(data.reduce((acc, r) => acc + r.cantidadPersonas, 0) / data.length) : 0

      autoTable(doc, {
        head: [["Fecha", "Cliente", "Estado", "Personas", "Tipo", "Total", "Notas"]],
        body: rows,
        startY: 38,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 114, 94] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 30 },
        },
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 38

      doc.setFontSize(12)
      doc.text("RESUMEN DEL MES", 14, finalY + 15)

      doc.setFontSize(10)
      doc.text(`Total de reservas: ${totalReservations}`, 14, finalY + 25)
      doc.text(`Reservas confirmadas: ${confirmedReservations}`, 14, finalY + 32)
      doc.text(`Promedio de invitados: ${averageGuests} personas`, 14, finalY + 39)
      doc.text(`Ingresos totales: ${formatCurrency(total)}`, 14, finalY + 46)

      const statusBreakdown = data.reduce(
        (acc, r) => {
          acc[r.estado] = (acc[r.estado] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      let yPos = finalY + 56
      doc.text("Desglose por estado:", 14, yPos)
      Object.entries(statusBreakdown).forEach(([status, count]) => {
        yPos += 7
        doc.text(`• ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`, 20, yPos)
      })

      const filename = `atila-reservas-${month}.pdf`

      if (isMobileDevice()) {
        const pdfBlob = doc.output("blob")
        downloadPDFOnMobile(pdfBlob, filename)

        toast({
          title: "PDF generado",
          description: "El archivo se ha descargado. Revisa tu carpeta de descargas.",
        })
      } else {
        doc.save(filename)
        toast({
          title: "PDF generado",
          description: `Archivo ${filename} descargado exitosamente.`,
        })
      }
    } catch (error: any) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error al generar PDF",
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
        <Button onClick={exportPdf} disabled={loading} className="w-full sm:w-auto hover-lift transition-all duration-200 hover:shadow-md" size="default">
          {loading ? (
            <>
              <FileText className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md animate-staggered-fade-in delay-200">
        <p className="font-medium mb-1">Información del reporte:</p>
        <ul className="space-y-1">
          <li className="animate-staggered-fade-in delay-300">• Incluye todas las reservas activas del mes seleccionado</li>
          <li className="animate-staggered-fade-in delay-400">• Contiene resumen estadístico y desglose por estado</li>
          <li className="animate-staggered-fade-in delay-500">• Compatible con dispositivos móviles y de escritorio</li>
          <li className="animate-staggered-fade-in delay-600">• El archivo se guardará en tu carpeta de descargas</li>
        </ul>
      </div>
    </div>
  )
}
