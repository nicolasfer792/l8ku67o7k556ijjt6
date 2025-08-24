"use client"

import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/date-utils"
import { useAtila } from "@/store/atila-provider"
import { CheckCircle, XCircle, DollarSign, Calendar } from "lucide-react"
import type { Reservation } from "@/lib/types"

type Props = {
  reservation: Reservation
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDialog({ reservation, open, onOpenChange }: Props) {
  const { state, updateReserva } = useAtila()
  const [paymentAmount, setPaymentAmount] = React.useState<string>("")
  const [paymentDate, setPaymentDate] = React.useState<string>(new Date().toISOString().split('T')[0])
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false)
  const [message, setMessage] = React.useState<string>("")

  const remainingAmount = reservation.total - (reservation.pagado || 0)
  const paymentPercentage = reservation.total > 0 ? Math.round(((reservation.pagado || 0) / reservation.total) * 100) : 0
  const isFullyPaid = remainingAmount <= 0

  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setMessage("Ingrese un monto válido")
      return
    }

    const amount = parseFloat(paymentAmount)
    if (amount > remainingAmount) {
      setMessage(`El monto no puede ser mayor al saldo restante (${formatCurrency(remainingAmount)})`)
      return
    }

    setIsProcessing(true)
    setMessage("")

    try {
      // Calcular el nuevo total pagado
      const newPaidAmount = (reservation.pagado || 0) + amount
      
      // Actualizar los registros de pago
      const newPaymentRecords = reservation.pagadoEn ? [...reservation.pagadoEn] : []
      newPaymentRecords.push({ fecha: paymentDate, monto: amount })
      
      // Actualizar la reserva
      await updateReserva(reservation.id, {
        nombreCliente: reservation.nombreCliente,
        fecha: reservation.fecha,
        cantidadPersonas: reservation.cantidadPersonas,
        extrasFijosSeleccionados: reservation.extrasFijosSeleccionados,
        cantidades: reservation.cantidades,
        estado: reservation.estado,
        notas: reservation.notas,
        tipo: reservation.tipo,
        incluirLimpieza: reservation.incluirLimpieza,
        costoLimpieza: reservation.costoLimpieza,
        precioBaseFijo: reservation.precioBaseFijo || 0,
        precioPorPersonaFijo: reservation.precioPorPersonaFijo || 0,
        extrasFijosTotalFijo: reservation.extrasFijosTotalFijo || 0,
        cantidadesTotalFijo: reservation.cantidadesTotalFijo || 0,
        pagado: newPaidAmount,
        pagadoEn: newPaymentRecords
      })

      // Actualizar el estado local
      reservation.pagado = newPaidAmount
      reservation.pagadoEn = newPaymentRecords
      
      // Limpiar el formulario
      setPaymentAmount("")
      setMessage(`Pago de ${formatCurrency(amount)} agregado exitosamente`)
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      setMessage("Error al procesar el pago")
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = () => {
    if (isFullyPaid) return "bg-green-100 text-green-800"
    if (remainingAmount > 0) return "bg-red-100 text-red-800"
    return "bg-yellow-100 text-yellow-800"
  }

  const getStatusText = () => {
    if (isFullyPaid) return "Pagado completo"
    if (remainingAmount > 0) return `Pendiente: ${formatCurrency(remainingAmount)}`
    return "Sin pagos"
  }

  const getPaymentHistory = () => {
    if (!reservation.pagadoEn || reservation.pagadoEn.length === 0) {
      return []
    }

    // Manejar tanto el nuevo formato (array de objetos con fecha y monto) como el antiguo (array de strings)
    if (Array.isArray(reservation.pagadoEn) && reservation.pagadoEn.length > 0 && typeof reservation.pagadoEn[0] === 'object' && 'fecha' in reservation.pagadoEn[0]) {
      // Nuevo formato: Array<{ fecha: string; monto: number }>
      return reservation.pagadoEn.map((payment: any, index: number) => ({
        date: payment.fecha,
        amount: payment.monto,
        index
      }))
    } else {
      // Antiguo formato: string[] (solo fechas)
      // En este caso, asumimos que los pagos se distribuyen proporcionalmente
      const amountPerPayment = reservation.pagado! / reservation.pagadoEn.length
      return reservation.pagadoEn.map((date: any, index: number) => ({
        date,
        amount: amountPerPayment,
        index
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Estado de Pago - {reservation.nombreCliente}
          </DialogTitle>
          <DialogDescription>
            Gestiona los pagos de la reserva del {new Date(reservation.fecha).toLocaleDateString("es-ES")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resumen del pago */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total de la reserva:</span>
              <span className="font-semibold">{formatCurrency(reservation.total)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Pagado:</span>
              <span className="font-semibold text-green-600">{formatCurrency(reservation.pagado || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Saldo restante:</span>
              <span className={`font-semibold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(remainingAmount)}
              </span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Progreso de pago:</span>
                <span className="text-xs font-medium">{paymentPercentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    paymentPercentage === 100 ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${paymentPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <Badge className={getStatusColor()}>
                {getStatusText()}
              </Badge>
            </div>
          </div>

          {/* Historial de pagos */}
          {getPaymentHistory().length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Historial de pagos:
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {getPaymentHistory().map((payment: any) => (
                  <div key={payment.index} className="flex justify-between items-center bg-muted/30 rounded px-2 py-1 text-sm">
                    <span>{new Date(payment.date).toLocaleDateString("es-ES")}</span>
                    <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario de nuevo pago */}
          {!isFullyPaid && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">Agregar nuevo pago</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="payment-amount">Monto a pagar</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="payment-date">Fecha de pago</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleAddPayment} 
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700 transition-all duration-200 hover-lift"
                >
                  {isProcessing ? "Procesando..." : `Agregar pago`}
                </Button>
                {message && (
                  <div className={`text-sm p-2 rounded ${
                    message.includes("exitosamente") 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Estado final después de la fecha del evento */}
          {new Date(reservation.fecha) < new Date() && (
            <div className={`p-3 rounded-lg border ${
              isFullyPaid 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {isFullyPaid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  {isFullyPaid 
                    ? "La reserva está completamente pagada" 
                    : `La reserva tiene un saldo pendiente de ${formatCurrency(remainingAmount)}`
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}