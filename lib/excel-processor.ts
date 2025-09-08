import * as XLSX from 'xlsx';
import type { Reservation } from './types';
import { isWeekend } from './date-utils';

export interface ExcelRow {
  // Standard columns
  Fecha?: string;
  Evento?: string;
  Cant_Personas?: number;
  Telefono?: string;
  Presupuesto?: number;
  COSTO_TOTAL?: number;
  Sena?: string;
  Seña?: string;
  Notas?: string;
  Saldo?: number;
  Vajilla?: string;
  Mesas?: string;
  ETC?: string;
  
  // Atila-specific columns from the user's file
  'Cant Personas'?: number;
  'Nombre'?: string;
  'Entrega'?: number;
  'Vajilla, Mesas,ETC'?: string;
  
  // Allow dynamic properties for any column name
  [key: string]: any;
}

export interface ProcessedReservationData {
  nombreCliente: string;
  fecha: string;
  cantidadPersonas: number;
  telefono: string;
  total: number;
  notas: string;
  saldo: number;
  extrasFijosSeleccionados: string[];
  cantidades: Record<string, { cantidad: number; precioUnitarioFijo: number }>;
  estado: 'interesado' | 'señado' | 'confirmado';
  // Extended optional fields for richer backups/import
  tipo?: 'salon' | 'patio' | 'migrada';
  incluirLimpieza?: boolean;
  costoLimpieza?: number;
  descuentoPorcentaje?: number;
  pagado?: number;
  pagadoEn?: Array<{ fecha: string; monto: number }>;
  precioBaseFijo?: number;
  precioPorPersonaFijo?: number;
  extrasFijosTotalFijo?: number;
  cantidadesTotalFijo?: number;
}

