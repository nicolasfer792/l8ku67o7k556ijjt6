"use client"

import React from "react"
import { addMonths, endOfMonth, startOfMonth, toISODate } from "@/lib/date-utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAtila } from "@/store/atila-provider"
import type { DayStatus } from "@/lib/types"
import { CalendarLegend } from "./calendar-legend"
import { cn } from "@/lib/utils"
import { ReservationDetailsDialog } from "./reservation-details-dialog"

type Props = {
  onSelectDate?: (iso: string) => void
  defaultMonth?: Date
}

const STATUS_ORDER: DayStatus[] = ["interesado", "señado", "confirmado"]

function statusForDate(reservas: ReturnType<typeof useAtila>["state"]["reservas"], iso: string): DayStatus | "libre" {
  const rs = reservas.filter((r) => r.fecha === iso)
  if (rs.length === 0) return "libre"
  // tomar el estado más "alto" según prioridad
  for (let i = STATUS_ORDER.length - 1; i >= 0; i--) {
    if (rs.some((r) => r.estado === STATUS_ORDER[i])) return STATUS_ORDER[i]
  }
  return "interesado"
}

function reservationsForDate(reservas: ReturnType<typeof useAtila>["state"]["reservas"], iso: string) {
  return reservas.filter((r) => r.fecha === iso)
}

function colorForStatus(status: DayStatus | "libre"): string {
  switch (status) {
    case "libre":
      return "bg-emerald-100" // Lighter shade
    case "interesado":
      return "bg-orange-100" // Lighter shade
    case "señado":
      return "bg-yellow-100" // Lighter shade
    case "confirmado":
      return "bg-rose-100" // Lighter shade
    case "trashed":
      return "bg-gray-200" // Gris para trashed
  }
}

export function ReservationCalendar(
  { onSelectDate, defaultMonth }: Props = { onSelectDate: () => {}, defaultMonth: new Date() },
) {
  const { state, reservasPorFecha } = useAtila()
  const [currentMonth, setCurrentMonth] = React.useState<Date>(defaultMonth ?? new Date())
  const [dialogOpen, setDialogOpen] = React.useState(false)
 const [selectedDateForDialog, setSelectedDateForDialog] = React.useState<string>("")

  const start = startOfMonth(currentMonth)
  const end = endOfMonth(currentMonth)
  const daysInMonth = end.getDate()
  const firstWeekday = start.getDay() // 0 = Sunday, 6 = Saturday

  const handlePrev = () => {
    setCurrentMonth((m) => addMonths(m, -1))
    setDialogOpen(false) // Close dialog on month navigation
  }
  const handleNext = () => {
    setCurrentMonth((m) => addMonths(m, 1))
    setDialogOpen(false) // Close dialog on month navigation
  }

  const handleDayClick = (iso: string, event: React.MouseEvent) => {
    // Add pulse animation to the clicked day
    const clickedElement = event.target as HTMLElement;
    if (clickedElement) {
      clickedElement.classList.add('animate-pulse-subtle');
      setTimeout(() => {
        clickedElement.classList.remove('animate-pulse-subtle');
      }, 500);
    }
    
    onSelectDate && onSelectDate(iso)
    const reservationsForDay = reservasPorFecha(iso)
    if (reservationsForDay.length > 0) {
      setSelectedDateForDialog(iso)
      setDialogOpen(true)
    }
  }

  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = new Array(firstWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  return (
    <>
      <Card className="w-full border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="text-xl md:text-2xl font-bold">
            <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Calendario de Reservas
            </span>
            <div className="text-sm text-slate-500 font-medium mt-1">
              {currentMonth.toLocaleString("es-ES", { month: "long", year: "numeric" })}
            </div>
          </CardTitle>
          <div className="flex gap-3 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              aria-label="Mes anterior"
              className="h-12 w-12 rounded-xl border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-300 hover-lift"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              aria-label="Mes siguiente"
              className="h-12 w-12 rounded-xl border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-300 hover-lift"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 text-sm md:text-base font-medium text-muted-foreground mb-2">
            <div className="text-center">Dom</div>
            <div className="text-center">Lun</div>
            <div className="text-center">Mar</div>
            <div className="text-center">Mié</div>
            <div className="text-center">Jue</div>
            <div className="text-center">Vie</div>
            <div className="text-center">Sáb</div>
          </div>
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {weeks.map((w, i) => (
              <React.Fragment key={i}>
                {w.map((date, j) => {
                  if (!date) return <div key={j} className="aspect-square rounded-xl bg-gray-50/50 backdrop-blur-sm" />
                  const iso = toISODate(date)
                  const st = statusForDate(state.reservas, iso)
                  const dailyReservations = reservationsForDate(state.reservas, iso)
                  return (
                    <button
                      key={j}
                      className={cn(
                        "aspect-square rounded-xl border-2 text-left p-2 sm:p-3 transition-all duration-300 hover-lift hover:shadow-lg",
                        "flex flex-col relative group",
                        colorForStatus(st as DayStatus | "libre"),
                        "text-gray-800 font-medium",
                        st !== "libre" && "hover:bg-opacity-90 hover:border-gray-300",
                        st === "libre" && "hover:bg-gray-100/80 hover:border-gray-300",
                        "focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400",
                        "animate-fade-in"
                      )}
                      onClick={(e) => handleDayClick(iso, e)}
                      aria-label={`Día ${date.getDate()} estado ${st}`}
                      role="button"
                      tabIndex={0}
                      style={{ animationDelay: `${(i * 7 + j) * 20}ms` }}
                    >
                      <div className="text-sm md:text-base font-bold mb-1">{date.getDate()}</div>
                      {dailyReservations.some((r) => r.tipo === "migrada") && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full shadow-sm animate-pulse" title="Reserva migrada" />
                      )}
                      <div className="mt-auto flex flex-col items-start gap-1 min-w-0">
                        {dailyReservations
                          .filter((r) => r.tipo !== "migrada")
                          .map((r) => (
                            <span key={r.id} className="text-xs md:text-sm capitalize truncate font-medium bg-white/60 px-1.5 py-0.5 rounded-md">
                              {r.tipo}
                            </span>
                          ))}
                    {dailyReservations.length === 0 && (
                      <span className="text-xs md:text-sm capitalize truncate opacity-70">{st}</span>
                    )}
                    </div>
                    </button>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-4">
            <CalendarLegend />
          </div>
        </CardContent>
      </Card>
      <ReservationDetailsDialog
        date={selectedDateForDialog}
        reservations={reservasPorFecha(selectedDateForDialog)}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
