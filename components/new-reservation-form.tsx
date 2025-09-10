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
import { User, Phone, Calendar as CalendarIcon, Users, Plus, Minus } from "lucide-react"

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
  const [cantidades, setCantidades] = React.useState<Record<string, any>>({})
  const [notas, setNotas] = React.useState("") // Nuevo estado para notas
  const [telefono, setTelefono] = React.useState("") // Nuevo estado para teléfono
  const [descuentoPorcentaje, setDescuentoPorcentaje] = React.useState(0) // Estado para descuento
  const [costoExtra, setCostoExtra] = React.useState(0) // Estado para costo extra
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [touched, setTouched] = React.useState({ nombre: false, fecha: false })
  const showNombreError = touched.nombre && !nombre
  const showFechaError = touched.fecha && !fecha

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
      descuentoPorcentaje: descuentoPorcentaje || 0,
      costoExtra: costoExtra || 0,
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
        telefono,
        fecha,
        cantidadPersonas: personas,
        extrasFijosSeleccionados: extrasSel,
        // Convertir cantidades al formato con precioUnitarioFijo si están en formato antiguo
        cantidades: Object.entries(cantidades).reduce((acc, [id, data]) => {
          if (typeof data === 'number') {
            // Formato antiguo: convertir a formato nuevo con precio actual
            const item = state.config.itemsPorCantidad.find(item => item.id === id)
            if (item) {
              acc[id] = { cantidad: data, precioUnitarioFijo: item.precioUnitario }
            }
          } else if (typeof data === 'object' && data !== null) {
            // Formato nuevo: usar tal cual
            acc[id] = data
          }
          return acc
        }, {} as Record<string, { cantidad: number; precioUnitarioFijo: number }>),
        estado,
        notas,
        incluirLimpieza,
        costoLimpieza,
        tipo,
        precioBaseFijo: calc.breakdown.base,
        precioPorPersonaFijo: calc.breakdown.perPerson,
        extrasFijosTotalFijo: calc.breakdown.extrasFijosTotal,
        cantidadesTotalFijo: calc.breakdown.cantidadesTotal,
        descuentoPorcentaje: descuentoPorcentaje || 0,
        costoExtra: costoExtra || 0,
      })
      onCreated && onCreated(nuevo.id)
      // reset básico
      setNombre("")
      setTelefono("") // Resetear teléfono
      // mantener fecha por conveniencia
      setPersonas(0)
      setEstado("interesado")
      setExtrasSel([])
      setCantidades({})
      setNotas("") // Resetear notas
      setDescuentoPorcentaje(0) // Resetear descuento
      setCostoExtra(0) // Resetear costo extra
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
    <Card className="w-full glass-card animate-fade-in border-0 shadow-2xl bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl">
      <CardHeader className="pb-6">
        <CardTitle className="animate-slide-in-left text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          Nueva reserva
        </CardTitle>
        <div className="w-16 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full animate-scale-in delay-300"></div>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={submit} className="space-y-6">
          {/* Main Form Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="animate-staggered-fade-in group">
              <Label htmlFor="nombre" className="text-sm font-semibold text-gray-700 mb-2 block">Nombre</Label>
              <div className="relative">
                <span className="input-icon">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
                  placeholder="Nombre del cliente"
                  required
                  aria-invalid={showNombreError ? true : false}
                  aria-describedby="nombre-error"
                  className={`h-12 px-4 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg group-hover:shadow-md input-with-icon ${showNombreError ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-teal-500"}`}
                />
              </div>
              {showNombreError && (
                <p id="nombre-error" className="form-error">El nombre es obligatorio.</p>
              )}
            </div>
            <div className="animate-staggered-fade-in delay-100 group">
              <Label htmlFor="telefono" className="text-sm font-semibold text-gray-700 mb-2 block">Teléfono</Label>
              <div className="relative">
                <span className="input-icon">
                  <Phone className="h-4 w-4" />
                </span>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Número de teléfono"
                  className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg group-hover:shadow-md input-with-icon"
                />
              </div>
            </div>
            <div className="animate-staggered-fade-in delay-200 group">
              <Label htmlFor="fecha" className="text-sm font-semibold text-gray-700 mb-2 block">Fecha</Label>
              <div className="relative">
                <span className="input-icon">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, fecha: true }))}
                  required
                  aria-invalid={showFechaError ? true : false}
                  aria-describedby="fecha-error"
                  className={`h-12 px-4 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg group-hover:shadow-md input-with-icon ${showFechaError ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-teal-500"}`}
                />
              </div>
              {showFechaError && (
                <p id="fecha-error" className="form-error">La fecha es obligatoria.</p>
              )}
            </div>
            <div className="animate-staggered-fade-in delay-300 group">
              <Label htmlFor="personas" className="text-sm font-semibold text-gray-700 mb-2 block">Cantidad de personas</Label>
              <div className="relative">
                <span className="input-icon">
                  <Users className="h-4 w-4" />
                </span>
                <Input
                  id="personas"
                  type="number"
                  min={0}
                  value={personas}
                  onChange={(e) => setPersonas(Number(e.target.value))}
                  className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg group-hover:shadow-md input-with-icon"
                />
              </div>
            </div>
            <div className="animate-staggered-fade-in delay-400 group sm:col-span-2">
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Estado</Label>
              <Select value={estado} onValueChange={(v: DayStatus) => setEstado(v)}>
                <SelectTrigger className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-xl">
                  <SelectItem value="interesado" className="hover:bg-teal-50 transition-colors duration-200">Interesado (sin seña)</SelectItem>
                  <SelectItem value="señado" className="hover:bg-teal-50 transition-colors duration-200">Señado</SelectItem>
                  <SelectItem value="confirmado" className="hover:bg-teal-50 transition-colors duration-200">Confirmado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="animate-staggered-fade-in delay-500 group">
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de reserva</Label>
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
              <SelectTrigger className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-xl">
                <SelectItem value="salon" className="hover:bg-teal-50 transition-colors duration-200">🏢 Salón</SelectItem>
                <SelectItem value="patio" className="hover:bg-teal-50 transition-colors duration-200">🌳 Patio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "salon" && (
            <React.Fragment>
              <div className="space-y-3 animate-staggered-fade-in delay-600 group">
                <Label htmlFor="notas" className="text-sm font-semibold text-gray-700">Notas / Tipo de evento</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Cumpleaños de 15, Boda, Evento corporativo..."
                  className="min-h-20 px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg resize-none"
                />
              </div>

              {localStorage.getItem('showExtrasFijos') !== 'false' && (
                <div className="space-y-3 animate-staggered-fade-in delay-700">
                  <Label className="text-sm font-semibold text-gray-700">Servicios extras (precio fijo)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {state.config.extrasFijos.map((ex, index) => {
                      const checked = extrasSel.includes(ex.id)
                      return (
                        <label
                          key={ex.id}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all duration-300 hover-lift hover:shadow-lg group/item ${
                            checked
                              ? 'border-teal-500 bg-teal-50/50 shadow-md'
                              : 'border-gray-200 bg-white/50 backdrop-blur-sm hover:border-gray-300'
                          }`}
                          style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setExtrasSel((s) => (v ? [...s, ex.id] : s.filter((id) => id !== ex.id)))
                            }}
                            className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                          />
                          <span className="text-sm font-medium flex-1">{ex.nombre}</span>
                          <span className={`text-sm font-semibold px-2 py-1 rounded-lg ${
                            checked ? 'text-teal-700 bg-teal-100' : 'text-gray-600 bg-gray-100'
                          }`}>
                            ${ex.precio.toLocaleString("es-AR")}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Cleaning Cost Controls */}
              <div className="space-y-3 animate-staggered-fade-in delay-800">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 backdrop-blur-sm border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 group">
                  <Checkbox
                    id="incluir-limpieza"
                    checked={incluirLimpieza}
                    onCheckedChange={(v) => setIncluirLimpieza(!!v)}
                    className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                  />
                  <Label htmlFor="incluir-limpieza" className="text-sm font-semibold text-gray-700 cursor-pointer">Incluir costo de limpieza</Label>
                </div>
                {incluirLimpieza && (
                  <div className="animate-bounce-in grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group">
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Costo de limpieza</Label>
                      <Input
                        type="number"
                        value={costoLimpieza}
                        onChange={(e) => setCostoLimpieza(Number(e.target.value))}
                        className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Items */}
              <div className="space-y-3 animate-staggered-fade-in delay-900">
                <Label className="text-sm font-semibold text-gray-700">Ítems por cantidad</Label>
                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                  {state.config.itemsPorCantidad.map((it, index) => (
                    <div
                      key={it.id}
                      className="rounded-xl border-2 border-gray-200 p-4 bg-white/50 backdrop-blur-sm hover-lift transition-all duration-300 hover:shadow-lg hover:border-gray-300 group"
                      style={{ animationDelay: `${1 + index * 0.1}s` }}
                    >
                      <div className="text-sm font-semibold text-gray-800 mb-1">{it.nombre}</div>
                      <div className="text-xs text-gray-500 mb-3">x ${it.precioUnitario.toLocaleString("es-AR")} c/u</div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="btn-qty"
                          onClick={() => {
                            const currentValue = typeof cantidades[it.id] === 'number'
                              ? (cantidades[it.id] as number)
                              : (typeof cantidades[it.id] === 'object' && cantidades[it.id] !== null
                                ? (cantidades[it.id] as { cantidad: number }).cantidad
                                : 0)
                            const next = Math.max(0, currentValue - 1)
                            setCantidades((s) => ({
                              ...s,
                              [it.id]: { cantidad: next, precioUnitarioFijo: it.precioUnitario }
                            }))
                          }}
                          aria-label={`Disminuir ${it.nombre}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          className="h-10 w-20 text-center px-3 border border-gray-300 rounded-lg bg-white/80 transition-all duration-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white hover:border-gray-400"
                          type="number"
                          min={0}
                          value={typeof cantidades[it.id] === 'number' ? cantidades[it.id] : (typeof cantidades[it.id] === 'object' ? (cantidades[it.id] as { cantidad: number }).cantidad : 0)}
                          onChange={(e) => {
                            const value = Number(e.target.value)
                            setCantidades((s) => ({
                              ...s,
                              [it.id]: { cantidad: value, precioUnitarioFijo: it.precioUnitario }
                            }))
                          }}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={`Cantidad de ${it.nombre}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="btn-qty"
                          onClick={() => {
                            const currentValue = typeof cantidades[it.id] === 'number'
                              ? (cantidades[it.id] as number)
                              : (typeof cantidades[it.id] === 'object' && cantidades[it.id] !== null
                                ? (cantidades[it.id] as { cantidad: number }).cantidad
                                : 0)
                            const next = currentValue + 1
                            setCantidades((s) => ({
                              ...s,
                              [it.id]: { cantidad: next, precioUnitarioFijo: it.precioUnitario }
                            }))
                          }}
                          aria-label={`Aumentar ${it.nombre}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {localStorage.getItem('showDescuento') !== 'false' && (
                <div className="space-y-3 animate-staggered-fade-in delay-1000 group">
                  <Label htmlFor="descuento" className="text-sm font-semibold text-gray-700">Descuento (%)</Label>
                  <Input
                    id="descuento"
                    type="number"
                    min={0}
                    max={100}
                    value={descuentoPorcentaje}
                    onChange={(e) => setDescuentoPorcentaje(Number(e.target.value))}
                    placeholder="0"
                    className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg"
                  />
                  {descuentoPorcentaje > 0 && (
                    <div className="animate-bounce-in text-sm text-green-700 font-semibold bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      🎉 Descuento aplicado: {descuentoPorcentaje}% (${((calc.totalSinDescuento * descuentoPorcentaje) / 100).toLocaleString("es-AR")})
                    </div>
                  )}
                </div>
              )}

              {localStorage.getItem('showCostoExtra') !== 'false' && (
                <div className="space-y-3 animate-staggered-fade-in delay-1050 group">
                  <Label htmlFor="costoExtra" className="text-sm font-semibold text-gray-700">Costo extra</Label>
                  <Input
                    id="costoExtra"
                    type="number"
                    min={0}
                    value={costoExtra}
                    onChange={(e) => setCostoExtra(Number(e.target.value))}
                    placeholder="0"
                    className="h-12 px-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white hover:border-gray-300 hover:shadow-lg"
                  />
                  {costoExtra > 0 && (
                    <div className="animate-bounce-in text-sm text-blue-700 font-semibold bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      ➕ Costo extra aplicado: ${costoExtra.toLocaleString("es-AR")}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          )}

          {/* Price Breakdown */}
          <PriceBreakdown
            breakdown={calc.breakdown}
            total={calc.totalSinDescuento}
            costoLimpieza={calc.costoLimpieza} // Pass costoLimpieza
            className="animate-staggered-fade-in delay-700"
            tipo={tipo}
            descuentoPorcentaje={descuentoPorcentaje || 0}
            totalConDescuento={calc.totalConDescuento}
            costoExtra={calc.costoExtra}
          />

          <div className="flex justify-end animate-staggered-fade-in delay-1100">
            <Button
              type="submit"
              className={`h-14 px-8 text-lg font-semibold rounded-xl transition-all duration-300 hover-lift active:scale-95 ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creando reserva...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>✨ Crear reserva</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
