-- Inserir materiais de exemplo no banco sgbiblioteca2
-- Execute este script se não houver materiais cadastrados

INSERT INTO materials (titulo, autor, categoria, ano, capa, avaliacao, total, disponivel, tipo) VALUES
('Coroa dos Justos', 'Morgan Rice', 'Ficção', 2025, 'img1', 4, 2, 2, 'Livro'),
('Canção dos Valentes', 'Morgan Rice', 'Ficção', 2025, 'img2', 5, 1, 1, 'Livro'),
('A Arte da Guerra', 'Sun Tzu', 'Ação', 2009, 'img3', 3, 5, 5, 'Livro'),
('O Encantador de Corvos', 'Jacob Grey', 'Ficção', 2017, 'img4', 2, 2, 2, 'Livro')
ON CONFLICT DO NOTHING;

-- Verificar se foram inseridos
SELECT COUNT(*) as total_materiais FROM materials;

