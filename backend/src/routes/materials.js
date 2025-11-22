import express from "express";
import { verifyToken } from "./verify.js";

const router = express.Router();

// GET /api/materials -> Listar todos os materiais (com busca avançada)
// Parâmetros de busca via query string:
// q: busca por título, autor ou palavras-chave (case-insensitive)
// categoria: filtra por categoria exata
// autor: busca por autor específico
// ano: filtra por ano
// tipo: filtra por tipo (Livro, Periódico, Outro)
// disponivel: filtra apenas disponíveis (true/false)
router.get("/", async (req, res) => {
  const { q, categoria, autor, ano, tipo, disponivel } = req.query;
  let query = `
    SELECT m.*, 
           COALESCE(
             (SELECT COUNT(*)::INTEGER FROM emprestimos e 
              WHERE e.material_id = m.id AND e.data_devolucao IS NULL), 0
           ) as emprestados,
           (COALESCE(m.disponivel, m.total, 1) - COALESCE(
             (SELECT COUNT(*)::INTEGER FROM emprestimos e 
              WHERE e.material_id = m.id AND e.data_devolucao IS NULL), 0
           )) as disponiveis_count
    FROM materials m
    WHERE COALESCE(m.active, true) = TRUE
  `;
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (q) {
    // Busca por título, autor ou palavras-chave
    conditions.push(`(
      m.titulo ILIKE $${paramIndex} 
      OR m.autor ILIKE $${paramIndex}
      OR m.descricao ILIKE $${paramIndex}
      OR EXISTS (
        SELECT 1 FROM material_keywords mk 
        WHERE mk.material_id = m.id 
        AND mk.keyword ILIKE $${paramIndex}
      )
    )`);
    values.push(`%${q}%`);
    paramIndex++;
  }
  if (categoria) {
    conditions.push(`m.categoria = $${paramIndex}`);
    values.push(categoria);
    paramIndex++;
  }
  if (autor) {
    conditions.push(`m.autor ILIKE $${paramIndex}`);
    values.push(`%${autor}%`);
    paramIndex++;
  }
  if (ano) {
    conditions.push(`m.ano = $${paramIndex}`);
    values.push(parseInt(ano));
    paramIndex++;
  }
  if (tipo) {
    conditions.push(`m.tipo = $${paramIndex}`);
    values.push(tipo);
    paramIndex++;
  }
  if (disponivel === 'true') {
    conditions.push(`(
      COALESCE(m.disponivel, m.total, 1) - COALESCE(
        (SELECT COUNT(*) FROM emprestimos e 
         WHERE e.material_id = m.id AND e.data_devolucao IS NULL), 0
      )
    ) > 0`);
  }

  if (conditions.length > 0) {
    query += " AND " + conditions.join(" AND ");
  }
  query += " ORDER BY m.titulo ASC";

  try {
    const result = await req.db.query(query, values);
    res.json({ items: result.rows });
  } catch (error) {
    console.error("Erro ao buscar materiais:", error);
    console.error("Stack:", error.stack);
    console.error("Query:", query);
    console.error("Values:", values);
    res.status(500).json({ 
      message: "Erro interno no servidor",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/materials/:id -> Buscar material por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const materialResult = await req.db.query(
      `SELECT m.*, 
              COALESCE(
                (SELECT COUNT(*) FROM emprestimos e 
                 WHERE e.material_id = m.id AND e.data_devolucao IS NULL), 0
              ) as emprestados
       FROM materials m 
       WHERE m.id = $1 AND m.active = TRUE`,
      [id]
    );

    if (materialResult.rows.length === 0) {
      return res.status(404).json({ message: "Material não encontrado" });
    }

    // Buscar palavras-chave
    const keywordsResult = await req.db.query(
      "SELECT keyword FROM material_keywords WHERE material_id = $1",
      [id]
    );

    const material = {
      ...materialResult.rows[0],
      keywords: keywordsResult.rows.map((row) => row.keyword),
    };

    res.json({ item: material });
  } catch (error) {
    console.error("Erro ao buscar material:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// POST /api/materials -> Cadastrar novo material (protegido: bibliotecário/admin)
router.post("/", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const { titulo, autor, categoria, ano, capa, total, descricao, isbn, tipo, keywords } = req.body;

  if (!titulo) {
    return res.status(400).json({ message: "Título é obrigatório" });
  }

  const db = req.db;
  try {
    // Inserir material
    const result = await db.query(
      `INSERT INTO materials (titulo, autor, categoria, ano, capa, total, disponivel, descricao, isbn, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9)
       RETURNING *`,
      [titulo, autor || null, categoria || null, ano || null, capa || null, total || 1, descricao || null, isbn || null, tipo || 'Livro']
    );

    const material = result.rows[0];

    // Inserir palavras-chave se fornecidas
    if (keywords && Array.isArray(keywords)) {
      for (const keyword of keywords) {
        if (keyword && keyword.trim()) {
          try {
            await db.query(
              "INSERT INTO material_keywords (material_id, keyword) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [material.id, keyword.trim().toLowerCase()]
            );
          } catch (err) {
            console.error("Erro ao inserir palavra-chave:", err);
          }
        }
      }
    }

    res.status(201).json({ message: "Material cadastrado com sucesso!", item: material });
  } catch (error) {
    console.error("Erro ao cadastrar material:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// PUT /api/materials/:id -> Atualizar material (protegido: bibliotecário/admin)
router.put("/:id", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const { id } = req.params;
  const { titulo, autor, categoria, ano, capa, total, descricao, isbn, tipo, keywords } = req.body;

  const db = req.db;
  try {
    // Verificar se material existe
    const existing = await db.query("SELECT * FROM materials WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Material não encontrado" });
    }

    // Atualizar material
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (titulo !== undefined) {
      updateFields.push(`titulo = $${paramIndex++}`);
      values.push(titulo);
    }
    if (autor !== undefined) {
      updateFields.push(`autor = $${paramIndex++}`);
      values.push(autor);
    }
    if (categoria !== undefined) {
      updateFields.push(`categoria = $${paramIndex++}`);
      values.push(categoria);
    }
    if (ano !== undefined) {
      updateFields.push(`ano = $${paramIndex++}`);
      values.push(ano);
    }
    if (capa !== undefined) {
      updateFields.push(`capa = $${paramIndex++}`);
      values.push(capa);
    }
    if (total !== undefined) {
      updateFields.push(`total = $${paramIndex++}`);
      values.push(total);
    }
    if (descricao !== undefined) {
      updateFields.push(`descricao = $${paramIndex++}`);
      values.push(descricao);
    }
    if (isbn !== undefined) {
      updateFields.push(`isbn = $${paramIndex++}`);
      values.push(isbn);
    }
    if (tipo !== undefined) {
      updateFields.push(`tipo = $${paramIndex++}`);
      values.push(tipo);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    updateFields.push(`id = $${paramIndex}`);

    const result = await db.query(
      `UPDATE materials SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Atualizar palavras-chave se fornecidas
    if (keywords !== undefined) {
      // Remover palavras-chave antigas
      await db.query("DELETE FROM material_keywords WHERE material_id = $1", [id]);

      // Inserir novas palavras-chave
      if (Array.isArray(keywords)) {
        for (const keyword of keywords) {
          if (keyword && keyword.trim()) {
            try {
              await db.query(
                "INSERT INTO material_keywords (material_id, keyword) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [id, keyword.trim().toLowerCase()]
              );
            } catch (err) {
              console.error("Erro ao inserir palavra-chave:", err);
            }
          }
        }
      }
    }

    res.json({ message: "Material atualizado com sucesso!", item: result.rows[0] });
  } catch (error) {
    console.error("Erro ao atualizar material:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// DELETE /api/materials/:id -> Excluir material (soft delete) (protegido: bibliotecário/admin)
router.delete("/:id", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const { id } = req.params;
  const db = req.db;

  try {
    // Verificar se material existe
    const existing = await db.query("SELECT * FROM materials WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Material não encontrado" });
    }

    // Verificar se há empréstimos ativos
    const emprestimosAtivos = await db.query(
      "SELECT COUNT(*) as count FROM emprestimos WHERE material_id = $1 AND data_devolucao IS NULL",
      [id]
    );

    if (parseInt(emprestimosAtivos.rows[0].count) > 0) {
      return res.status(400).json({
        message: "Não é possível excluir material com empréstimos ativos",
      });
    }

    // Soft delete
    await db.query(
      "UPDATE materials SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    res.json({ message: "Material excluído com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir material:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

export default router;
