-- Add costo_limpieza column to the reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS costo_limpieza numeric NOT NULL DEFAULT 0;