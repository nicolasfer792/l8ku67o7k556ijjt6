"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAtila } from "@/store/atila-provider"
import { formatCurrency } from "@/lib/date-utils"
import { Trash2, ChevronDown } from "lucide-react"
import { ReservationDetailsDialog } from "./reservation-details-dialog"

export function ReservationsList() {
  const { state, enviarReservaAPapelera, reservasPorFecha } = useAtila()
  const [isOpen, setIsOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDateForDialog, setSelectedDateForDialog] = useState<string>("")
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
    <><Card className="w-full border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-xl sm:text-2xl font-bold">
          <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Lista de Reservas
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {byDate.length === 0 && <div className="text-sm text-muted-foreground">Sin reservas aún.</div>}
        {initialReservations.map((r, index) => (
          <div key={r.id} onClick={() => { setSelectedDateForDialog(r.fecha); setDialogOpen(true); }} className="cursor-pointer flex flex-col sm:flex-row gap-3 sm:items-center border-2 border-gray-100 rounded-xl p-4 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:border-teal-200 hover:bg-white/80 hover:shadow-lg animate-staggered-fade-in hover-lift group" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex-1">
              <div className="font-semibold text-lg text-gray-800 mb-1">{r.nombreCliente}</div>
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">{r.fecha}</span>
                <span className={`px-2 py-1 rounded-lg font-medium ${
                  r.estado === 'confirmado' ? 'bg-green-50 text-green-700' :
                  r.estado === 'señado' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-orange-50 text-orange-700'
                }`}>
                  {r.estado.toUpperCase()}
                </span>
                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-medium">
                  {r.esFinDeSemana ? "Fin de semana" : "Entre semana"}
                </span>
              </div>
            </div>
            <div className="text-lg font-bold">
              {r.descuentoPorcentaje && r.descuentoPorcentaje > 0 ? (
                <div className="flex flex-col items-end">
                  <span className="text-sm text-orange-600 line-through">
                    {formatCurrency(Math.round(((r.totalConDescuento ?? r.total) / (1 - ((r.descuentoPorcentaje ?? 0) / 100)))))}
                  </span>
                  <span className="text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                    {formatCurrency(r.total)}
                    <span className="text-xs text-orange-600 ml-2 font-semibold">
                      ({r.descuentoPorcentaje}% OFF)
                    </span>
                  </span>
                </div>
              ) : (
                <span className="bg-gray-50 text-gray-800 px-3 py-1 rounded-lg">
                  {formatCurrency(r.total)}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); enviarReservaAPapelera(r.id) }}
              aria-label="Eliminar"
              className="h-12 w-12 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-2 border-transparent group-hover:border-red-200"
            >
              <Trash2 className="size-5" />
            </Button>
          </div>
        ))}

        {remainingReservations.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full h-14 rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm hover:border-teal-300 hover:bg-teal-50 transition-all duration-300 hover-lift font-semibold text-base">
                {isOpen ? "Mostrar menos" : `Mostrar todas (${remainingReservations.length})`}
                <ChevronDown className={`ml-3 h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              {remainingReservations.map((r, index) => (
                <div key={r.id} onClick={() => { setSelectedDateForDialog(r.fecha); setDialogOpen(true); }} className="cursor-pointer flex flex-col sm:flex-row gap-3 sm:items-center border-2 border-gray-100 rounded-xl p-4 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:border-teal-200 hover:bg-white/80 hover:shadow-lg animate-staggered-fade-in hover-lift group" style={{ animationDelay: `${(index + 5) * 50}ms` }}>
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-800 mb-1">{r.nombreCliente}</div>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">{r.fecha}</span>
                      <span className={`px-2 py-1 rounded-lg font-medium ${
                        r.estado === 'confirmado' ? 'bg-green-50 text-green-700' :
                        r.estado === 'señado' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {r.estado.toUpperCase()}
                      </span>
                      <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-medium">
                        {r.esFinDeSemana ? "Fin de semana" : "Entre semana"}
                      </span>
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {r.descuentoPorcentaje && r.descuentoPorcentaje > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-orange-600 line-through">
                          {formatCurrency(Math.round(((r.totalConDescuento ?? r.total) / (1 - ((r.descuentoPorcentaje ?? 0) / 100)))))}
                        </span>
                        <span className="text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                          {formatCurrency(r.total)}
                          <span className="text-xs text-orange-600 ml-2 font-semibold">
                            ({r.descuentoPorcentaje}% OFF)
                          </span>
                        </span>
                      </div>
                    ) : (
                      <span className="bg-gray-50 text-gray-800 px-3 py-1 rounded-lg">
                        {formatCurrency(r.total)}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); enviarReservaAPapelera(r.id) }}
                    aria-label="Eliminar"
                    className="h-12 w-12 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-2 border-transparent group-hover:border-red-200"
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
      <ReservationDetailsDialog
        date={selectedDateForDialog}
        reservations={selectedDateForDialog ? reservasPorFecha(selectedDateForDialog) : []}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
