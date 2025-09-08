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
          className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-300 hover-lift group"
          aria-label="Notificaciones de pago"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 group-hover:text-teal-700 transition-colors" />
          {totalBadge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 sm:min-w-6 sm:h-6 px-1 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-full bg-red-600 text-white shadow-lg">
              {totalBadge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[92vw] sm:w-96 max-h-[85vh] p-0 border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl shadow-2xl">
        <div className="px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-800">Alertas de pago</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
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
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div className="text-sm text-emerald-700">
                  No hay reservas con pagos pendientes en los próximos 30 días.
                </div>
              </div>
            )}

            {red.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-red-500 shadow" />
                  <span className="text-xs sm:text-sm font-semibold text-red-700">
                    Críticas (≤ 7 días o vencidas) — {red.length}
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
                      className="cursor-pointer rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-2 sm:p-3 hover:shadow-md hover:border-red-300 active:scale-[0.99] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-[13px] sm:text-sm font-semibold text-red-800 truncate">
                              {n.nombreCliente}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] sm:text-xs text-red-700/90">
                            {n.daysUntil < 0
                              ? "El cliente no terminó de pagar (evento vencido)"
                              : n.missing === 0
                              ? "Pago completo"
                              : n.missing > 0 && (n.pagado ?? 0) === 0
                              ? "El cliente no pagó"
                              : "El cliente no terminó de pagar"}
                          </div>
                          <div className="mt-1 text-[11px] text-red-700/80">
                            {formatDaysText(n.daysUntil)} • {n.fecha}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-lg">
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-400 shadow" />
                  <span className="text-xs sm:text-sm font-semibold text-amber-700">
                    Próximas (8–30 días) — {yellow.length}
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
                      className="cursor-pointer rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-2 sm:p-3 hover:shadow-md hover:border-amber-300 active:scale-[0.99] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-[13px] sm:text-sm font-semibold text-amber-800 truncate">
                              {n.nombreCliente}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] sm:text-xs text-amber-800/90">
                            El cliente no terminó de pagar
                          </div>
                          <div className="mt-1 text-[11px] text-amber-700/80">
                            {formatDaysText(n.daysUntil)} • {n.fecha}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
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