import { formatCurrency } from "@/lib/date-utils"

type Props = {
  breakdown: {
    base: number
    perPerson: number
    patio: number
  }
  total: number
  costoLimpieza: number // Add costoLimpieza to props
  className?: string
  tipo?: "salon" | "patio" | "migrada"
  descuentoPorcentaje?: number
  totalConDescuento?: number
}

export function PriceBreakdown(
  { breakdown, total, costoLimpieza, className, descuentoPorcentaje = 0, totalConDescuento = total }: Props = {
    breakdown: { base: 0, perPerson: 0, patio: 0 },
    total: 0,
    costoLimpieza: 0, // Default value for costoLimpieza
    className: "",
    descuentoPorcentaje: 0,
    totalConDescuento: 0,
  },
) {
  // Calcula las ganancias
  const ganancias = totalConDescuento - costoLimpieza

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
      <div className="flex justify-between">
        <span>Patio:</span>
        <span>{formatCurrency(breakdown.patio)}</span>
      </div>
      
      {descuentoPorcentaje > 0 && (
        <>
          <div className="flex justify-between text-orange-600">
            <span>Descuento ({descuentoPorcentaje}%):</span>
            <span>-{formatCurrency(total - totalConDescuento)}</span>
          </div>
          <div className="border-t pt-2 mt-2" />
        </>
      )}
      
      <div className="flex justify-between font-semibold">
        <span>Total a cobrar{descuentoPorcentaje > 0 ? " con descuento:" : ":"}</span>
        <span>{formatCurrency(totalConDescuento)}</span>
      </div>
      <div className="flex justify-between font-semibold text-green-600">
        <span>Ganancias:</span>
        <span>{formatCurrency(ganancias)}</span>
      </div>
    </div>
  )
}
