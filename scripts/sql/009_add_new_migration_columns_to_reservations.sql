-- Add new migration columns to the reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS telefono TEXT,
ADD COLUMN IF NOT EXISTS senia NUMERIC,
ADD COLUMN IF NOT EXISTS vajilla TEXT,
ADD COLUMN IF NOT EXISTS mesas TEXT,
ADD COLUMN IF NOT EXISTS precio_migrado NUMERIC;