"use client"

import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/date-utils"
import { useAtila } from "@/store/atila-provider"
import type { Reservation } from "@/lib/types"

type Props = {
  reservation: Reservation
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDialog({ reservation, open, onOpenChange }: Props) {
  const { state, updateReserva } = useAtila()
  const [paymentAmount, setPaymentAmount] = React.useState<string>("")
  const [paymentDate, setPaymentDate] = React.useState<string>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false)
  const [message, setMessage] = React.useState<string>("")
  const [editingPayment, setEditingPayment] = React.useState<{index: number, fecha: string, monto: string} | null>(null)
  const [editForm, setEditForm] = React.useState({ fecha: "", monto: "" })

  const remainingAmount = reservation.total - (reservation.pagado || 0)
  const paymentPercentage = reservation.total > 0 ? Math.round(((reservation.pagado || 0) / reservation.total) * 100) : 0
  const isFullyPaid = remainingAmount <= 0

  const handleEditPayment = async () => {
    if (!editingPayment || !editForm.fecha || !editForm.monto || parseFloat(editForm.monto) <= 0) {
      setMessage("Ingrese datos válidos para el pago")
      return
    }

    const amount = parseFloat(editForm.monto)
    setIsProcessing(true)
    setMessage("")

    try {
      // Obtener los registros de pago actuales
      const currentPaymentRecords = reservation.pagadoEn ? [...reservation.pagadoEn] : []
      
      // Actualizar el pago específico
      currentPaymentRecords[editingPayment.index] = {
        fecha: editForm.fecha,
        monto: amount
      }
      
      // Recalcular el total pagado
      const newPaidAmount = currentPaymentRecords.reduce((sum, payment) => sum + payment.monto, 0)
      
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
        pagadoEn: currentPaymentRecords
      })

      // Actualizar el estado local
      reservation.pagado = newPaidAmount
      reservation.pagadoEn = currentPaymentRecords
      
      // Limpiar el formulario de edición
      setEditingPayment(null)
      setEditForm({ fecha: "", monto: "" })
      setMessage(`Pago actualizado exitosamente`)
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      setMessage("Error al actualizar el pago")
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeletePayment = async (index: number) => {
    setIsProcessing(true)
    setMessage("")

    try {
      // Obtener los registros de pago actuales
      const currentPaymentRecords = reservation.pagadoEn ? [...reservation.pagadoEn] : []
      
      // Eliminar el pago específico
      const deletedPayment = currentPaymentRecords.splice(index, 1)[0]
      
      // Recalcular el total pagado
      const newPaidAmount = currentPaymentRecords.reduce((sum, payment) => sum + payment.monto, 0)
      
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
        pagadoEn: currentPaymentRecords
      })

      // Actualizar el estado local
      reservation.pagado = newPaidAmount
      reservation.pagadoEn = currentPaymentRecords
      
      setMessage(`Pago de ${formatCurrency(deletedPayment.monto)} eliminado exitosamente`)
      
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      setMessage("Error al eliminar el pago")
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

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
    if (isFullyPaid) return "bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg"
    if (remainingAmount > 0) return "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg"
    return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg"
  }

  const getStatusText = () => {
    if (isFullyPaid) return "✅ Pagado completo"
    if (remainingAmount > 0) return `⚠️ Pendiente: ${formatCurrency(remainingAmount)}`
    return "📝 Sin pagos"
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500'
    if (percentage >= 25) return 'bg-yellow-500'
    return 'bg-red-500'
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
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg p-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
            💳 Estado de Pago — {reservation.nombreCliente}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Gestiona los pagos de la reserva del {new Date(reservation.fecha).toLocaleDateString("es-ES")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resumen del pago */}
          <div className="bg-white rounded-lg p-6 space-y-4 shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">📊 Resumen del Pago</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">💰 Total de la reserva:</span>
                <span className="font-bold text-blue-700">{formatCurrency(reservation.total)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">✅ Pagado:</span>
                <span className="font-bold text-green-700">{formatCurrency(reservation.pagado || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg {remainingAmount > 0 ? 'bg-red-50' : 'bg-green-50'}">
                <span className="text-sm font-medium">{remainingAmount > 0 ? '⚠️' : '✅'} Saldo restante:</span>
                <span className={`font-bold ${remainingAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>
            <div className="pt-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">📈 Progreso de pago:</span>
                <span className="text-sm font-bold text-blue-600">{paymentPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ease-out shadow-md ${getProgressColor(paymentPercentage)}`}
                  style={{ width: `${paymentPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-center">
              <Badge className={`${getStatusColor()} px-4 py-2 text-sm shadow-lg`}>
                {getStatusText()}
              </Badge>
            </div>
          </div>

          {/* Historial de pagos */}
          {getPaymentHistory().length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                📅 Historial de Pagos
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {getPaymentHistory().map((payment: any, idx: number) => (
                  <div key={payment.index} className="relative flex items-center space-x-4 group hover:bg-gray-50 p-3 rounded-lg transition-all duration-200">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold text-sm">💰</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {new Date(payment.date + "T00:00:00").toLocaleDateString("es-ES")}
                        </p>
                        <span className="text-sm font-bold text-green-600 ml-2">{formatCurrency(payment.amount)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-blue-100 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingPayment({
                            index: payment.index,
                            fecha: payment.date,
                            monto: payment.amount.toString()
                          })
                          setEditForm({
                            fecha: payment.date,
                            monto: payment.amount.toString()
                          })
                        }}
                      >
                        <span className="text-blue-600">✏️</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-100 hover:text-red-700 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePayment(payment.index)
                        }}
                        disabled={isProcessing}
                      >
                        <span className="text-red-500">🗑️</span>
                      </Button>
                    </div>
                    {idx < getPaymentHistory().length - 1 && (
                      <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario de edición de pago */}
          {editingPayment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
              <h4 className="text-lg font-semibold text-yellow-800 flex items-center gap-2">✏️ Editar Pago</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-payment-date" className="text-sm font-medium">📅 Fecha de pago</Label>
                  <Input
                    id="edit-payment-date"
                    type="date"
                    value={editForm.fecha}
                    onChange={(e) => setEditForm({...editForm, fecha: e.target.value})}
                    className="mt-1 border-gray-300 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-payment-amount" className="text-sm font-medium">💰 Monto</Label>
                  <Input
                    id="edit-payment-amount"
                    type="number"
                    placeholder="0.00"
                    value={editForm.monto}
                    onChange={(e) => setEditForm({...editForm, monto: e.target.value})}
                    className="mt-1 border-gray-300 focus:border-yellow-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleEditPayment}
                    disabled={isProcessing}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-200 shadow-md"
                  >
                    <span className="mr-1" aria-hidden>💾</span>
                    {isProcessing ? "Procesando..." : "Guardar Cambios"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingPayment(null)
                      setEditForm({ fecha: "", monto: "" })
                    }}
                    disabled={isProcessing}
                    className="flex-1 border-gray-300 hover:bg-gray-100 transition-all duration-200"
                  >
                    <span className="mr-1" aria-hidden>✖️</span>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Formulario de nuevo pago */}
          {!isFullyPaid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
              <h4 className="text-lg font-semibold text-green-800 flex items-center gap-2">➕ Agregar Nuevo Pago</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="payment-amount" className="text-sm font-medium">💰 Monto a pagar</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="mt-1 border-gray-300 focus:border-green-500"
                  />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="hover:bg-green-100 transition-all duration-200"
                      onClick={() => setPaymentAmount(Math.max(0, Math.round((reservation.total - (reservation.pagado || 0)) * 0.25)).toString())}
                    >
                      25%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="hover:bg-green-100 transition-all duration-200"
                      onClick={() => setPaymentAmount(Math.max(0, Math.round((reservation.total - (reservation.pagado || 0)) * 0.5)).toString())}
                    >
                      50%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="hover:bg-green-100 transition-all duration-200"
                      onClick={() => setPaymentAmount(String(reservation.total - (reservation.pagado || 0)))}
                    >
                      Restante
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="payment-date" className="text-sm font-medium">📅 Fecha de pago</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="mt-1 border-gray-300 focus:border-green-500"
                  />
                </div>
                <Button
                  onClick={handleAddPayment}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl hover-lift"
                >
                  <span className="mr-1" aria-hidden>➕</span>
                  {isProcessing ? "Procesando..." : `Agregar Pago de ${formatCurrency(parseFloat(paymentAmount || '0'))}`}
                </Button>
                {message && (
                  <div className={`text-sm p-3 rounded-lg shadow-sm ${
                    message.includes("exitosamente")
                      ? "bg-green-100 border-green-200 text-green-800"
                      : "bg-red-100 border-red-200 text-red-800"
                  }`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Estado final después de la fecha del evento */}
          {new Date(reservation.fecha) < new Date() && (
            <div className={`p-4 rounded-lg border-2 shadow-md ${
              isFullyPaid
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-300"
            }`}>
              <div className="flex items-center gap-3">
                {isFullyPaid ? (
                  <span className="text-green-600 text-2xl" aria-hidden>✅</span>
                ) : (
                  <span className="text-red-600 text-2xl" aria-hidden>❌</span>
                )}
                <span className={`font-semibold text-lg ${
                  isFullyPaid ? 'text-green-800' : 'text-red-800'
                }`}>
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