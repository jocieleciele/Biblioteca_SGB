-- ============================================
-- COMANDO SIMPLES PARA ATUALIZAR ROLE
-- Execute no PostgreSQL
-- ============================================

-- Conectar ao banco
\c sgbiblioteca2

-- Atualizar role de Bibliotecário para Bibliotecario
UPDATE users 
SET role = 'Bibliotecario', 
    updated_at = CURRENT_TIMESTAMP
WHERE role = 'Bibliotecário';

-- Verificar resultado
SELECT id, name, email, role FROM users WHERE role LIKE '%Bibliotec%';

