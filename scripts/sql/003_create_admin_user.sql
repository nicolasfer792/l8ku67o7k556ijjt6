-- Crear tabla de usuarios admin y insertar credenciales hardcodeadas
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_login timestamp with time zone,
  device_tokens jsonb DEFAULT '[]'::jsonb -- Para recordar dispositivos móviles
);

-- Insertar usuario admin con credenciales hardcodeadas
-- Contraseña: Ferrari2020 (hasheada con bcrypt)
INSERT INTO public.admin_users (username, password_hash) 
VALUES ('Atila30', '$2b$10$8K1p0KGxBf4LjVXAa0E0/.rQVNzMidHvx0oE0E0E0E0E0E0E0E0E0') 
ON CONFLICT (username) DO NOTHING;

-- Eliminé la tabla webauthn_credentials ya que removimos la funcionalidad biométrica
