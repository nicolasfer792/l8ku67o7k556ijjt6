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
import type { DayStatus, Reservation } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/date-utils"

type Props = {
  reservation: Reservation
  onEdited?: (id: string) => void
  onCancel?: () => void
}

export function EditReservationForm({ reservation, onEdited, onCancel }: Props) {
  const { state, updateReserva } = useAtila()
  const [nombre, setNombre] = React.useState(reservation.nombreCliente)
  const [fecha, setFecha] = React.useState(reservation.fecha)
  const [personas, setPersonas] = React.useState(reservation.cantidadPersonas)
  const [estado, setEstado] = React.useState<DayStatus>(reservation.estado)
  const [tipo, setTipo] = React.useState<"salon" | "patio" | "migrada">(reservation.tipo || "salon")
  const [extrasSel, setExtrasSel] = React.useState(reservation.extrasFijosSeleccionados)
  const [cantidades, setCantidades] = React.useState(reservation.cantidades)
  const [notas, setNotas] = React.useState(reservation.notas || "")
  const [incluirLimpieza, setIncluirLimpieza] = React.useState(reservation.incluirLimpieza || false)
  const [costoLimpieza, setCostoLimpieza] = React.useState(reservation.costoLimpieza || 0)
  const [descuentoPorcentaje, setDescuentoPorcentaje] = React.useState(reservation.descuentoPorcentaje || 0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const calc = computeReservationTotal(
    {
      nombreCliente: nombre || "",
      fecha: fecha || new Date().toISOString().slice(0, 10),
      cantidadPersonas: personas || 0,
      extrasFijosSeleccionados: extrasSel,
      cantidades,
      tipo,
      estado,
      notas,
      incluirLimpieza,
      costoLimpieza,
      descuentoPorcentaje,
    },
    state.config,
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !fecha) {
      toast({ title: "Error", description: "Nombre y fecha son obligatorios.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      await updateReserva(reservation.id, {
        nombreCliente: nombre,
        fecha,
        cantidadPersonas: personas,
        extrasFijosSeleccionados: extrasSel,
        cantidades,
        estado,
        notas,
        tipo,
        incluirLimpieza,
        costoLimpieza,
        descuentoPorcentaje,
      } as any)
      onEdited && onEdited(reservation.id)
    } catch (error: any) {
      toast({
        title: "Error al actualizar la reserva",
        description: error.message || "Ocurrió un error desconocido.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Editar reserva</CardTitle>
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

          {tipo !== "migrada" && (
            <div>
              <Label>Tipo de reserva</Label>
              <Select
                value={tipo}
                onValueChange={(v: "salon" | "patio") => {
                  setTipo(v)
                  if (v === "patio") {
                    setExtrasSel([])
                    setCantidades({})
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
          )}

          {tipo === "salon" && (
            <>
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
                        <span className="ml-auto text-sm text-muted-foreground">
                          {ex.precio.toLocaleString("es-AR")}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
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
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Ítems por cantidad</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {state.config.itemsPorCantidad.map((it) => (
                    <div key={it.id} className="rounded-md border p-2">
                      <div className="text-sm font-medium">{it.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        x {it.precioUnitario.toLocaleString("es-AR")} c/u
                      </div>
                      <Input
                        className="mt-2"
                        type="number"
                        min={0}
                        value={typeof cantidades[it.id] === 'number' ? cantidades[it.id] : (typeof cantidades[it.id] === 'object' ? cantidades[it.id].cantidad : 0)}
                        onChange={(e) => {
                          const newValue = Number(e.target.value)
                          setCantidades((s) => ({
                            ...s,
                            [it.id]: { cantidad: newValue, precioUnitarioFijo: it.precioUnitario }
                          }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descuento">Descuento (0-100%)</Label>
                <Input
                  id="descuento"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={descuentoPorcentaje}
                  onChange={(e) => setDescuentoPorcentaje(Number(e.target.value))}
                  placeholder="Porcentaje de descuento"
                />
                {descuentoPorcentaje > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Descuento aplicado: {descuentoPorcentaje}%
                    {calc.totalConDescuento && calc.totalConDescuento < calc.totalSinDescuento && (
                      <span> - Ahorro: {formatCurrency(calc.totalSinDescuento - calc.totalConDescuento)}</span>
                    )}
                  </p>
                )}
              </div>
              
              <PriceBreakdown breakdown={calc.breakdown} total={calc.totalSinDescuento} costoLimpieza={calc.costoLimpieza} totalConDescuento={calc.totalConDescuento} descuentoPorcentaje={descuentoPorcentaje} />
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}