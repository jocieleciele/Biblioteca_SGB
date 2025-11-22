
-- SCRIPT PARA CRIAR USUÁRIOS DE EXEMPLO
-- Sistema de Biblioteca - SGB
-- Execute este script no PostgreSQL após criar as tabelas
-- 
-- CREDENCIAIS DE ACESSO:
-- 
-- ADMINISTRADOR:
--   Email: admin@biblioteca.com
--   Senha: 123456
--   Acessa: /admin (Dashboard Administrador)
--
-- BIBLIOTECARIO:
--   Email: bibliotecario@biblioteca.com
--   Senha: 123456
--   Acessa: /painel (Dashboard Bibliotecario)
--
-- LEITOR:
--   Pode se cadastrar normalmente pela página de Registro
--   Todos os novos registros são criados como "Leitor"

-- Inserir Administrador
INSERT INTO users (name, email, password, role) 
VALUES (
  'Administrador', 
  'admin@biblioteca.com', 
  '$2a$10$MGQ4TgnR.9AfMCvM8wdeze21FlwFoWzcRjm3.mTtz.nnR8XNBIRU6',
  'Administrador'
)
ON CONFLICT (email) DO NOTHING;

-- Inserir Bibliotecario
INSERT INTO users (name, email, password, role) 
VALUES (
  'Bibliotecario', 
  'bibliotecario@biblioteca.com', 
  '$2a$10$7EgAzHJcH8oFq27GMUTmAeFtgy2K4B0Av37.oN8PzRi8xq5.Ww0H.',
  'Bibliotecario'
)
ON CONFLICT (email) DO NOTHING;

-- Verificar usuários criados
SELECT id, name, email, role FROM users ORDER BY role, name;

