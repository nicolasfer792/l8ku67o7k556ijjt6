"use client"

import React from "react"
import { useAtila } from "@/store/atila-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle, AlertCircle, Database, Eye } from "lucide-react"
import { processExcelFile, type ProcessedReservationData } from "@/lib/excel-processor"
import { migrateReservationsFromExcel } from "@/app/actions"

export function ConfigForm() {
  const { state, guardarConfig } = useAtila()
  const [cfg, setCfg] = React.useState(state.config)
  const [uploadStatus, setUploadStatus] = React.useState<"idle" | "uploading" | "processing" | "success" | "error">(
    "idle",
  )
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([])
  const [extractedData, setExtractedData] = React.useState<ProcessedReservationData[]>([])
  const [processingResults, setProcessingResults] = React.useState<string>("")

  const [showExtrasFijos, setShowExtrasFijos] = React.useState(() => localStorage.getItem('showExtrasFijos') !== 'false')
  const [showDescuento, setShowDescuento] = React.useState(() => localStorage.getItem('showDescuento') !== 'false')
  const [showCostoExtra, setShowCostoExtra] = React.useState(() => localStorage.getItem('showCostoExtra') !== 'false')

  React.useEffect(() => {
    setCfg(state.config)
  }, [state.config])

  const updateNumber = (key: keyof typeof cfg, value: number) => {
    setCfg((s) => ({ ...s, [key]: parseFloat(value.toString()) }))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setUploadStatus("uploading")
    setUploadedFiles(files)
    setExtractedData([])
    setProcessingResults("")

    try {
      const allExtractedData: ProcessedReservationData[] = []
      let processedCount = 0
      let errorCount = 0
      let savedCount = 0

      setUploadStatus("processing")

      // Process Excel files using the dedicated Excel processor
      if (files.length > 0 && files[0].name.endsWith('.xlsx')) {
        try {
          const processedData = await processExcelFile(files[0])
          if (processedData && processedData.length > 0) {
            allExtractedData.push(...processedData)
            processedCount = 1 // Count as 1 file processed
          } else {
            errorCount++
            console.error(`No data found in ${files[0].name}`)
          }
        } catch (error) {
          errorCount++
          console.error(`Error processing ${files[0].name}:`, error)
        }
      } else {
        errorCount++
        console.error(`Invalid file format. Please upload an .xlsx file.`)
      }

      if (allExtractedData.length > 0) {
        setExtractedData(allExtractedData)

        // Use the dedicated Excel migration function
        try {
          const result = await migrateReservationsFromExcel(files[0])
          if (result.migratedCount > 0) {
            savedCount = result.migratedCount
          } else {
            errorCount++
            console.error("Migration failed:", result.errors)
            // Add error details to the processing results
            if (result.errors && result.errors.length > 0) {
              setProcessingResults(prev => prev + "\n\nErrores detallados:\n" + result.errors!.join("\n"))
            }
          }
        } catch (error) {
          errorCount++
          console.error("Error during migration:", error)
          // Add error details to the processing results
          setProcessingResults(prev => prev + "\n\nError crítico: " + (error instanceof Error ? error.message : "Error desconocido"))
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
    <div className="space-y-6 animate-fade-in">
      <Card className="w-full hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-teal-700 animate-slide-in-left">
            <Database className="h-5 w-5" />
            <span>Migración de datos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 animate-staggered-fade-in">
            Sube tus archivos Excel de balances anteriores para importar datos históricos de reservas y finanzas.
          </p>

          <div
            className="upload-area p-8 text-center cursor-pointer animate-staggered-fade-in delay-100"
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
            <p className="mb-2">
              <strong>Columnas esperadas en tu archivo Excel:</strong>
            </p>
            <ul className="list-disc list-inside mb-2 space-y-1">
              <li><strong>Fecha:</strong> Fecha del evento (formato AAAA-MM-DD o DD/MM/AAAA)</li>
              <li><strong>Evento o Nombre:</strong> Nombre del cliente o evento</li>
              <li><strong>Cant Personas:</strong> Cantidad de personas</li>
              <li><strong>Telefono:</strong> Número de teléfono</li>
              <li><strong>Presupuesto:</strong> Monto total del evento</li>
              <li><strong>Seña:</strong> Monto de la seña o depósito</li>
              <li><strong>Saldo:</strong> Saldo restante por pagar</li>
              <li><strong>Vajilla, Mesas, ETC:</strong> Detalles adicionales (se guardarán en notas)</li>
            </ul>
            <p className="text-xs">
              <strong>Nota:</strong> El sistema buscará automáticamente estas columnas en tu archivo, sin importar el orden exacto.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full hover-lift">
        <CardHeader>
          <CardTitle className="text-teal-700 animate-slide-in-right">Configuración de precios y gastos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="animate-staggered-fade-in">
              <Label>Base (entre semana)</Label>
              <Input
                type="number"
                value={cfg.baseEntreSemana}
                onChange={(e) => updateNumber("baseEntreSemana", Number(e.target.value))}
                className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
              />
            </div>
            <div className="animate-staggered-fade-in delay-100">
              <Label>Base (fin de semana)</Label>
              <Input
                type="number"
                value={cfg.baseFinDeSemana}
                onChange={(e) => updateNumber("baseFinDeSemana", Number(e.target.value))}
                className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
              />
            </div>
            <div className="animate-staggered-fade-in delay-200">
              <Label>Precio por persona (entre semana)</Label>
              <Input
                type="number"
                value={cfg.precioPorPersonaEntreSemana}
                onChange={(e) => updateNumber("precioPorPersonaEntreSemana", Number(e.target.value))}
                className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
              />
            </div>
            <div className="animate-staggered-fade-in delay-300">
              <Label>Precio por persona (fin de semana)</Label>
              <Input
                type="number"
                value={cfg.precioPorPersonaFinDeSemana}
                onChange={(e) => updateNumber("precioPorPersonaFinDeSemana", Number(e.target.value))}
                className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
              />
            </div>
            <div className="animate-staggered-fade-in delay-350">
              <Label>Precio base Patio</Label>
              <Input
                type="number"
                value={cfg.precioPatio}
                onChange={(e) => updateNumber("precioPatio", Number(e.target.value))}
                className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
              />
            </div>
            <div className="animate-staggered-fade-in delay-400">
              <Label>Costo de limpieza por defecto</Label>
              <Input
                type="number"
                value={cfg.costoLimpiezaFijo}
                onChange={(e) => updateNumber("costoLimpiezaFijo", Number(e.target.value))}
                className="transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2 animate-staggered-fade-in delay-500">
            <div className="font-medium">Extras fijos</div>
            <div className="space-y-2">
              {cfg.extrasFijos.map((ex, idx) => (
                <div key={ex.id} className="grid grid-cols-5 gap-2 hover-lift transition-all duration-200 hover:shadow-sm">
                  <Input
                    className="col-span-2 transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
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
                    className="col-span-2 transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
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
                    className="transition-all duration-200 hover:scale-105 hover:bg-destructive hover:text-destructive-foreground"
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
                className="transition-all duration-200 hover:scale-105 hover-lift"
              >
                Agregar extra
              </Button>
            </div>
          </div>

          <div className="space-y-2 animate-staggered-fade-in delay-600">
            <div className="font-medium">Ítems por cantidad</div>
            <div className="space-y-2">
              {cfg.itemsPorCantidad.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-5 gap-2 hover-lift transition-all duration-200 hover:shadow-sm">
                  <Input
                    className="col-span-2 transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
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
                    className="col-span-2 transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
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
                    className="transition-all duration-200 hover:scale-105 hover:bg-destructive hover:text-destructive-foreground"
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
                className="transition-all duration-200 hover:scale-105 hover-lift"
              >
                Agregar ítem
              </Button>
            </div>
          </div>

          <div className="space-y-4 animate-staggered-fade-in delay-700">
            <Card className="glass-card bg-white/80 backdrop-blur-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Opciones extra en reservas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200 animate-staggered-fade-in delay-100">
                    <Checkbox
                      id="showExtrasFijos"
                      checked={showExtrasFijos}
                      onCheckedChange={(checked: boolean) => {
                        setShowExtrasFijos(checked)
                        localStorage.setItem('showExtrasFijos', checked.toString())
                      }}
                      className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                    />
                    <Label htmlFor="showExtrasFijos" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Servicios extras (precio fijo)</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200 animate-staggered-fade-in delay-200">
                    <Checkbox
                      id="showDescuento"
                      checked={showDescuento}
                      onCheckedChange={(checked: boolean) => {
                        setShowDescuento(checked)
                        localStorage.setItem('showDescuento', checked.toString())
                      }}
                      className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                    />
                    <Label htmlFor="showDescuento" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Descuento (%)</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200 animate-staggered-fade-in delay-300">
                    <Checkbox
                      id="showCostoExtra"
                      checked={showCostoExtra}
                      onCheckedChange={(checked: boolean) => {
                        setShowCostoExtra(checked)
                        localStorage.setItem('showCostoExtra', checked.toString())
                      }}
                      className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                    />
                    <Label htmlFor="showCostoExtra" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Costo extra</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 animate-staggered-fade-in delay-700">
            <div className="flex justify-end">
              <Button onClick={() => guardarConfig(cfg)} className="modern-button hover-lift transition-all duration-200 hover:shadow-md">
                Guardar cambios
              </Button>
            </div>
            
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
