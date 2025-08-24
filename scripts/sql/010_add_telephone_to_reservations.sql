-- Agregar columna para teléfono de contacto en las reservas

-- Agregar columna telefono (número de teléfono del cliente)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) DEFAULT NULL;

-- Crear índice opcional para mejorar el rendimiento de búsquedas por teléfono
CREATE INDEX IF NOT EXISTS idx_reservations_telefono ON reservations(telefono);