-- Agregar columna de descuento a la tabla de reservas
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS descuento_porcentaje DECIMAL(5,2) DEFAULT 0;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS total_con_descuento DECIMAL(10,2) DEFAULT 0;