-- Tabela de Usuários
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Leitor', -- Ex: Leitor, Bibliotecário, Administrador
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Tabela de Materiais (Livros, etc.)
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(255),
    categoria VARCHAR(100),
    ano INTEGER,
    capa VARCHAR(255), -- Pode ser um link para a imagem da capa
    avaliacao INTEGER DEFAULT 0,
    total INTEGER DEFAULT 1, -- Quantidade total de cópias
    disponivel INTEGER DEFAULT 1, -- Quantidade disponível para empréstimo
    descricao TEXT,
    isbn VARCHAR(20),
    tipo VARCHAR(50) DEFAULT 'Livro', -- Livro, Periódico, Outro
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Tabela de Palavras-chave para busca avançada
CREATE TABLE material_keywords (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    UNIQUE(material_id, keyword)
);

-- Tabela de Empréstimos
CREATE TABLE emprestimos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    data_emprestimo TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_prevista TIMESTAMP WITH TIME ZONE,
    data_devolucao TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Em andamento', -- Ex: Em andamento, Concluído, Atrasado
    renovacoes INTEGER DEFAULT 0,
    notificado_atraso BOOLEAN DEFAULT FALSE -- Indica se já foi notificado sobre atraso
);

-- Tabela de Reservas
CREATE TABLE reservas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES users(id),
  material_id INTEGER NOT NULL REFERENCES materials(id),
  data_reserva TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'Pendente', -- Ex: Pendente, Ativa, Atendida, Cancelada, Aguardando Retirada
  notificado_em TIMESTAMP WITH TIME ZONE,
  expira_em TIMESTAMP WITH TIME ZONE -- Data de expiração da reserva (48h após notificação)
);

-- Tabela de Multas
CREATE TABLE multas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    emprestimo_id INTEGER REFERENCES emprestimos(id),
    valor DECIMAL(10, 2) NOT NULL,
    dias_atraso INTEGER NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_pagamento TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Pendente', -- Pendente, Paga, Cancelada
    descricao TEXT
);

-- Tabela de Pagamentos
CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,
    multa_id INTEGER NOT NULL REFERENCES multas(id),
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    valor DECIMAL(10, 2) NOT NULL,
    metodo_pagamento VARCHAR(50), -- Cartão, PIX, Boleto
    transacao_id VARCHAR(255), -- ID da transação do gateway de pagamento
    status VARCHAR(50) DEFAULT 'Pendente', -- Pendente, Aprovado, Rejeitado, Cancelado
    data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dados_pagamento JSONB -- Dados adicionais do pagamento
);

-- Tabela de Histórico de Recomendações (para sistema de recomendações inteligentes)
CREATE TABLE recomendacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    score DECIMAL(5, 2) NOT NULL, -- Score de relevância da recomendação
    motivo TEXT, -- Motivo da recomendação (ex: "Baseado em seus empréstimos anteriores")
    data_recomendacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    visualizado BOOLEAN DEFAULT FALSE
);

-- Opcional: Inserir alguns dados de exemplo para testar
INSERT INTO materials (titulo, autor, categoria, ano, capa, avaliacao, total) VALUES
('Coroa dos Justos', 'Morgan Rice', 'Ficção', 2025, 'img1', 4, 2),
('Canção dos Valentes', 'Morgan Rice', 'Ficção', 2025, 'img2', 5, 1),
('A Arte da Guerra', 'Sun Tzu', 'Ação', 2009, 'img3', 3, 5),
('O Encantador de Corvos', 'Jacob Grey', 'Ficção', 2017, 'img4', 2, 2);

-- Usuários de exemplo para teste
-- CREDENCIAIS:
-- Administrador: admin@biblioteca.com / senha: 123456
-- Bibliotecario: bibliotecario@biblioteca.com / senha: 123456
INSERT INTO users (name, email, password, role) VALUES
('Administrador', 'admin@biblioteca.com', '$2a$10$MGQ4TgnR.9AfMCvM8wdeze21FlwFoWzcRjm3.mTtz.nnR8XNBIRU6', 'Administrador'),
('Bibliotecario', 'bibliotecario@biblioteca.com', '$2a$10$7EgAzHJcH8oFq27GMUTmAeFtgy2K4B0Av37.oN8PzRi8xq5.Ww0H.', 'Bibliotecario')
ON CONFLICT (email) DO NOTHING;

