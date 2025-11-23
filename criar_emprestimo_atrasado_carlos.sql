-- SCRIPT PARA CRIAR EMPRÉSTIMO ATRASADO PARA CARLOS@EXAMPLE.COM
-- Sistema de Biblioteca - SGB
-- Execute este script no PostgreSQL para testar o sistema de multas

-- 1. Verificar se o usuário carlos@example.com existe, se não, criar
DO $$
DECLARE
    usuario_id_carlos INTEGER;
    material_id_exemplo INTEGER;
    emprestimo_id INTEGER;
    dias_atraso INTEGER := 5; -- 5 dias de atraso
    data_prevista DATE;
    valor_multa DECIMAL(10, 2);
BEGIN
    -- Buscar ou criar usuário Carlos
    SELECT id INTO usuario_id_carlos 
    FROM users 
    WHERE email = 'carlos@example.com';
    
    IF usuario_id_carlos IS NULL THEN
        -- Criar usuário Carlos se não existir
        INSERT INTO users (name, email, password, role)
        VALUES (
            'Carlos Silva',
            'carlos@example.com',
            '$2a$10$MGQ4TgnR.9AfMCvM8wdeze21FlwFoWzcRjm3.mTtz.nnR8XNBIRU6', -- senha: 123456
            'Leitor'
        )
        RETURNING id INTO usuario_id_carlos;
        
        RAISE NOTICE 'Usuário Carlos criado com ID: %', usuario_id_carlos;
    ELSE
        RAISE NOTICE 'Usuário Carlos encontrado com ID: %', usuario_id_carlos;
    END IF;
    
    -- Buscar um material disponível (ou o primeiro material)
    SELECT id INTO material_id_exemplo
    FROM materials
    WHERE active = TRUE
    ORDER BY id
    LIMIT 1;
    
    IF material_id_exemplo IS NULL THEN
        RAISE EXCEPTION 'Nenhum material encontrado. Crie pelo menos um material primeiro.';
    END IF;
    
    RAISE NOTICE 'Material selecionado com ID: %', material_id_exemplo;
    
    -- Primeiro, atualizar empréstimos existentes do Carlos para ficarem atrasados
    UPDATE emprestimos
    SET data_prevista = CURRENT_DATE - dias_atraso,
        status = 'Atrasado'
    WHERE usuario_id = usuario_id_carlos
    AND data_devolucao IS NULL
    AND data_prevista >= CURRENT_DATE; -- Apenas os que ainda não venceram
    
    RAISE NOTICE 'Empréstimos existentes atualizados para atrasado.';
    
    -- Calcular data prevista (5 dias atrás)
    data_prevista := CURRENT_DATE - dias_atraso;
    
    -- Verificar se já existe empréstimo ativo deste material para este usuário
    SELECT id INTO emprestimo_id
    FROM emprestimos
    WHERE usuario_id = usuario_id_carlos
    AND material_id = material_id_exemplo
    AND data_devolucao IS NULL
    LIMIT 1;
    
    IF emprestimo_id IS NULL THEN
        -- Criar novo empréstimo atrasado apenas se não existir nenhum deste material
        INSERT INTO emprestimos (usuario_id, material_id, data_emprestimo, data_prevista, status)
        VALUES (
            usuario_id_carlos,
            material_id_exemplo,
            data_prevista - 14, -- Emprestado há 19 dias (14 dias + 5 de atraso)
            data_prevista,
            'Atrasado'
        )
        RETURNING id INTO emprestimo_id;
        
        RAISE NOTICE 'Novo empréstimo atrasado criado. ID: %', emprestimo_id;
    END IF;
    
    -- Criar multas para todos os empréstimos atrasados do Carlos que não têm multa
    FOR emprestimo_id IN 
        SELECT e.id 
        FROM emprestimos e
        WHERE e.usuario_id = usuario_id_carlos
        AND e.data_devolucao IS NULL
        AND e.data_prevista < CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM multas m
            WHERE m.emprestimo_id = e.id 
            AND m.status = 'Pendente'
        )
    LOOP
        -- Calcular dias de atraso para este empréstimo específico
        SELECT EXTRACT(DAY FROM (CURRENT_DATE - data_prevista))::INTEGER 
        INTO dias_atraso
        FROM emprestimos
        WHERE id = emprestimo_id;
        
        -- Calcular valor da multa (R$ 2,00 por dia)
        valor_multa := dias_atraso * 2.0;
        
        -- Criar multa
        INSERT INTO multas (usuario_id, emprestimo_id, valor, dias_atraso, descricao, status)
        VALUES (
            usuario_id_carlos,
            emprestimo_id,
            valor_multa,
            dias_atraso,
            'Multa por atraso de ' || dias_atraso || ' dia(s) na devolução do empréstimo #' || emprestimo_id,
            'Pendente'
        );
        
        RAISE NOTICE 'Multa criada para empréstimo #%: R$ % para % dias de atraso', emprestimo_id, valor_multa, dias_atraso;
    END LOOP;
    
    RAISE NOTICE 'Processo concluído!';
    RAISE NOTICE 'Usuário: carlos@example.com (ID: %)', usuario_id_carlos;
    RAISE NOTICE 'Verifique os empréstimos e multas criados na consulta abaixo.';
END $$;

-- Verificar os dados criados
SELECT 
    u.name as usuario,
    u.email,
    m.titulo as material,
    e.data_emprestimo,
    e.data_prevista,
    e.status as status_emprestimo,
    CURRENT_DATE - e.data_prevista as dias_atraso,
    mu.valor as multa_valor,
    mu.dias_atraso as multa_dias,
    mu.status as multa_status
FROM emprestimos e
JOIN users u ON u.id = e.usuario_id
JOIN materials m ON m.id = e.material_id
LEFT JOIN multas mu ON mu.emprestimo_id = e.id AND mu.status = 'Pendente'
WHERE u.email = 'carlos@example.com'
AND e.data_devolucao IS NULL
ORDER BY e.id DESC
LIMIT 5;