export function processExcelFile(file: File): Promise<ProcessedReservationData[]> {
  return new Promise((resolve, reject) => {
    console.log('Iniciando procesamiento de archivo:', file.name);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        console.log('Datos leídos, tamaño:', data.length);
        
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('Hojas encontradas:', workbook.SheetNames);
        
        // Try to find the first sheet with data
        let worksheet;
        let sheetName;
        
        for (const name of workbook.SheetNames) {
          const sheet = workbook.Sheets[name];
          console.log(`Hoja ${name}:`, Object.keys(sheet).length, 'claves');
          if (sheet && Object.keys(sheet).length > 1) { // More than just the !ref key
            worksheet = sheet;
            sheetName = name;
            break;
          }
        }
        
        if (!worksheet) {
          reject(new Error('No se encontraron datos en el archivo Excel'));
          return;
        }
        
        console.log('Usando hoja:', sheetName);
        
        // Convert to JSON and log for debugging
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Datos convertidos a JSON, filas:', jsonData.length);
        
        // If first row is header, shift to get data
        let dataRows: any[] = [];
        if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
          console.log('Primera fila (posible encabezado):', jsonData[0]);
          
          // Convert 2D array to objects using first row as headers
          const headers = jsonData[0] as string[];
          console.log('Encabezados detectados:', headers);
          
          dataRows = jsonData.slice(1).map((row: any[], index) => {
            const obj: any = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined && row[colIndex] !== null) {
                obj[header.trim()] = row[colIndex];
              }
            });
            return obj;
          });
        } else {
          dataRows = jsonData as any[];
        }
        
        console.log('Filas procesadas:', dataRows.length);
        
        // Log first few rows for debugging
        if (dataRows.length > 0) {
          console.log('Primeras 3 filas:');
          dataRows.slice(0, 3).forEach((row, i) => {
            console.log(`Fila ${i + 1}:`, row);
          });
        }
        
        // Filter out completely empty rows but be more permissive
        const validRows = dataRows.filter((row, index) => {
          // Check if row has any meaningful data
          const hasData = Object.keys(row).some(key => {
            const value = (row as any)[key];
            return value !== undefined &&
                   value !== null &&
                   value !== '' &&
                   String(value).trim().length > 0;
          });
          
          // Also check if it looks like a reservation row
          const looksLikeReservation = Object.keys(row).some(key =>
            key.toLowerCase().includes('fecha') ||
            key.toLowerCase().includes('evento') ||
            key.toLowerCase().includes('nombre') ||
            key.toLowerCase().includes('presupuesto') ||
            key.toLowerCase().includes('cant') ||
            key.toLowerCase().includes('cliente')
          );
          
          console.log(`Fila ${index + 1}: tiene datos=${hasData}, parece reserva=${looksLikeReservation}`);
          return hasData; // Be more permissive, just require some data
        });
        
        console.log('Filas válidas después de filtrado:', validRows.length);
        
        if (validRows.length === 0) {
          reject(new Error('No se encontraron filas con datos de reservas válidos'));
          return;
        }
        
        const processedData = validRows.map((row, index) => {
          try {
            const result = processExcelRow(row, index);
            // Ensure we return a plain object
            return {
              nombreCliente: result.nombreCliente,
              fecha: result.fecha,
              cantidadPersonas: result.cantidadPersonas,
              telefono: result.telefono,
              total: result.total,
              notas: result.notas,
              saldo: result.saldo,
              extrasFijosSeleccionados: result.extrasFijosSeleccionados,
              cantidades: result.cantidades,
              estado: result.estado
            };
          } catch (error) {
            console.error(`Error procesando fila ${index + 1}:`, error);
            throw new Error(`Error en fila ${index + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        });
        
        console.log('Datos procesados exitosamente:', processedData.length, 'reservas');
        resolve(processedData);
      } catch (error) {
        console.error('Error detallado al procesar Excel:', error);
        reject(new Error(`Error al procesar el archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

function processExcelRow(row: any, index: number): ProcessedReservationData {
  // Log the row for debugging
  console.log(`Procesando fila ${index + 1}:`, row);

  // Fast-path: parse rows generated by our own backup/export (rich columns)
  try {
    const keys = Object.keys(row);
    const hasBackupShape =
      keys.some(k => k && k.toString().toLowerCase().includes("extrasfijosseleccionados")) ||
      keys.some(k => k && k.toString().toLowerCase().includes("cantidades")) ||
      keys.some(k => k && k.toString().toLowerCase().includes("descuentoporcentaje"));

    if (hasBackupShape) {
      const get = (label: string) => {
        const key = keys.find(k => k.toString().toLowerCase() === label.toLowerCase());
        return key ? row[key] : undefined;
      };

      const fechaRaw = get("Fecha");
      let fecha = "";
      if (fechaRaw) {
        if (typeof fechaRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)) {
          fecha = fechaRaw;
        } else {
          const d = new Date(fechaRaw);
          fecha = isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0];
        }
      } else {
        fecha = new Date().toISOString().split("T")[0];
      }

      const nombreCliente = String(get("Cliente") ?? get("Nombre") ?? get("Evento") ?? `Reserva ${index + 1}`).trim();
      const cantidadPersonas = Number(get("Personas") ?? 0) || 0;
      const telefono = String(get("Telefono") ?? "").trim();
      const total = Number(get("Total") ?? 0) || 0;
      const notas = String(get("Notas") ?? "").toString();

      // Estado normalization
      const estadoStr = String(get("Estado") ?? "").toLowerCase();
      let estado: 'interesado' | 'señado' | 'confirmado' = 'interesado';
      if (estadoStr.includes("confirm")) estado = "confirmado";
      else if (estadoStr.includes("señ") || estadoStr.includes("sena") || estadoStr.includes("se\u00f1")) estado = "señado";
      else if (estadoStr.includes("inter")) estado = "interesado";

      // Tipo
      const tipoRaw = String(get("Tipo") ?? "").toLowerCase();
      const tipo = (tipoRaw === "salon" || tipoRaw === "patio" || tipoRaw === "migrada") ? (tipoRaw as any) : "migrada";

      // Extras seleccionados
      let extrasFijosSeleccionados: string[] = [];
      const extrasJson = get("ExtrasFijosSeleccionados");
      if (extrasJson) {
        try {
          const parsed = typeof extrasJson === "string" ? JSON.parse(extrasJson) : extrasJson;
          if (Array.isArray(parsed)) {
            extrasFijosSeleccionados = parsed.filter((x: any) => typeof x === "string");
          }
        } catch {}
      }

      // Cantidades
      let cantidades: Record<string, { cantidad: number; precioUnitarioFijo: number }> = {};
      const cantidadesRaw = get("Cantidades");
      if (cantidadesRaw) {
        try {
          const parsed = typeof cantidadesRaw === "string" ? JSON.parse(cantidadesRaw) : cantidadesRaw;
          if (parsed && typeof parsed === "object") {
            Object.entries(parsed as Record<string, any>).forEach(([id, val]) => {
              if (typeof val === "number") cantidades[id] = { cantidad: val, precioUnitarioFijo: 0 };
              else if (val && typeof val === "object") {
                const qty = Number((val as any).cantidad) || 0;
                const pu = Number((val as any).precioUnitarioFijo) || 0;
                cantidades[id] = { cantidad: qty, precioUnitarioFijo: pu };
              }
            });
          }
        } catch {}
      }

      const descuentoPorcentaje = Number(get("DescuentoPorcentaje") ?? 0) || 0;
      const incluirLimpieza = String(get("IncluyeLimpieza") ?? "").toLowerCase() === "true";
      const costoLimpieza = Number(get("CostoLimpieza") ?? 0) || 0;

      const pagado = Number(get("Pagado") ?? 0) || 0;
      let pagadoEn: Array<{ fecha: string; monto: number }> | undefined = undefined;
      const pagadoEnRaw = get("PagadoEn");
      if (pagadoEnRaw) {
        try {
          const parsed = typeof pagadoEnRaw === "string" ? JSON.parse(pagadoEnRaw) : pagadoEnRaw;
          if (Array.isArray(parsed)) {
            pagadoEn = parsed.map((p: any) => ({
              fecha: p.fecha ? String(p.fecha) : "",
              monto: Number(p.monto) || 0,
            })).filter(p => p.fecha);
          }
        } catch {}
      }

      const precioBaseFijo = Number(get("PrecioBaseFijo") ?? 0) || 0;
      const precioPorPersonaFijo = Number(get("PrecioPorPersonaFijo") ?? 0) || 0;
      const extrasFijosTotalFijo = Number(get("ExtrasFijosTotal") ?? 0) || 0;
      const cantidadesTotalFijo = Number(get("CantidadesTotal") ?? 0) || 0;

      // saldo: mantener compatibilidad (usamos Pagado como saldo si existe)
      const saldo = pagado;

      return {
        nombreCliente,
        fecha,
        cantidadPersonas,
        telefono,
        total,
        notas,
        saldo,
        extrasFijosSeleccionados,
        cantidades,
        estado,
        tipo,
        incluirLimpieza,
        costoLimpieza,
        descuentoPorcentaje,
        pagado,
        pagadoEn,
        precioBaseFijo,
        precioPorPersonaFijo,
        extrasFijosTotalFijo,
        cantidadesTotalFijo,
      };
    }
  } catch (e) {
    console.log("Fast-path de respaldo no aplicado, usando heurísticas estándar...");
  }
  
  // Validar campos requeridos - be more flexible
  const hasDate = Object.keys(row).some(key =>
    key.toLowerCase().includes('fecha') && row[key]
  );
  
  const hasAmount = Object.keys(row).some(key =>
    (key.toLowerCase().includes('presupuesto') ||
     key.toLowerCase().includes('total') ||
     key.toLowerCase().includes('seña') ||
     key.toLowerCase().includes('entrega')) &&
    row[key]
  );
  
  const hasEvent = Object.keys(row).some(key =>
    (key.toLowerCase().includes('evento') ||
     key.toLowerCase().includes('nombre') ||
     key.toLowerCase().includes('cliente')) &&
    row[key]
  );
  
  console.log(`Fila ${index + 1} - tiene fecha:${hasDate}, monto:${hasAmount}, evento:${hasEvent}`);
  
  // If it has some data, process it even if not all fields are present
  if (!hasDate && !hasAmount && !hasEvent) {
    console.log(`Fila ${index + 1} no tiene datos reconocibles`);
    throw new Error('La fila no contiene datos reconocibles (fecha, monto o evento)');
  }
  
  // Get event name from Evento column or use a default - be more flexible
  const eventKey = Object.keys(row).find(key =>
    key.toLowerCase().includes('evento') ||
    key.toLowerCase().includes('nombre') ||
    key.toLowerCase().includes('cliente')
  );
  const evento = eventKey ? row[eventKey]?.trim() : `Reserva ${index + 1}`;
  
  // Get people count, with default if not provided - be more flexible
  const peopleKey = Object.keys(row).find(key =>
    key.toLowerCase().includes('cant') ||
    key.toLowerCase().includes('personas')
  );
  const cantPersonas = peopleKey ? Number(row[peopleKey]) || 10 : 10;
  
  // Procesar fecha - try multiple date formats and be more flexible
  let fecha: string;
  try {
    const dateKey = Object.keys(row).find(key => key.toLowerCase().includes('fecha'));
    const dateValue = dateKey ? row[dateKey] : null;
    
    if (!dateValue) {
      // If no date provided, use current date
      fecha = new Date().toISOString().split('T')[0];
      console.log(`Fila ${index + 1}: Usando fecha actual por defecto`);
    } else {
      let date;
      // Try different date formats
      if (typeof dateValue === 'string') {
        if (dateValue.includes('-')) {
          // YYYY-MM-DD format
          date = new Date(dateValue);
        } else if (dateValue.includes('/')) {
          // Try DD/MM/YYYY format
          const parts = dateValue.split('/');
          if (parts.length === 3) {
            date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          } else {
            date = new Date(dateValue);
          }
        } else {
          date = new Date(dateValue);
        }
      } else {
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) {
        console.log(`Fila ${index + 1}: Fecha inválida, usando fecha actual`);
        fecha = new Date().toISOString().split('T')[0];
      } else {
        fecha = date.toISOString().split('T')[0];
      }
    }
  } catch (error) {
    console.log(`Fila ${index + 1}: Error de fecha, usando fecha actual`);
    fecha = new Date().toISOString().split('T')[0];
  }
  
  // Procesar teléfono - be more flexible
  const phoneKey = Object.keys(row).find(key => key.toLowerCase().includes('telefono'));
  const telefono = phoneKey ? String(row[phoneKey]).trim() : '';
  
  // Procesar presupuesto y saldo - try multiple amount columns and be more flexible
  const amountKeys = Object.keys(row).filter(key =>
    key.toLowerCase().includes('presupuesto') ||
    key.toLowerCase().includes('total') ||
    key.toLowerCase().includes('seña') ||
    key.toLowerCase().includes('entrega') ||
    key.toLowerCase().includes('saldo')
  );
  
  let total = 0;
  let saldo = 0;
  
  // Try to find total first
  const totalKey = amountKeys.find(key =>
    key.toLowerCase().includes('presupuesto') ||
    key.toLowerCase().includes('total')
  );
  if (totalKey) {
    total = Number(row[totalKey]) || 0;
  }
  
  // If no total found, try other amount columns
  if (total === 0) {
    const otherAmountKey = amountKeys.find(key =>
      !key.toLowerCase().includes('saldo')
    );
    if (otherAmountKey) {
      total = Number(row[otherAmountKey]) || 0;
    }
  }
  
  // Try to find saldo
  const saldoKey = amountKeys.find(key => key.toLowerCase().includes('saldo'));
  if (saldoKey) {
    saldo = Number(row[saldoKey]) || 0;
  }
  
  // Procesar señas (guardar en notas) - try multiple deposit columns
  const depositKey = Object.keys(row).find(key => key.toLowerCase().includes('seña'));
  const seña = depositKey ? `Seña: ${row[depositKey]}` : '';
  
  // Combinar notas - include info from all possible columns
  const vajillaKey = Object.keys(row).find(key => key.toLowerCase().includes('vajilla'));
  const mesasKey = Object.keys(row).find(key => key.toLowerCase().includes('mesas'));
  const etcKey = Object.keys(row).find(key => key.toLowerCase().includes('etc'));
  const detalleKey = Object.keys(row).find(key => key.toLowerCase().includes('detalle'));
  
  const notas = [
    evento, // Include event name in notes
    seña,
    vajillaKey ? `Vajilla: ${row[vajillaKey]}` : '',
    mesasKey ? `Mesas: ${row[mesasKey]}` : '',
    etcKey ? `Extras: ${row[etcKey]}` : '',
    detalleKey ? `Detalles: ${row[detalleKey]}` : ''
  ].filter(Boolean).join(' | ');
  
  // Determinar estado basado en el saldo
  let rowEstado: 'interesado' | 'señado' | 'confirmado' = 'interesado';
  if (saldo > 0) {
    rowEstado = 'señado';
  }
  if (saldo >= total) {
    rowEstado = 'confirmado';
  }
  
  return {
    nombreCliente: evento,
    fecha,
    cantidadPersonas: cantPersonas,
    telefono,
    total,
    notas,
    saldo,
    extrasFijosSeleccionados: [],
    cantidades: {},
    estado: rowEstado
  };
  
  // Procesar extras fijos basados en las notas
  const extrasFijosSeleccionados: string[] = [];
  const cantidades: Record<string, { cantidad: number; precioUnitarioFijo: number }> = {};
  
  // Analizar notas para detectar extras y cantidades
  if (notas) {
    const notasLower = notas.toLowerCase();
    
    // Detectar extras fijos comunes
    if (notasLower.includes('vajilla') || notasLower.includes('vajillas')) {
      extrasFijosSeleccionados.push('vajillas');
    }
    
    if (notasLower.includes('sonido') || notasLower.includes('audio')) {
      extrasFijosSeleccionados.push('sonido');
    }
    
    if (notasLower.includes('decoracion') || notasLower.includes('decoración')) {
      extrasFijosSeleccionados.push('decoracion');
    }
    
    if (notasLower.includes('mesa') || notasLower.includes('mesas')) {
      extrasFijosSeleccionados.push('mesas');
    }
    
    // Detectar cantidades de items
    const cantidadMatches = notas.match(/(\d+)\s*(vasos|sillas|manteles|platos|cubiertos|copas)/gi);
    if (cantidadMatches) {
      (cantidadMatches || []).forEach((match: string) => {
        const matchLower = match.toLowerCase();
        let cantidad = 0;
        let item = '';
        
        // Extraer cantidad
        const cantidadMatch = match.match(/\d+/);
        if (cantidadMatch) {
          cantidad = parseInt(cantidadMatch[0]);
        }
        
        // Identificar tipo de item
        if (matchLower.includes('vaso')) {
          item = 'vasos';
        } else if (matchLower.includes('silla')) {
          item = 'sillas';
        } else if (matchLower.includes('mantel')) {
          item = 'manteles';
        } else if (matchLower.includes('plato')) {
          item = 'platos';
        } else if (matchLower.includes('cubiert')) {
          item = 'cubiertos';
        } else if (matchLower.includes('copa')) {
          item = 'copas';
        }
        
        if (item && cantidad > 0) {
          cantidades[item] = { cantidad, precioUnitarioFijo: 0 }; // Precio se calculará después
        }
      });
    }
  }
  
  return {
    nombreCliente: evento,
    fecha,
    cantidadPersonas: cantPersonas,
    telefono,
    total,
    notas,
    saldo,
    extrasFijosSeleccionados,
    cantidades,
    estado: rowEstado
  };
}

export function validateExcelData(data: ProcessedReservationData[]): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    if (!row.nombreCliente) {
      errors.push(`Fila ${index + 1}: El nombre del evento es requerido`);
    }
    
    if (!row.fecha) {
      errors.push(`Fila ${index + 1}: La fecha es requerida`);
    }
    
    if (row.cantidadPersonas === undefined || row.cantidadPersonas === null || row.cantidadPersonas < 0) {
      errors.push(`Fila ${index + 1}: La cantidad de personas debe ser un número válido (>= 0)`);
    }
    
    if (row.total < 0) {
      errors.push(`Fila ${index + 1}: El presupuesto no puede ser negativo`);
    }
    
    // For migrated reservations, we're more flexible about required fields
    if (row.nombreCliente.includes('Reserva') && !row.total) {
      // Allow reservations without specific totals if they're generic migrated ones
      console.log(`Fila ${index + 1}: Reserva migrada sin monto total específico`);
    }
  });
  
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}