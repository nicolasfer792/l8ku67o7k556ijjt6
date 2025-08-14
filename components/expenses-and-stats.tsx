"use client"

import React from "react"
import { useAtila } from "@/store/atila-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts"
import { formatCurrency } from "@/lib/date-utils"
import { format, startOfWeek } from "date-fns"

function groupByPeriod(
  reservas: ReturnType<typeof useAtila>["state"]["reservas"],
  gastos: ReturnType<typeof useAtila>["state"]["gastos"],
  period: "semana" | "mes" | "anio",
) {
  // Ahora incluimos 'ganancia' y 'perdida' como campos separados
  type Row = { key: string; ingresos: number; gastos: number; ganancia: number; perdida: number }
  const map = new Map<string, Row>()

  const keyFor = (iso: string) => {
    const d = new Date(iso + "T00:00:00")
    if (period === "anio") return `${d.getFullYear()}`
    if (period === "mes") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    // Formato de semana: YYYY-MM-DD (inicio de semana)
    // weekStartsOn: 1 para que la semana empiece en Lunes
    return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd")
  }

  reservas.forEach((r) => {
    const k = keyFor(r.fecha)
    const row = map.get(k) ?? { key: k, ingresos: 0, gastos: 0, ganancia: 0, perdida: 0 }
    row.ingresos += r.total
    map.set(k, row)
  })
  gastos.forEach((g) => {
    const k = keyFor(g.fecha)
    const row = map.get(k) ?? { key: k, ingresos: 0, gastos: 0, ganancia: 0, perdida: 0 }
    row.gastos += g.monto
    map.set(k, row)
  })

  // Calculamos ganancia y pérdida por separado
  const rows = Array.from(map.values()).map((r) => {
    const utilidad = r.ingresos - r.gastos
    return {
      ...r,
      ganancia: utilidad > 0 ? utilidad : 0,
      perdida: utilidad < 0 ? Math.abs(utilidad) : 0, // Pérdida como valor positivo
    }
  })
  rows.sort((a, b) => a.key.localeCompare(b.key))

  return rows
}

export function ExpensesAndStats() {
  const { state, agregarGasto, eliminarGasto } = useAtila()
  const [nombre, setNombre] = React.useState("")
  const [monto, setMonto] = React.useState<number>(0)
  const [fecha, setFecha] = React.useState<string>(new Date().toISOString().slice(0, 10))
  const [periodo, setPeriodo] = React.useState<"semana" | "mes" | "anio">("mes")

  const data = groupByPeriod(state.reservas, state.gastos, periodo)

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !fecha) return
    agregarGasto({ nombre, monto, fecha })
    setNombre("")
    setMonto(0)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
      <Card className="w-full hover-lift">
        <CardHeader>
          <CardTitle className="animate-slide-in-left">Gastos extras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2 animate-staggered-fade-in">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Compra o gasto" className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50" />
            </div>
            <div className="animate-staggered-fade-in delay-100">
              <Label>Monto</Label>
              <Input type="number" value={monto} onChange={(e) => setMonto(Number(e.target.value))} className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50" />
            </div>
            <div className="animate-staggered-fade-in delay-200">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50" />
            </div>
            <div className="sm:col-span-4 flex justify-end animate-staggered-fade-in delay-300">
              <Button type="submit" className="hover-lift transition-all duration-200 hover:shadow-md">Agregar gasto</Button>
            </div>
          </form>

          <div className="space-y-2">
            {state.gastos.length === 0 && <div className="text-sm text-muted-foreground animate-fade-in">Sin gastos registrados.</div>}
            {state.gastos.map((g, index) => (
              <div key={g.id} className="flex items-center gap-2 border rounded-md p-2 hover-lift transition-all duration-200 hover:shadow-sm animate-staggered-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex-1">
                  <div className="font-medium">{g.nombre}</div>
                  <div className="text-xs text-muted-foreground">{g.fecha}</div>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(g.monto)}</div>
                <Button variant="ghost" size="icon" onClick={() => eliminarGasto(g.id)} className="transition-all duration-200 hover:scale-110 hover:bg-destructive hover:text-destructive-foreground">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full hover-lift">
        <CardHeader>
          <CardTitle className="animate-slide-in-right">Estadísticas financieras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 text-sm animate-staggered-fade-in delay-400">
            <Button variant={periodo === "semana" ? "default" : "outline"} onClick={() => setPeriodo("semana")} className="transition-all duration-200 hover:scale-105">
              Semanal
            </Button>
            <Button variant={periodo === "mes" ? "default" : "outline"} onClick={() => setPeriodo("mes")} className="transition-all duration-200 hover:scale-105">
              Mensual
            </Button>
            <Button variant={periodo === "anio" ? "default" : "outline"} onClick={() => setPeriodo("anio")} className="transition-all duration-200 hover:scale-105">
              Anual
            </Button>
          </div>
          <div className="h-64 animate-staggered-fade-in delay-500">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ingresos" fill="#047857" name="Ingresos" /> {/* Verde oscuro */}
                <Bar dataKey="gastos" fill="#f97316" name="Gastos" />
                <Bar dataKey="ganancia" fill="#22c55e" name="Ganancia" /> {/* Verde vibrante */}
                {/* La barra de "Pérdida" se ha eliminado */}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 animate-staggered-fade-in delay-600">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ingresos" stroke="#047857" /> {/* Verde oscuro */}
                <Line type="monotone" dataKey="gastos" stroke="#f97316" />
                <Line type="monotone" dataKey="ganancia" stroke="#22c55e" /> {/* Verde vibrante */}
                {/* La línea de "Pérdida" se ha eliminado */}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
