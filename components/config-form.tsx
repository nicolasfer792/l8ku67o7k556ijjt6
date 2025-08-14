"use client"

import React from "react"
import { useAtila } from "@/store/atila-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle, AlertCircle, Database } from "lucide-react"
import { processFile, type ExtractedReservationData } from "@/lib/pdf-processor"
import { createReservation } from "@/app/actions"

export function ConfigForm() {
  const { state, guardarConfig } = useAtila()
  const [cfg, setCfg] = React.useState(state.config)
  const [uploadStatus, setUploadStatus] = React.useState<"idle" | "uploading" | "processing" | "success" | "error">(
    "idle",
  )
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([])
  const [extractedData, setExtractedData] = React.useState<ExtractedReservationData[]>([])
  const [processingResults, setProcessingResults] = React.useState<string>("")

  React.useEffect(() => {
    setCfg(state.config)
  }, [state.config])

  const updateNumber = (key: keyof typeof cfg, value: number) => {
    setCfg((s) => ({ ...s, [key]: value }))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setUploadStatus("uploading")
    setUploadedFiles(files)
    setExtractedData([])
    setProcessingResults("")

    try {
      const allExtractedData: ExtractedReservationData[] = []
      let processedCount = 0
      let errorCount = 0

      setUploadStatus("processing")

      for (const file of files) {
        try {
          const result = await processFile(file)

          if (result.success && result.data) {
            allExtractedData.push(...result.data)
            processedCount++
          } else {
            errorCount++
            console.error(`Error processing ${file.name}:`, result.error)
          }
        } catch (error) {
          errorCount++
          console.error(`Error processing ${file.name}:`, error)
        }
      }

      if (allExtractedData.length > 0) {
        setExtractedData(allExtractedData)

        // Save extracted reservations to database
        let savedCount = 0
        for (const reservation of allExtractedData) {
          try {
            const formData = new FormData()
            formData.append("cliente", reservation.cliente)
            formData.append("fecha", reservation.fecha)
            formData.append("personas", reservation.personas.toString())
            formData.append("extrasFijos", JSON.stringify([]))
            formData.append("itemsPorCantidad", JSON.stringify([]))
            formData.append("notas", reservation.notas || "Reserva migrada")
            formData.append("tipo", "migrada")

            await createReservation(formData)
            savedCount++
          } catch (error) {
            console.error("Error saving reservation:", error)
          }
        }

        setProcessingResults(
          `Procesados: ${processedCount} archivos\n` +
            `Reservas encontradas: ${allExtractedData.length}\n` +
            `Reservas guardadas: ${savedCount}\n` +
            (errorCount > 0 ? `Errores: ${errorCount} archivos` : ""),
        )
        setUploadStatus("success")
      } else {
        setProcessingResults(`No se encontraron datos de reservas en ${files.length} archivo(s)`)
        setUploadStatus("error")
      }

      setTimeout(() => {
        setUploadStatus("idle")
        setUploadedFiles([])
        setExtractedData([])
        setProcessingResults("")
      }, 5000)
    } catch (error) {
      setUploadStatus("error")
      setProcessingResults("Error general al procesar archivos")
      setTimeout(() => {
        setUploadStatus("idle")
        setUploadedFiles([])
        setProcessingResults("")
      }, 3000)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add("drag-over")
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove("drag-over")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove("drag-over")

    const files = Array.from(e.dataTransfer.files).filter(
      (file) =>
        file.type === "application/pdf" ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel",
    )
    if (files.length > 0) {
      const input = document.createElement("input")
      input.type = "file"
      input.files = e.dataTransfer.files
      handleFileUpload({ target: input } as any)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-teal-700">
            <Database className="h-5 w-5" />
            <span>Migración de datos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Sube tus archivos Excel de balances anteriores para importar datos históricos de reservas y finanzas.
          </p>

          <div
            className="upload-area p-8 text-center cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.xlsx,.xls"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            {uploadStatus === "idle" && (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700 mb-2">
                  Arrastra tus archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-slate-500">Soporta Excel con balances de reservas</p>
              </>
            )}

            {uploadStatus === "uploading" && (
              <>
                <div className="animate-spin h-12 w-12 mx-auto mb-4 border-4 border-teal-500 border-t-transparent rounded-full"></div>
                <p className="text-lg font-medium text-slate-700 mb-2">Subiendo archivos...</p>
                <p className="text-sm text-slate-500">{uploadedFiles.length} archivo(s) seleccionado(s)</p>
              </>
            )}

            {uploadStatus === "processing" && (
              <>
                <div className="animate-pulse h-12 w-12 mx-auto mb-4 bg-teal-500 rounded-full"></div>
                <p className="text-lg font-medium text-slate-700 mb-2">Extrayendo datos...</p>
                <p className="text-sm text-slate-500">Analizando contenido y guardando reservas</p>
              </>
            )}

            {uploadStatus === "success" && (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium text-green-700 mb-2">¡Migración completada!</p>
                <pre className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2 whitespace-pre-wrap">
                  {processingResults}
                </pre>
              </>
            )}

            {uploadStatus === "error" && (
              <>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <p className="text-lg font-medium text-red-700 mb-2">Error en la migración</p>
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">{processingResults}</p>
              </>
            )}
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            <p className="mb-1">
              <strong>Formatos soportados:</strong>Excel (.xlsx, .xls)
            </p>
            <p className="mb-1">
              <strong>Contenido esperado:</strong> Fechas, nombres de clientes, montos, cantidad de personas
            </p>
            <p>
              <strong>Nota:</strong> Las reservas migradas aparecerán con un punto azul en el calendario
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-teal-700">Configuración de precios y gastos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Base (entre semana)</Label>
              <Input
                type="number"
                value={cfg.baseEntreSemana}
                onChange={(e) => updateNumber("baseEntreSemana", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Base (fin de semana)</Label>
              <Input
                type="number"
                value={cfg.baseFinDeSemana}
                onChange={(e) => updateNumber("baseFinDeSemana", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Precio por persona (entre semana)</Label>
              <Input
                type="number"
                value={cfg.precioPorPersonaEntreSemana}
                onChange={(e) => updateNumber("precioPorPersonaEntreSemana", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Precio por persona (fin de semana)</Label>
              <Input
                type="number"
                value={cfg.precioPorPersonaFinDeSemana}
                onChange={(e) => updateNumber("precioPorPersonaFinDeSemana", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Costo fijo de limpieza</Label>
              <Input
                type="number"
                value={cfg.costoLimpiezaFijo}
                onChange={(e) => updateNumber("costoLimpiezaFijo", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Extras fijos</div>
            <div className="space-y-2">
              {cfg.extrasFijos.map((ex, idx) => (
                <div key={ex.id} className="grid grid-cols-5 gap-2">
                  <Input
                    className="col-span-2"
                    value={ex.nombre}
                    onChange={(e) => {
                      const v = e.target.value
                      setCfg((s) => {
                        const updated = [...s.extrasFijos]
                        updated[idx] = { ...updated[idx], nombre: v }
                        return { ...s, extrasFijos: updated }
                      })
                    }}
                  />
                  <Input
                    type="number"
                    className="col-span-2"
                    value={ex.precio}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setCfg((s) => {
                        const updated = [...s.extrasFijos]
                        updated[idx] = { ...updated[idx], precio: v }
                        return { ...s, extrasFijos: updated }
                      })
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCfg((s) => ({ ...s, extrasFijos: s.extrasFijos.filter((_, i) => i !== idx) }))
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() => {
                  setCfg((s) => ({
                    ...s,
                    extrasFijos: [...s.extrasFijos, { id: crypto.randomUUID(), nombre: "Nuevo extra", precio: 0 }],
                  }))
                }}
              >
                Agregar extra
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Ítems por cantidad</div>
            <div className="space-y-2">
              {cfg.itemsPorCantidad.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-5 gap-2">
                  <Input
                    className="col-span-2"
                    value={it.nombre}
                    onChange={(e) => {
                      const v = e.target.value
                      setCfg((s) => {
                        const updated = [...s.itemsPorCantidad]
                        updated[idx] = { ...updated[idx], nombre: v }
                        return { ...s, itemsPorCantidad: updated }
                      })
                    }}
                  />
                  <Input
                    type="number"
                    className="col-span-2"
                    value={it.precioUnitario}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setCfg((s) => {
                        const updated = [...s.itemsPorCantidad]
                        updated[idx] = { ...updated[idx], precioUnitario: v }
                        return { ...s, itemsPorCantidad: updated }
                      })
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCfg((s) => ({ ...s, itemsPorCantidad: s.itemsPorCantidad.filter((_, i) => i !== idx) }))
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() => {
                  setCfg((s) => ({
                    ...s,
                    itemsPorCantidad: [
                      ...s.itemsPorCantidad,
                      { id: crypto.randomUUID(), nombre: "Nuevo ítem", precioUnitario: 0 },
                    ],
                  }))
                }}
              >
                Agregar ítem
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => guardarConfig(cfg)} className="modern-button">
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
