-- Agregar columnas para manejar el estado de pago de las reservas

-- Agregar columna pagado (monto total pagado)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pagado DECIMAL(10,2) DEFAULT 0;

-- Agregar columna pagado_en (registro de pagos con fecha y monto)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pagado_en JSONB DEFAULT '[]';

-- Crear índice para mejorar el rendimiento de consultas por estado de pago
CREATE INDEX IF NOT EXISTS idx_reservations_pagado ON reservations(pagado);