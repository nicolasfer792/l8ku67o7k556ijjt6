-- Añadir la columna deleted_at a la tabla reservations
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Actualizar la restricción CHECK para incluir 'trashed' en el estado
ALTER TABLE public.reservations
DROP CONSTRAINT IF EXISTS reservations_estado_check;

ALTER TABLE public.reservations
ADD CONSTRAINT reservations_estado_check CHECK (estado IN ('interesado', 'señado', 'confirmado', 'trashed'));

-- Opcional: Si quieres que las reservas existentes tengan un estado por defecto si no lo tienen
-- UPDATE public.reservations SET estado = 'interesado' WHERE estado IS NULL;
