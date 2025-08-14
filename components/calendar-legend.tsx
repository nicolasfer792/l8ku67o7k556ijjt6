import { Badge } from "@/components/ui/badge"

export function CalendarLegend() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-100 text-gray-800 hover:bg-emerald-200 transition-colors duration-200 cursor-pointer animate-staggered-fade-in">Libre</Badge>
        <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-200 transition-colors duration-200 cursor-pointer animate-staggered-fade-in delay-100">Interesado</Badge>
        <Badge className="bg-yellow-100 text-gray-800 hover:bg-yellow-200 transition-colors duration-200 cursor-pointer animate-staggered-fade-in delay-200">Señado</Badge>
        <Badge className="bg-rose-100 text-gray-800 hover:bg-rose-200 transition-colors duration-200 cursor-pointer animate-staggered-fade-in delay-300">Confirmado</Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-600 animate-staggered-fade-in delay-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Reserva migrada</span>
        </div>
      </div>
    </div>
  )
}
