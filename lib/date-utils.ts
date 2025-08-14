export function isWeekend(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00")
  const day = d.getDay()
  // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6
}

export function formatCurrency(n: number, locale = "es-AR", currency = "ARS") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n)
  } catch {
    return `${n.toFixed(2)}`
  }
}

export function toISODate(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}
