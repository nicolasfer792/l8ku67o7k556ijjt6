"use client"

import React from "react"
import { ReservationCalendar } from "./reservation-calendar"
import { NewReservationForm } from "./new-reservation-form"
import { ReservationsList } from "./reservations-list"
import { ExportMonthlyPDF } from "./export-monthly-pdf"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpensesAndStats } from "./expenses-and-stats"
import { ConfigForm } from "./config-form"
import { TrashBin } from "./trash-bin"
import { Calendar, Trash2, Settings, BarChart3 } from "lucide-react"
import { useAtila } from "@/store/atila-provider"
import type { Reservation } from "@/lib/types"

export function Dashboard() {
  const [selectedDate, setSelectedDate] = React.useState<string>("")
  
  const { state } = useAtila()

  return (
    <div className="space-y-6">
      <div className="clean-card p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3 animate-slide-in-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-lg overflow-hidden">
              <img
                src="/Atila.jpg"
                alt="Atila Salón Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-heading text-slate-900">Atila Salón</h1>
              <p className="text-slate-600 font-body">Gestión de eventos</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 animate-slide-in-right">
            <div className="status-indicator">
              <div className="status-dot animate-pulse-dot"></div>
              <span>Sistema Activo</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="reservas" className="w-full">
        <div className="clean-card p-3 mb-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 bg-transparent h-auto p-0">
            <TabsTrigger value="reservas" className="nav-item flex items-center space-x-2 h-12">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="finanzas" className="nav-item flex items-center space-x-2 h-12">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Finanzas</span>
            </TabsTrigger>
            <TabsTrigger value="papelera" className="nav-item flex items-center space-x-2 h-12">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Papelera</span>
            </TabsTrigger>
            <TabsTrigger value="configuracion" className="nav-item flex items-center space-x-2 h-12">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuración</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reservas" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="clean-card p-6">
                <ReservationCalendar onSelectDate={setSelectedDate} />
              </div>
              <div className="clean-card p-6">
                <ExportMonthlyPDF />
              </div>
              <div className="clean-card p-6">
                <ReservationsList />
              </div>
            </div>
            <div className="xl:col-span-1">
              <div className="clean-card p-6 sticky top-24">
                <NewReservationForm defaultDate={selectedDate} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="finanzas">
          <div className="clean-card p-6">
            <ExpensesAndStats />
          </div>
        </TabsContent>

        <TabsContent value="papelera">
          <div className="clean-card p-6">
            <TrashBin />
          </div>
        </TabsContent>

        <TabsContent value="configuracion">
          <div className="clean-card p-6">
            <ConfigForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
