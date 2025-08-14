-- Script para verificar si el usuario admin existe
SELECT * FROM admin_users WHERE username = 'Atila30';

-- Si no existe, lo creamos
INSERT INTO admin_users (username, password_hash, created_at)
SELECT 'Atila30', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'Atila30');

-- Verificar el hash de la contraseña (debería ser para 'Ferrari2020')
-- Si necesitas regenerar el hash, descomenta la siguiente línea:
-- UPDATE admin_users SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE username = 'Atila30';
