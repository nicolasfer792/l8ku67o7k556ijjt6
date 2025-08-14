"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAtila } from "@/store/atila-provider"
import { formatCurrency } from "@/lib/date-utils"
import { RefreshCcw, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"

export function TrashBin() {
  const { listTrashedReservations, recuperarReserva, eliminarReservaPermanentemente, limpiarPapeleraAntigua } =
    useAtila()
  const [trashedReservations, setTrashedReservations] = React.useState<
    Awaited<ReturnType<typeof listTrashedReservations>>
  >([])
  const [loading, setLoading] = React.useState(true)

  const fetchTrashed = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTrashedReservations()
      setTrashedReservations(data)
    } catch (error: any) {
      toast({
        title: "Error al cargar papelera",
        description: error.message || "Ocurrió un error desconocido.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [listTrashedReservations])

  React.useEffect(() => {
    fetchTrashed()
  }, [fetchTrashed])

  const handleRecover = async (id: string) => {
    await recuperarReserva(id)
    fetchTrashed() // Refrescar la lista de la papelera
  }

  const handleDeletePermanent = async (id: string) => {
    await eliminarReservaPermanentemente(id)
    fetchTrashed() // Refrescar la lista de la papelera
  }

  const handlePurgeOld = async () => {
    await limpiarPapeleraAntigua()
    fetchTrashed() // Refrescar la lista de la papelera
  }

  const calculateDaysRemaining = (deletedAt: string | null) => {
    if (!deletedAt) return null
    const deletedDate = new Date(deletedAt)
    const sevenDaysLater = new Date(deletedDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const diffTime = sevenDaysLater.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg">Papelera de Reservas</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePurgeOld} disabled={loading}>
            Limpiar antiguas
          </Button>
          <Button variant="outline" onClick={fetchTrashed} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refrescar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">Cargando papelera...</div>}
        {!loading && trashedReservations.length === 0 && (
          <div className="text-sm text-muted-foreground">La papelera está vacía.</div>
        )}
        {!loading &&
          trashedReservations.map((r) => {
            const daysRemaining = calculateDaysRemaining(r.deletedAt)
            return (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row gap-2 sm:items-center border rounded-md p-2 bg-gray-50"
              >
                <div className="flex-1">
                  <div className="font-medium">{r.nombreCliente}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.fecha} • {formatCurrency(r.total)} • Eliminado:{" "}
                    {r.deletedAt ? new Date(r.deletedAt).toLocaleDateString() : "N/A"}
                  </div>
                  {daysRemaining !== null && (
                    <div className="text-xs text-muted-foreground">
                      {daysRemaining > 0 ? `Se borrará en ${daysRemaining} día(s)` : "Eliminación pendiente"}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleRecover(r.id)}>
                    Recuperar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" /> Borrar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de eliminar permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La reserva de {r.nombreCliente} se eliminará para siempre.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePermanent(r.id)}>
                          Sí, eliminar permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )
          })}
      </CardContent>
    </Card>
  )
}
