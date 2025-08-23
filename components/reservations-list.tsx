"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAtila } from "@/store/atila-provider"
import { formatCurrency } from "@/lib/date-utils"
import { Trash2, ChevronDown } from "lucide-react"

export function ReservationsList() {
  const { state, enviarReservaAPapelera } = useAtila()
  const [isOpen, setIsOpen] = useState(false)
  const byDate = [...state.reservas].sort((a, b) => {
    const dateA = new Date(a.fecha)
    const dateB = new Date(b.fecha)
    const now = new Date()

    const diffA = Math.abs(dateA.getTime() - now.getTime())
    const diffB = Math.abs(dateB.getTime() - now.getTime())

    return diffA - diffB
  })

  const initialReservations = byDate.slice(0, 5)
  const remainingReservations = byDate.slice(5)

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg">Reservas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {byDate.length === 0 && <div className="text-sm text-muted-foreground">Sin reservas aún.</div>}
        {initialReservations.map((r, index) => (
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

        {remainingReservations.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                {isOpen ? "Mostrar menos" : `Mostrar todas (${remainingReservations.length})`}
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              {remainingReservations.map((r, index) => (
                <div key={r.id} className="flex flex-col sm:flex-row gap-2 sm:items-center border rounded-md p-2 transition-all duration-200 hover:bg-muted hover:shadow-sm animate-staggered-fade-in hover-lift" style={{ animationDelay: `${(index + 5) * 50}ms` }}>
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
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
