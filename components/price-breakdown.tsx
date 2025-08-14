import { formatCurrency } from "@/lib/date-utils"

type Props = {
  breakdown: {
    base: number
    perPerson: number
    extrasFijosTotal: number
    cantidadesTotal: number
    limpieza: number
  }
  total: number
}

export function PriceBreakdown(
  { breakdown, total }: Props = {
    breakdown: { base: 0, perPerson: 0, extrasFijosTotal: 0, cantidadesTotal: 0, limpieza: 0 },
    total: 0,
  },
) {
  // Calcula las ganancias
  const ganancias = total - breakdown.limpieza

  return (
    <div className="rounded-md border p-3 text-sm space-y-1">
      <div className="flex justify-between">
        <span>Base:</span>
        <span>{formatCurrency(breakdown.base)}</span>
      </div>
      <div className="flex justify-between">
        <span>Por persona:</span>
        <span>{formatCurrency(breakdown.perPerson)}</span>
      </div>
      <div className="flex justify-between">
        <span>Extras fijos:</span>
        <span>{formatCurrency(breakdown.extrasFijosTotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Ítems por cantidad:</span>
        <span>{formatCurrency(breakdown.cantidadesTotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Limpieza:</span>
        <span>{formatCurrency(breakdown.limpieza)}</span>
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
