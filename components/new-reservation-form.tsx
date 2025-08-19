"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
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
  const [tipo, setTipo] = React.useState<"salon" | "patio">("salon")
  const [estado, setEstado] = React.useState<DayStatus>("interesado")
  const [incluirLimpieza, setIncluirLimpieza] = React.useState(false)
  const [costoLimpieza, setCostoLimpieza] = React.useState(0)
  const [extrasSel, setExtrasSel] = React.useState<string[]>([])
  const [cantidades, setCantidades] = React.useState<Record<string, number>>({})
  const [notas, setNotas] = React.useState("") // Nuevo estado para notas
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    setFecha(defaultDate || "")
  }, [defaultDate])

  const calc = computeReservationTotal(
    {
      nombreCliente: nombre || "",
      fecha: fecha || new Date().toISOString().slice(0, 10),
      cantidadPersonas: personas || 0,
      tipo,
      extrasFijosSeleccionados: tipo === "patio" ? [] : extrasSel,
      cantidades,
      estado,
      notas,
      incluirLimpieza,
      costoLimpieza,
    },
    state.config,
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !fecha) {
      toast({ title: "Error", description: "Nombre y fecha son obligatorios.", variant: "destructive" })
      return
    }
    
    setIsSubmitting(true);
    try {
      const nuevo = await addReserva({
        nombreCliente: nombre,
        fecha,
        cantidadPersonas: personas,
        extrasFijosSeleccionados: extrasSel,
        cantidades,
        estado,
        notas,
        incluirLimpieza,
        costoLimpieza,
        tipo,
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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <CardTitle className="animate-slide-in-left">Nueva reserva</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {/* Main Form Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="animate-staggered-fade-in">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del cliente"
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
              />
            </div>
            <div className="animate-staggered-fade-in delay-100">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50" />
            </div>
            <div className="animate-staggered-fade-in delay-200">
              <Label htmlFor="personas">Cantidad de personas</Label>
              <Input
                id="personas"
                type="number"
                min={0}
                value={personas}
                onChange={(e) => setPersonas(Number(e.target.value))}
                className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
              />
            </div>
            <div className="animate-staggered-fade-in delay-300">
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

          <div className="animate-staggered-fade-in delay-200">
            <Label>Tipo de reserva</Label>
            <Select
              value={tipo}
              onValueChange={(v: "salon" | "patio") => {
                setTipo(v)
                if (v === "patio") {
                  setExtrasSel([])
                  setCantidades({})
                  setIncluirLimpieza(false)
                  setCostoLimpieza(0)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salon">Salón</SelectItem>
                <SelectItem value="patio">Patio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "salon" && (
            <React.Fragment>
              <div className="space-y-2 animate-staggered-fade-in delay-400">
                <Label htmlFor="notas">Notas / Tipo de evento</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Cumpleaños de 15, Boda, Evento corporativo..."
                  className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
                />
              </div>

              <div className="space-y-2 animate-staggered-fade-in delay-500">
                <Label>Servicios extras (precio fijo)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {state.config.extrasFijos.map((ex) => {
                    const checked = extrasSel.includes(ex.id)
                    return (
                      <label key={ex.id} className="flex items-center gap-2 rounded-md border p-2 hover-lift transition-all duration-200 hover:shadow-sm">
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

              {/* Cleaning Cost Controls */}
              <div className="space-y-2 animate-staggered-fade-in delay-500">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="incluir-limpieza"
                    checked={incluirLimpieza}
                    onCheckedChange={(v) => setIncluirLimpieza(!!v)}
                  />
                  <Label htmlFor="incluir-limpieza">Incluir costo de limpieza</Label>
                </div>
                {incluirLimpieza && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Costo de limpieza</Label>
                      <Input
                        type="number"
                        value={costoLimpieza}
                        onChange={(e) => setCostoLimpieza(Number(e.target.value))}
                        className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Items */}
              <div className="space-y-2 animate-staggered-fade-in delay-600">
                <Label>Ítems por cantidad</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {state.config.itemsPorCantidad.map((it) => (
                    <div key={it.id} className="rounded-md border p-2 hover-lift transition-all duration-200 hover:shadow-sm">
                      <div className="text-sm font-medium">{it.nombre}</div>
                      <div className="text-xs text-muted-foreground">x {it.precioUnitario.toLocaleString("es-AR")} c/u</div>
                      <Input
                        className="mt-2 transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
                        type="number"
                        min={0}
                        value={cantidades[it.id] || 0}
                        onChange={(e) => setCantidades((s) => ({ ...s, [it.id]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <PriceBreakdown
                breakdown={calc.breakdown}
                total={calc.total}
                className="animate-staggered-fade-in delay-700"
              />
            </React.Fragment>
          )}

          <div className="flex justify-end animate-staggered-fade-in delay-800">
            <Button
              type="submit"
              className="transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 animate-pulse-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creando...
                </>
              ) : (
                "Crear reserva"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
