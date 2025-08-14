"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAtila } from "@/store/atila-provider"
import { computeReservationTotal } from "@/lib/pricing"
import { PriceBreakdown } from "./price-breakdown"
import type { DayStatus } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  defaultDate?: string
  onCreated?: (id: string) => void
}

export function NewReservationForm({ defaultDate, onCreated }: Props = { defaultDate: "", onCreated: () => {} }) {
  const { state, addReserva } = useAtila()
  const [nombre, setNombre] = React.useState("")
  const [fecha, setFecha] = React.useState<string>(defaultDate || "")
  const [personas, setPersonas] = React.useState<number>(0)
  const [estado, setEstado] = React.useState<DayStatus>("interesado")
  const [extrasSel, setExtrasSel] = React.useState<string[]>([])
  const [cantidades, setCantidades] = React.useState<Record<string, number>>({})
  const [notas, setNotas] = React.useState("") // Nuevo estado para notas

  React.useEffect(() => {
    setFecha(defaultDate || "")
  }, [defaultDate])

  const calc = computeReservationTotal(
    {
      nombreCliente: nombre || "",
      fecha: fecha || new Date().toISOString().slice(0, 10),
      cantidadPersonas: personas || 0,
      extrasFijosSeleccionados: extrasSel,
      cantidades,
      estado,
      notas, // Incluir notas en el cálculo (aunque no afecte el precio)
    },
    state.config,
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !fecha) {
      toast({ title: "Error", description: "Nombre y fecha son obligatorios.", variant: "destructive" })
      return
    }
    try {
      const nuevo = await addReserva({
        nombreCliente: nombre,
        fecha,
        cantidadPersonas: personas,
        extrasFijosSeleccionados: extrasSel,
        cantidades,
        estado,
        notas,
      })
      onCreated && onCreated(nuevo.id)
      // reset básico
      setNombre("")
      // mantener fecha por conveniencia
      setPersonas(0)
      setEstado("interesado")
      setExtrasSel([])
      setCantidades({})
      setNotas("") // Resetear notas
    } catch (error: any) {
      toast({
        title: "Error al crear reserva",
        description: error.message || "Ocurrió un error desconocido.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Nueva reserva</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del cliente"
                required
              />
            </div>
            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="personas">Cantidad de personas</Label>
              <Input
                id="personas"
                type="number"
                min={0}
                value={personas}
                onChange={(e) => setPersonas(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v: DayStatus) => setEstado(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interesado">Interesado (sin seña)</SelectItem>
                  <SelectItem value="señado">Señado</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas / Tipo de evento</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Cumpleaños de 15, Boda, Evento corporativo..."
            />
          </div>

          <div className="space-y-2">
            <Label>Servicios extras (precio fijo)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {state.config.extrasFijos.map((ex) => {
                const checked = extrasSel.includes(ex.id)
                return (
                  <label key={ex.id} className="flex items-center gap-2 rounded-md border p-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        setExtrasSel((s) => (v ? [...s, ex.id] : s.filter((id) => id !== ex.id)))
                      }}
                    />
                    <span className="text-sm">{ex.nombre}</span>
                    <span className="ml-auto text-sm text-muted-foreground">{ex.precio.toLocaleString("es-AR")}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ítems por cantidad</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {state.config.itemsPorCantidad.map((it) => (
                <div key={it.id} className="rounded-md border p-2">
                  <div className="text-sm font-medium">{it.nombre}</div>
                  <div className="text-xs text-muted-foreground">x {it.precioUnitario.toLocaleString("es-AR")} c/u</div>
                  <Input
                    className="mt-2"
                    type="number"
                    min={0}
                    value={cantidades[it.id] || 0}
                    onChange={(e) => setCantidades((s) => ({ ...s, [it.id]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <PriceBreakdown breakdown={calc.breakdown} total={calc.total} />

          <div className="flex justify-end">
            <Button type="submit">Crear reserva</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
