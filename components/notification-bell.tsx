"use client"

import React from "react"
import { useAtila } from "@/store/atila-provider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Bell, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { formatCurrency } from "@/lib/date-utils"
import type { DayStatus, Reservation } from "@/lib/types"
import { PaymentDialog } from "./payment-dialog"

type Severity = "red" | "yellow"

type NotificationItem = {
  id: string
  nombreCliente: string
  fecha: string
  daysUntil: number
  missing: number
  estado: DayStatus
  tipo: "salon" | "patio" | "migrada"
  severity: Severity
  pagado: number
}

function computeDaysUntil(dateISO: string): number {
  const today = new Date()
  const d = new Date(dateISO + "T00:00:00")
  const diffMs = d.getTime() - today.setHours(0, 0, 0, 0)
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function formatDaysText(days: number): string {
  if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`
  if (days === 0) return "Hoy"
  if (days === 1) return "Mañana"
  if (days <= 7) return `En ${days} días`
  return `En ${days} días`
}

function classifySeverity(daysUntil: number): Severity | null {
  if (daysUntil <= 7) return "red"
  if (daysUntil <= 30) return "yellow"
  return null
}

export function NotificationBell() {
  const { state } = useAtila()
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false)
  const [selectedReservationForPayment, setSelectedReservationForPayment] = React.useState<Reservation | null>(null)

  const notifications = React.useMemo<NotificationItem[]>(() => {
    const raw: Array<NotificationItem | null> = (state.reservas || [])
      .filter((r) => r.estado !== "trashed")
      .map((r) => {
        const missing = Math.max((r.total || 0) - (r.pagado || 0), 0)
        const daysUntil = computeDaysUntil(r.fecha)
        const sev = missing > 0 ? classifySeverity(daysUntil) : null
        return sev
          ? {
              id: r.id,
              nombreCliente: r.nombreCliente,
              fecha: r.fecha,
              daysUntil,
              missing,
              estado: r.estado as DayStatus,
              tipo: (r.tipo as any) || "salon",
              severity: sev,
              pagado: r.pagado || 0,
            }
          : null
      })
    return raw.filter((x): x is NotificationItem => !!x)
  }, [state.reservas])

  const red = notifications.filter((n) => n.severity === "red")
  const yellow = notifications.filter((n) => n.severity === "yellow")
  const totalBadge = red.length + yellow.length

  return (
    <>
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-300 hover-lift group shadow-sm"
          aria-label="Notificaciones de pago"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 group-hover:text-teal-700 transition-colors duration-200" />
          {totalBadge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 sm:min-w-6 sm:h-6 px-1 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-full bg-red-500 text-white shadow-lg animate-pulse">
              {totalBadge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[92vw] sm:w-96 max-h-[85vh] p-0 border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl shadow-2xl">
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">🔔 Alertas de Pago</h3>
              <p className="text-sm text-slate-600 mt-1">
                {totalBadge > 0
                  ? `${totalBadge} reserva${totalBadge === 1 ? "" : "s"} con pago pendiente`
                  : "Sin pagos pendientes"}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[65vh] md:max-h-[70vh] pr-1 overflow-y-auto">
          <div className="p-3 space-y-4">
            {totalBadge === 0 && (
              <div className="flex items-center gap-4 p-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-sm">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-sm text-emerald-800">
                  <p className="font-medium">¡Excelente!</p>
                  <p>No hay reservas con pagos pendientes en los próximos 30 días.</p>
                </div>
              </div>
            )}

            {red.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-red-50 rounded-xl">
                  <span className="inline-flex h-3 w-3 rounded-full bg-red-500 shadow-lg" />
                  <span className="text-sm font-bold text-red-800">
                    🚨 Críticas (≤ 7 días o vencidas) — {red.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {red.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        const res = state.reservas.find((rr) => rr.id === n.id)
                        if (res) {
                          setSelectedReservationForPayment(res)
                          setPaymentDialogOpen(true)
                          setPopoverOpen(false)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          const res = state.reservas.find((rr) => rr.id === n.id)
                          if (res) {
                            setSelectedReservationForPayment(res)
                            setPaymentDialogOpen(true)
                            setPopoverOpen(false)
                          }
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-3 hover:shadow-lg hover:border-red-300 active:scale-[0.98] transition-all duration-200 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-bold text-red-800 block truncate">
                                {n.nombreCliente}
                              </span>
                              <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                n.tipo === "patio" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {n.tipo === "patio" ? "Patio" : "Salón"}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-red-700/90">
                            {n.daysUntil < 0
                              ? "El cliente no terminó de pagar (evento vencido)"
                              : n.missing === 0
                              ? "Pago completo"
                              : n.missing > 0 && (n.pagado ?? 0) === 0
                              ? "El cliente no pagó"
                              : "El cliente no terminó de pagar"}
                          </div>
                          <div className="mt-1 text-xs text-red-700/80 flex items-center gap-2">
                            <span>📅 {formatDaysText(n.daysUntil)}</span>
                            <span>• {n.fecha}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-sm font-bold text-red-700 bg-red-100 px-3 py-1 rounded-lg shadow-sm">
                            Falta {formatCurrency(n.missing)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {yellow.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-xl">
                  <span className="inline-flex h-3 w-3 rounded-full bg-amber-400 shadow-lg" />
                  <span className="text-sm font-bold text-amber-800">
                    ⚠️ Próximas (8–30 días) — {yellow.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {yellow.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        const res = state.reservas.find((rr) => rr.id === n.id)
                        if (res) {
                          setSelectedReservationForPayment(res)
                          setPaymentDialogOpen(true)
                          setPopoverOpen(false)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          const res = state.reservas.find((rr) => rr.id === n.id)
                          if (res) {
                            setSelectedReservationForPayment(res)
                            setPaymentDialogOpen(true)
                            setPopoverOpen(false)
                          }
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-3 hover:shadow-lg hover:border-amber-300 active:scale-[0.98] transition-all duration-200 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-bold text-amber-800 block truncate">
                                {n.nombreCliente}
                              </span>
                              <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                n.tipo === "patio" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {n.tipo === "patio" ? "Patio" : "Salón"}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-amber-800/90">
                            El cliente no terminó de pagar
                          </div>
                          <div className="mt-1 text-xs text-amber-700/80 flex items-center gap-2">
                            <span>📅 {formatDaysText(n.daysUntil)}</span>
                            <span>• {n.fecha}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-sm font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg shadow-sm">
                            Falta {formatCurrency(n.missing)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>

    {selectedReservationForPayment && (
      <PaymentDialog
        reservation={selectedReservationForPayment}
        open={paymentDialogOpen}
        onOpenChange={(isOpen) => {
          setPaymentDialogOpen(isOpen)
        }}
      />
    )}
    </>
  )
}