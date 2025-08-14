-- Adding tipo column to distinguish migrated reservations
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'normal';

-- Add index for better performance when filtering by tipo
CREATE INDEX IF NOT EXISTS idx_reservations_tipo ON public.reservations(tipo);

-- Update existing reservations to have 'normal' tipo
UPDATE public.reservations 
SET tipo = 'normal' 
WHERE tipo IS NULL;
