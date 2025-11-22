
-- SCRIPT COMPLETO PARA CRIAR O BANCO E TABELAS
-- Sistema de Biblioteca - SGB

-- PASSO 1: Criar o banco de dados (execute primeiro)
-- CREATE DATABASE sgbiblioteca2;

-- PASSO 2: Conectar ao banco (execute no psql)
-- \c sgbiblioteca2

-- PASSO 3: Criar todas as tabelas (copie e cole tudo abaixo)
-- TABELA: users (Usuários)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Leitor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- TABELA: materials (Materiais/Livros)
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(255),
    categoria VARCHAR(100),
    ano INTEGER,
    capa VARCHAR(255),
    avaliacao INTEGER DEFAULT 0,
    total INTEGER DEFAULT 1,
    disponivel INTEGER DEFAULT 1,
    descricao TEXT,
    isbn VARCHAR(20),
    tipo VARCHAR(50) DEFAULT 'Livro',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- TABELA: material_keywords (Palavras-chave)
CREATE TABLE material_keywords (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    UNIQUE(material_id, keyword)
);

-- TABELA: emprestimos (Empréstimos)
CREATE TABLE emprestimos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    data_emprestimo TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_prevista TIMESTAMP WITH TIME ZONE,
    data_devolucao TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Em andamento',
    renovacoes INTEGER DEFAULT 0,
    notificado_atraso BOOLEAN DEFAULT FALSE
);

-- TABELA: reservas (Reservas)
CREATE TABLE reservas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES users(id),
  material_id INTEGER NOT NULL REFERENCES materials(id),
  data_reserva TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'Pendente',
  notificado_em TIMESTAMP WITH TIME ZONE,
  expira_em TIMESTAMP WITH TIME ZONE
);

-- TABELA: multas (Multas)
CREATE TABLE multas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    emprestimo_id INTEGER REFERENCES emprestimos(id),
    valor DECIMAL(10, 2) NOT NULL,
    dias_atraso INTEGER NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_pagamento TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Pendente',
    descricao TEXT
);

-- TABELA: pagamentos (Pagamentos)
CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,
    multa_id INTEGER NOT NULL REFERENCES multas(id),
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    valor DECIMAL(10, 2) NOT NULL,
    metodo_pagamento VARCHAR(50),
    transacao_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pendente',
    data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dados_pagamento JSONB
);

-- TABELA: recomendacoes (Recomendações)
CREATE TABLE recomendacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    score DECIMAL(5, 2) NOT NULL,
    motivo TEXT,
    data_recomendacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    visualizado BOOLEAN DEFAULT FALSE
);

-- DADOS DE EXEMPLO (Opcional)
INSERT INTO materials (titulo, autor, categoria, ano, capa, avaliacao, total, disponivel) VALUES
('Coroa dos Justos', 'Morgan Rice', 'Ficção', 2025, 'img1', 4, 2, 2),
('Canção dos Valentes', 'Morgan Rice', 'Ficção', 2025, 'img2', 5, 1, 1),
('A Arte da Guerra', 'Sun Tzu', 'Ação', 2009, 'img3', 3, 5, 5),
('O Encantador de Corvos', 'Jacob Grey', 'Ficção', 2017, 'img4', 2, 2, 2);

-- VERIFICAR SE TUDO FOI CRIADO
-- Execute para ver todas as tabelas:
-- \dt

-- Execute para contar as tabelas:
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Execute para ver os materiais inseridos:
-- SELECT * FROM materials;

