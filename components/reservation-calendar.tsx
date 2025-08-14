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

function hasMigratedReservations(reservas: ReturnType<typeof useAtila>["state"]["reservas"], iso: string): boolean {
  const rs = reservas.filter((r) => r.fecha === iso)
  return rs.some((r) => r.tipo === "migrada")
}

function colorForStatus(status: DayStatus | "libre") {
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

  const handlePrev = () => setCurrentMonth((m) => addMonths(m, -1))
  const handleNext = () => setCurrentMonth((m) => addMonths(m, 1))

  const handleDayClick = (iso: string) => {
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
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg">
            Calendario de Reservas
            <div className="text-xs text-muted-foreground">
              {currentMonth.toLocaleString("es-ES", { month: "long", year: "numeric" })}
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Mes anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext} aria-label="Mes siguiente">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            <div className="text-center">Dom</div>
            <div className="text-center">Lun</div>
            <div className="text-center">Mar</div>
            <div className="text-center">Mié</div>
            <div className="text-center">Jue</div>
            <div className="text-center">Vie</div>
            <div className="text-center">Sáb</div>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weeks.map((w, i) => (
              <React.Fragment key={i}>
                {w.map((date, j) => {
                  if (!date) return <div key={j} className="aspect-square rounded-md bg-muted/40" />
                  const iso = toISODate(date)
                  const st = statusForDate(state.reservas, iso)
                  const hasMigrated = hasMigratedReservations(state.reservas, iso)
                  return (
                    <button
                      key={j}
                      className={cn(
                        "aspect-square rounded-md border text-left p-1 sm:p-2 transition",
                        "flex flex-col relative",
                        colorForStatus(st), // Apply background to the button
                        "text-gray-800", // Ensure text is readable on light background
                        st !== "libre" && "hover:bg-opacity-80", // Add hover effect for non-libre days
                        st === "libre" && "hover:bg-muted", // Keep original hover for libre days
                      )}
                      onClick={() => handleDayClick(iso)}
                      aria-label={`Día ${date.getDate()} estado ${st}`}
                    >
                      <div className="text-[10px] sm:text-xs font-medium">{date.getDate()}</div>
                      <div className="mt-auto flex items-center gap-1">
                        <span className="text-[10px] sm:text-xs capitalize">{st}</span>
                        {hasMigrated && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" title="Reserva migrada" />
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
