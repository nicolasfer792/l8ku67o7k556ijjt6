import { formatCurrency } from "@/lib/date-utils"

type Props = {
  breakdown: {
    base: number
    perPerson: number
    patio: number
    extrasFijosTotal?: number
    cantidadesTotal?: number
  }
  total: number
  costoLimpieza: number // Add costoLimpieza to props
  className?: string
  tipo?: "salon" | "patio" | "migrada"
  descuentoPorcentaje?: number
  totalConDescuento?: number
  costoExtra?: number
}

export function PriceBreakdown(
  { breakdown, total, costoLimpieza, className, descuentoPorcentaje = 0, totalConDescuento = total, costoExtra = 0 }: Props = {
    breakdown: { base: 0, perPerson: 0, patio: 0 },
    total: 0,
    costoLimpieza: 0, // Default value for costoLimpieza
    className: "",
    descuentoPorcentaje: 0,
    totalConDescuento: 0,
    costoExtra: 0,
  },
) {
  // Calcula las ganancias
  const finalTotal = totalConDescuento + costoExtra
  const ganancias = finalTotal - costoLimpieza

  return (
    <div className={`rounded-md border p-3 text-sm space-y-1 ${className}`}>
      <div className="flex justify-between">
        <span>Base:</span>
        <span>{formatCurrency(breakdown.base)}</span>
      </div>
      <div className="flex justify-between">
        <span>Por persona:</span>
        <span>{formatCurrency(breakdown.perPerson)}</span>
      </div>
      {breakdown.patio > 0 && (
        <div className="flex justify-between">
          <span>Patio:</span>
          <span>{formatCurrency(breakdown.patio)}</span>
        </div>
      )}

      {(breakdown.extrasFijosTotal ?? 0) > 0 && (
        <div className="flex justify-between">
          <span>Extras fijos:</span>
          <span>{formatCurrency(breakdown.extrasFijosTotal!)}</span>
        </div>
      )}

      {(breakdown.cantidadesTotal ?? 0) > 0 && (
        <div className="flex justify-between">
          <span>Items por cantidad:</span>
          <span>{formatCurrency(breakdown.cantidadesTotal!)}</span>
        </div>
      )}
      
      {descuentoPorcentaje > 0 && (
        <>
          <div className="flex justify-between text-orange-600">
            <span>Descuento ({descuentoPorcentaje}%):</span>
            <span>-{formatCurrency(total - totalConDescuento)}</span>
          </div>
          <div className="border-t pt-2 mt-2" />
        </>
      )}
      

      {costoExtra > 0 && (
        <>
          <div className="flex justify-between text-blue-600">
            <span>Costo extra:</span>
            <span>+{formatCurrency(costoExtra)}</span>
          </div>
          <div className="border-t pt-2 mt-2" />
        </>
      )}

      <div className="flex justify-between font-semibold">
        <span>Total a cobrar{descuentoPorcentaje > 0 || costoExtra > 0 ? " final:" : ":"}</span>
        <span>{formatCurrency(finalTotal)}</span>
      </div>
      <div className="flex justify-between font-semibold text-green-600">
        <span>Ganancias:</span>
        <span>{formatCurrency(ganancias)}</span>
      </div>
    </div>
  )
}
