"use client"

import React from "react"
import { ReservationCalendar } from "./reservation-calendar"
import { NewReservationForm } from "./new-reservation-form"
import { ReservationsList } from "./reservations-list"
import { ExportMonthlyExcel } from "./export-monthly-excel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpensesAndStats } from "./expenses-and-stats"
import { ConfigForm } from "./config-form"
import { TrashBin } from "./trash-bin"
import { DateSearch } from "./date-search"
import { Calendar, Trash2, Settings, BarChart3 } from "lucide-react"
import { useAtila } from "@/store/atila-provider"
import type { Reservation } from "@/lib/types"

export function Dashboard() {
  const [selectedDate, setSelectedDate] = React.useState<string>("")
  
  const { state } = useAtila()

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 sm:p-8 animate-fade-in border-0 shadow-2xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center space-x-4 animate-slide-in-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold text-xl overflow-hidden shadow-lg hover-lift transition-all duration-300">
              <img
                src="/Atila.jpg"
                alt="Atila Salón Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                Atila Salón
              </h1>
              <p className="text-slate-600 font-body text-sm sm:text-base font-medium">Sistema de gestión de eventos</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 animate-slide-in-right">
            <DateSearch />
            <div className="status-indicator bg-green-50 border border-green-200 rounded-xl px-4 py-2">
              <div className="status-dot animate-pulse-dot bg-green-500"></div>
              <span className="text-sm sm:text-base font-medium text-green-700">Sistema Activo</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="reservas" className="w-full">
        <div className="glass-card p-4 mb-8 border-0 shadow-xl bg-gradient-to-br from-white/90 via-white/85 to-white/90 backdrop-blur-xl">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-3 bg-transparent h-auto p-0">
            <TabsTrigger value="reservas" className="nav-item flex items-center justify-center space-x-2 h-14 px-4 rounded-xl transition-all duration-300 hover-lift data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
              <Calendar className="h-5 w-5" />
              <span className="hidden sm:inline font-medium">Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="finanzas" className="nav-item flex items-center justify-center space-x-2 h-14 px-4 rounded-xl transition-all duration-300 hover-lift data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
              <BarChart3 className="h-5 w-5" />
              <span className="hidden sm:inline font-medium">Finanzas</span>
            </TabsTrigger>
            <TabsTrigger value="papelera" className="nav-item flex items-center justify-center space-x-2 h-14 px-4 rounded-xl transition-all duration-300 hover-lift data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
              <Trash2 className="h-5 w-5" />
              <span className="hidden sm:inline font-medium">Papelera</span>
            </TabsTrigger>
            <TabsTrigger value="configuracion" className="nav-item flex items-center justify-center space-x-2 h-14 px-4 rounded-xl transition-all duration-300 hover-lift data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
              <Settings className="h-5 w-5" />
              <span className="hidden sm:inline font-medium">Configuración</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reservas" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="glass-card p-6 border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl animate-fade-in">
                <ReservationCalendar onSelectDate={setSelectedDate} />
              </div>
              <div className="glass-card p-6 border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl animate-fade-in delay-200">
                <ExportMonthlyExcel />
              </div>
              <div className="glass-card p-6 border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl animate-fade-in delay-400">
                <ReservationsList />
              </div>
            </div>
            <div className="xl:col-span-1">
              <div className="glass-card p-6 sticky top-24 border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl animate-fade-in delay-600">
                <NewReservationForm defaultDate={selectedDate} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="finanzas">
          <div className="glass-card p-6 border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl animate-fade-in">
            <ExpensesAndStats />
          </div>
        </TabsContent>

        <TabsContent value="papelera">
          <div className="glass-card p-6 border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl animate-fade-in">
            <TrashBin />
          </div>
        </TabsContent>

        <TabsContent value="configuracion">
          <div className="glass-card p-6 border-0 shadow-xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl animate-fade-in">
            <ConfigForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
