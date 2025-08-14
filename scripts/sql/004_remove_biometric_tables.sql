-- Eliminar tabla de credenciales biométricas
DROP TABLE IF EXISTS public.webauthn_credentials;

-- Eliminar columna device_tokens de admin_users (si no la necesitas)
ALTER TABLE public.admin_users DROP COLUMN IF EXISTS device_tokens;
