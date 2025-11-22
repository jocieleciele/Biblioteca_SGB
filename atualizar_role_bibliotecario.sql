-- ============================================
-- SCRIPT PARA ATUALIZAR ROLE DE BIBLIOTECÁRIO
-- Remove acento de "Bibliotecário" para "Bibliotecario"
-- ============================================

-- Atualizar role de Bibliotecário para Bibliotecario
UPDATE users 
SET role = 'Bibliotecario', 
    updated_at = CURRENT_TIMESTAMP
WHERE role = 'Bibliotecário';

-- Verificar atualização
SELECT id, name, email, role FROM users WHERE role = 'Bibliotecario' OR role = 'Bibliotecário';

