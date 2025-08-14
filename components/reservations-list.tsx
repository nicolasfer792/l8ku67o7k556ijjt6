"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAtila } from "@/store/atila-provider"
import { formatCurrency } from "@/lib/date-utils"
import { Trash2 } from "lucide-react"

export function ReservationsList() {
  const { state, enviarReservaAPapelera } = useAtila()
  const byDate = [...state.reservas].sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg">Reservas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {byDate.length === 0 && <div className="text-sm text-muted-foreground">Sin reservas aún.</div>}
        {byDate.map((r, index) => (
          <div key={r.id} className="flex flex-col sm:flex-row gap-2 sm:items-center border rounded-md p-2 transition-all duration-200 hover:bg-muted hover:shadow-sm animate-staggered-fade-in hover-lift" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex-1">
              <div className="font-medium">{r.nombreCliente}</div>
              <div className="text-xs text-muted-foreground">
                {r.fecha} • {r.estado.toUpperCase()} • {r.esFinDeSemana ? "Fin de semana" : "Entre semana"}
              </div>
            </div>
            <div className="text-sm font-semibold">{formatCurrency(r.total)}</div>
            <Button variant="ghost" size="icon" onClick={() => enviarReservaAPapelera(r.id)} aria-label="Eliminar" className="transition-all duration-200 hover:scale-110 hover:bg-destructive hover:text-destructive-foreground animate-pulse-button">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
