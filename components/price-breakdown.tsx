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
}

export function PriceBreakdown(
  { breakdown, total, costoLimpieza, className }: Props = {
    breakdown: { base: 0, perPerson: 0, patio: 0 },
    total: 0,
    costoLimpieza: 0, // Default value for costoLimpieza
    className: "",
  },
) {
  // Calcula las ganancias
  const ganancias = total - costoLimpieza

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
      <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
        <span>Total a cobrar:</span>
        <span>{formatCurrency(total)}</span>
      </div>
      <div className="flex justify-between font-semibold text-green-600">
        <span>Ganancias:</span>
        <span>{formatCurrency(ganancias)}</span>
      </div>
    </div>
  )
}
