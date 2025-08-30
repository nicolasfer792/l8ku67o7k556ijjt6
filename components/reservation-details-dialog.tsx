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
import { Badge } from "@/components/ui/badge"
import { EditReservationForm } from "./edit-reservation-form"
import { PaymentDialog } from "./payment-dialog"

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
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false)
  const [selectedReservationForPayment, setSelectedReservationForPayment] = React.useState<Reservation | null>(null)

  const handleTrash = async (id: string) => {
    await enviarReservaAPapelera(id)
    refresh() // Refrescar el estado global para que el calendario se actualice
    onOpenChange(false) // Cerrar el diálogo
  }

  const getExtraDetails = (reservation: Reservation) => {
    // Para extras fijos, usamos los precios de la configuración actual porque no tenemos precios fijos guardados
    const extrasFijos = reservation.extrasFijosSeleccionados
      .map((id) => state.config.extrasFijos.find((extra) => extra.id === id))
      .filter((extra): extra is NonNullable<typeof extra> => !!extra)

    // Para items por cantidad, usamos los precios fijos guardados en la reserva si están disponibles
    const itemsPorCantidad: any[] = []
    
    Object.entries(reservation.cantidades).forEach(([id, data]) => {
      if (typeof data === "object" && data !== null && "precioUnitarioFijo" in data) {
        // Usar el precio unitario fijo guardado en la reserva
        const itemData = data as { cantidad: number; precioUnitarioFijo: number }
        // Buscar el nombre del item en la configuración actual
        const itemTemplate = state.config.itemsPorCantidad.find((item) => item.id === id)
        if (itemTemplate || itemData.precioUnitarioFijo > 0) {
          itemsPorCantidad.push({
            id,
            nombre: itemTemplate ? itemTemplate.nombre : "Item desconocido",
            precioUnitario: itemData.precioUnitarioFijo,
            cantidad: itemData.cantidad
          })
        }
      } else if (typeof data === "number") {
        // Fallback para el formato antiguo (si existe)
        const cantidad = data
        const itemTemplate = state.config.itemsPorCantidad.find((item) => item.id === id)
        if (itemTemplate) {
          itemsPorCantidad.push({ ...itemTemplate, cantidad })
        }
      }
    })

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
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                <span aria-hidden>📅</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Detalles de Reservas
                </span>
              </DialogTitle>
              <div className="space-y-2">
                <div className="text-lg font-semibold text-gray-800">
                  {new Date(date + "T00:00:00").toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <DialogDescription className="text-gray-600 text-base">
                  Información completa de las reservas para esta fecha. Aquí puedes ver todos los detalles,
                  gestionar pagos y editar información.
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {reservations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay reservas activas para esta fecha.</p>
              ) : (
                reservations.map((r) => {
                  const daysRemaining = getDaysUntilEvent(r.fecha)
                  const { extrasFijos, itemsPorCantidad } = getExtraDetails(r)
                  // Safe discount calculations based only on porcentaje, since DB total is already discounted
                  const p = r.descuentoPorcentaje ?? 0
                  const hasDiscount = p > 0
                  const originalTotal = hasDiscount ? Math.round(r.total / (1 - p / 100)) : r.total
                  const discountAmount = hasDiscount ? (originalTotal - r.total) : 0
                  const totalToCharge = r.total

                  return (
                    <div key={r.id} className="border rounded-lg p-4 space-y-4 bg-gradient-to-br from-white to-gray-50/50 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-bold text-2xl text-gray-900">{r.nombreCliente}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span
                              className={`font-semibold px-3 py-1 rounded-full text-xs ${
                                daysRemaining < 0
                                  ? "text-red-700 bg-red-100"
                                  : daysRemaining <= 7
                                    ? "text-orange-700 bg-orange-100"
                                    : "text-green-700 bg-green-100"
                              }`}
                            >
                              🕒 {formatDaysRemaining(daysRemaining)}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`px-3 py-1 font-semibold text-xs ${
                            r.estado === "señado"
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 hover:from-yellow-500 hover:to-yellow-600"
                              : r.estado === "confirmado"
                                ? "bg-gradient-to-r from-green-400 to-green-500 text-green-900 hover:from-green-500 hover:to-green-600"
                                : "bg-gradient-to-r from-blue-400 to-blue-500 text-blue-900 hover:from-blue-500 hover:to-blue-600"
                          }`}
                        >
                          {r.estado.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">👥 Personas:</span>
                            <span className="text-sm font-semibold">{r.cantidadPersonas}</span>
                          </div>

                          {r.telefono && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Teléfono:</span>
                              <span className="text-sm">{r.telefono}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">🏢 Tipo:</span>
                            <span className="text-sm font-semibold capitalize">{r.tipo === "migrada" ? "Migrada" : r.tipo || "Salón"}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Modalidad:</span>
                            <span className="text-sm">{r.esFinDeSemana ? "Fin de semana" : "Entre semana"}</span>
                          </div>

                          {/* Ultra Compact Pricing Section */}
                          <div className="bg-slate-50 rounded-md p-2 space-y-1 border border-slate-200">
                            {hasDiscount ? (
                              <>
                                <div className="text-xs text-slate-600 font-medium mb-1">
                                  💵 Total original: <span className="text-sm font-bold text-slate-800">{formatCurrency(originalTotal)}</span>
                                </div>
                                <div className="text-xs text-red-600 font-medium">
                                  🎉 Descuento {r.descuentoPorcentaje}%: <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                                </div>
                                <div className="text-xs text-blue-600 font-medium">
                                  💰 Total a cobrar: <span className="text-sm font-bold text-blue-700">{formatCurrency(totalToCharge)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-blue-600 font-medium">
                                💰 Total: <span className="text-sm font-bold text-blue-700">{formatCurrency(totalToCharge)}</span>
                              </div>
                            )}

                            <div className="text-xs text-emerald-600 font-medium">
                              📈 Ganancias: <span className="font-bold text-emerald-700">{formatCurrency(totalToCharge - (r.costoLimpieza || 0))}</span>
                            </div>
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
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                            📝 Notas del evento:
                          </h4>
                          <p className="text-sm text-blue-700 italic leading-relaxed">{r.notas}</p>
                        </div>
                      )}

                      {(extrasFijos.length > 0 || itemsPorCantidad.length > 0) && (
                        <div className="space-y-3">
                          <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            🛍️ Servicios contratados:
                          </h4>

                          {extrasFijos.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                                ✨ Servicios fijos:
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {extrasFijos.map((extra) => (
                                  <div
                                    key={extra.id}
                                    className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3 hover:shadow-sm transition-all duration-200"
                                  >
                                    <span className="text-sm font-medium text-purple-800">{extra.nombre}</span>
                                    <span className="text-sm font-bold text-purple-600">{formatCurrency(extra.precio)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {itemsPorCantidad.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                                📦 Items por cantidad:
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {itemsPorCantidad.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between items-center bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg px-4 py-3 hover:shadow-sm transition-all duration-200"
                                  >
                                    <span className="text-sm font-medium text-orange-800">
                                      {item.nombre} × {item.cantidad}
                                    </span>
                                    <span className="text-sm font-bold text-orange-600">
                                      {formatCurrency(item.precioUnitario * item.cantidad)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons Section */}
                      <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingReservation(r)}
                          className="flex items-center gap-2 bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-200"
                        >
                          ✏️ Editar
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 transition-all duration-200"
                            >
                              🗑️ Enviar a Papelera
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white border-2 border-red-200">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-red-800">¿Estás absolutamente seguro?</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-600">
                                Esta acción enviará la reserva de <strong>{r.nombreCliente}</strong> a la papelera.
                                Podrás recuperarla desde la sección "Papelera" en los próximos 7 días, después de los
                                cuales se eliminará permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleTrash(r.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Sí, enviar a papelera
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          size="sm"
                          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 transition-all duration-200 shadow-md hover:shadow-lg"
                          onClick={() => {
                            setSelectedReservationForPayment(r)
                            setPaymentDialogOpen(true)
                          }}
                        >
                          💰 Estado de Pago
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
        
        {/* Payment Dialog */}
        {selectedReservationForPayment && (
          <PaymentDialog
            reservation={selectedReservationForPayment}
            open={paymentDialogOpen}
            onOpenChange={(isOpen) => {
              setPaymentDialogOpen(isOpen)
              if (isOpen) {
                refresh()
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
