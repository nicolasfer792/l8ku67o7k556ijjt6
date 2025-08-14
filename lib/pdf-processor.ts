import type { PDFDocumentProxy, TextItem } from "pdfjs-dist/types/src/display/api"

export interface ExtractedReservationData {
  fecha: string
  cliente: string
  personas: number
  precio: number
  extras?: string[]
  notas?: string
  tipo: "migrada"
}

export interface ProcessingResult {
  success: boolean
  data?: ExtractedReservationData[]
  error?: string
}

// PDF text extraction using browser APIs
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Use PDF.js library for text extraction
    const arrayBuffer = await file.arrayBuffer()

    // Import PDF.js dynamically to avoid SSR issues
    const pdfjsLib = await import("pdfjs-dist")

    // Set worker source
    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    }

    const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ""

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .filter((item): item is TextItem => "str" in item)
        .map((item) => item.str)
        .join(" ")
      fullText += pageText + "\n"
    }

    return fullText
  } catch (error) {
    console.error("Error extracting PDF text:", error)
    throw new Error("No se pudo extraer texto del PDF")
  }
}

// Excel/CSV processing for .xlsx files
export async function extractTextFromExcel(file: File): Promise<string> {
  try {
    // Use SheetJS for Excel processing
    const arrayBuffer = await file.arrayBuffer()
    const XLSX = await import("xlsx")

    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    let fullText = ""

    // Process all sheets
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const csvText = XLSX.utils.sheet_to_csv(worksheet)
      fullText += csvText + "\n"
    })

    return fullText
  } catch (error) {
    console.error("Error extracting Excel text:", error)
    throw new Error("No se pudo extraer texto del archivo Excel")
  }
}

// Smart data extraction using pattern matching
export function extractReservationData(text: string): ExtractedReservationData[] {
  const reservations: ExtractedReservationData[] = []

  // Common date patterns
  const datePatterns = [
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/g, // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/g, // YYYY/MM/DD or YYYY-MM-DD
    /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi, // DD de Mes de YYYY
  ]

  // Price patterns
  const pricePatterns = [
    /\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g, // $1,000.00 or $1.000,00
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:pesos|$)/gi, // 1000 pesos
    /total[:\s]*\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi, // Total: $1000
  ]

  // People count patterns
  const peoplePatterns = [/(\d+)\s*personas?/gi, /(\d+)\s*invitados?/gi, /(\d+)\s*asistentes?/gi, /pax[:\s]*(\d+)/gi]

  // Name patterns (common Spanish names and surnames)
  const namePatterns = [
    /(?:cliente|nombre|reserva)[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/gi,
    /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/g,
  ]

  // Split text into potential reservation blocks
  const lines = text.split("\n").filter((line) => line.trim().length > 0)

  let currentReservation: Partial<ExtractedReservationData> = {}

  for (const line of lines) {
    // Try to extract date
    for (const pattern of datePatterns) {
      const dateMatch = pattern.exec(line)
      if (dateMatch) {
        let fecha = ""
        if (dateMatch[0].includes("/") || dateMatch[0].includes("-")) {
          // Convert to YYYY-MM-DD format
          const parts = dateMatch[0].split(/[/-]/)
          if (parts[0].length === 4) {
            fecha = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
          } else {
            fecha = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
          }
        } else {
          // Handle Spanish month names
          const monthNames: { [key: string]: string } = {
            enero: "01",
            febrero: "02",
            marzo: "03",
            abril: "04",
            mayo: "05",
            junio: "06",
            julio: "07",
            agosto: "08",
            septiembre: "09",
            octubre: "10",
            noviembre: "11",
            diciembre: "12",
          }
          const month = monthNames[dateMatch[2].toLowerCase()] || "01"
          fecha = `${dateMatch[3]}-${month}-${dateMatch[1].padStart(2, "0")}`
        }
        currentReservation.fecha = fecha
        break
      }
    }

    // Try to extract price
    for (const pattern of pricePatterns) {
      const priceMatch = pattern.exec(line)
      if (priceMatch) {
        const priceStr = priceMatch[1].replace(/[.,]/g, "")
        const precio = Number.parseInt(priceStr) / (priceStr.length > 4 ? 100 : 1)
        if (precio > 0 && precio < 1000000) {
          // Reasonable price range
          currentReservation.precio = precio
        }
        break
      }
    }

    // Try to extract people count
    for (const pattern of peoplePatterns) {
      const peopleMatch = pattern.exec(line)
      if (peopleMatch) {
        const personas = Number.parseInt(peopleMatch[1])
        if (personas > 0 && personas < 1000) {
          // Reasonable people count
          currentReservation.personas = personas
        }
        break
      }
    }

    // Try to extract client name
    for (const pattern of namePatterns) {
      const nameMatch = pattern.exec(line)
      if (nameMatch) {
        const cliente = nameMatch[1] || nameMatch[0]
        if (cliente.length > 2 && cliente.length < 100) {
          currentReservation.cliente = cliente.trim()
        }
        break
      }
    }

    // If we have enough data for a reservation, save it
    if (currentReservation.fecha && currentReservation.precio && currentReservation.cliente) {
      reservations.push({
        fecha: currentReservation.fecha,
        cliente: currentReservation.cliente,
        personas: currentReservation.personas || 10, // Default people count
        precio: currentReservation.precio,
        tipo: "migrada",
        notas: "Reserva migrada desde archivo externo",
      })
      currentReservation = {} // Reset for next reservation
    }
  }

  return reservations
}

// Main processing function
export async function processFile(file: File): Promise<ProcessingResult> {
  try {
    let text = ""

    if (file.type === "application/pdf") {
      text = await extractTextFromPDF(file)
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel"
    ) {
      text = await extractTextFromExcel(file)
    } else {
      throw new Error("Tipo de archivo no soportado")
    }

    const extractedData = extractReservationData(text)

    if (extractedData.length === 0) {
      return {
        success: false,
        error: "No se encontraron datos de reservas en el archivo",
      }
    }

    return {
      success: true,
      data: extractedData,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al procesar archivo",
    }
  }
}
