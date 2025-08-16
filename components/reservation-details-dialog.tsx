"use client"
import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/date-utils"
import type { Reservation } from "@/lib/types"
import { useAtila } from "@/store/atila-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Calendar, Users, Clock, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EditReservationForm } from "./edit-reservation-form"

type Props = {
  date: string
  reservations: Reservation[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getDaysUntilEvent(eventDate: string): number {
  const today = new Date()
  const event = new Date(eventDate + "T00:00:00")
  const diffTime = event.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

function formatDaysRemaining(days: number): string {
  if (days < 0) return `Hace ${Math.abs(days)} días`
  if (days === 0) return "Hoy"
  if (days === 1) return "Mañana"
  return `En ${days} días`
}

export function ReservationDetailsDialog({ date, reservations, open, onOpenChange }: Props) {
  const { enviarReservaAPapelera, refresh, state } = useAtila()
  const [editingReservation, setEditingReservation] = React.useState<Reservation | null>(null)

  const handleTrash = async (id: string) => {
    await enviarReservaAPapelera(id)
    refresh() // Refrescar el estado global para que el calendario se actualice
    onOpenChange(false) // Cerrar el diálogo
  }

  const getExtraDetails = (reservation: Reservation) => {
    const extrasFijos = reservation.extrasFijosSeleccionados
      .map((id) => state.config.extrasFijos.find((extra) => extra.id === id))
      .filter((extra): extra is NonNullable<typeof extra> => !!extra)

    const itemsPorCantidad = Object.entries(reservation.cantidades)
      .map(([id, cantidad]) => {
        const item = state.config.itemsPorCantidad.find((item) => item.id === id)
        return item ? { ...item, cantidad } : null
      })
      .filter((item): item is NonNullable<typeof item> => !!item)

    return { extrasFijos, itemsPorCantidad }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEditingReservation(null)
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        {editingReservation ? (
          <EditReservationForm
            reservation={editingReservation}
            onEdited={() => {
              setEditingReservation(null)
              onOpenChange(false)
            }}
            onCancel={() => setEditingReservation(null)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Detalles de Reservas para{" "}
                {new Date(date + "T00:00:00").toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </DialogTitle>
              <DialogDescription>Información completa de las reservas para esta fecha.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {reservations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay reservas activas para esta fecha.</p>
              ) : (
                reservations.map((r) => {
                  const daysRemaining = getDaysUntilEvent(r.fecha)
                  const { extrasFijos, itemsPorCantidad } = getExtraDetails(r)

                  return (
                    <div key={r.id} className="border rounded-lg p-4 space-y-4 bg-card">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-xl">{r.nombreCliente}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span
                              className={`font-medium ${
                                daysRemaining < 0
                                  ? "text-red-600"
                                  : daysRemaining <= 7
                                    ? "text-orange-600"
                                    : "text-green-600"
                              }`}
                            >
                              {formatDaysRemaining(daysRemaining)}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`${
                            r.estado === "señado"
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              : r.estado === "confirmado"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                          }`}
                        >
                          {r.estado.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Personas:</span>
                            <span className="text-sm">{r.cantidadPersonas}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Tipo:</span>
                            <span className="text-sm">{r.esFinDeSemana ? "Fin de semana" : "Entre semana"}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Total:</span>
                            <span className="text-lg font-bold text-green-600">{formatCurrency(r.total)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Creado:</span>
                            <span className="ml-2 text-muted-foreground">
                              {new Date(r.creadoEn).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {r.notas && (
                        <div className="bg-muted/50 rounded-md p-3">
                          <h4 className="text-sm font-medium mb-1">Notas del evento:</h4>
                          <p className="text-sm text-muted-foreground italic">{r.notas}</p>
                        </div>
                      )}

                      {(extrasFijos.length > 0 || itemsPorCantidad.length > 0) && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">Servicios contratados:</h4>

                          {extrasFijos.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-2">Servicios fijos:</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {extrasFijos.map((extra) => (
                                  <div
                                    key={extra.id}
                                    className="flex justify-between items-center bg-muted/30 rounded px-2 py-1"
                                  >
                                    <span className="text-sm">{extra.nombre}</span>
                                    <span className="text-sm font-medium">{formatCurrency(extra.precio)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {itemsPorCantidad.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-2">Items por cantidad:</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {itemsPorCantidad.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between items-center bg-muted/30 rounded px-2 py-1"
                                  >
                                    <span className="text-sm">
                                      {item.nombre} x{item.cantidad}
                                    </span>
                                    <span className="text-sm font-medium">
                                      {formatCurrency(item.precioUnitario * item.cantidad)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end pt-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingReservation(r)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" /> Enviar a Papelera
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción enviará la reserva de {r.nombreCliente} a la papelera. Podrás recuperarla
                                desde la sección "Papelera" en los próximos 7 días, después de los cuales se eliminará
                                permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleTrash(r.id)}>
                                Sí, enviar a papelera
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
