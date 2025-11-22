// backend/src/routes/recomendacoes.js
import express from "express";
import { verifyToken } from "./verify.js";

const router = express.Router();

// GET /api/recomendacoes/user/:id -> Obter recomendações para um usuário
router.get("/user/:id", verifyToken, async (req, res) => {
  const db = req.db;
  const uid = parseInt(req.params.id, 10);

  if (req.user.id !== uid && req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  try {
    // 1. Buscar histórico de empréstimos do usuário
    const historicoResult = await db.query(
      `SELECT DISTINCT m.categoria, m.autor, m.id as material_id
       FROM emprestimos e
       JOIN materials m ON m.id = e.material_id
       WHERE e.usuario_id = $1 AND e.data_devolucao IS NOT NULL
       ORDER BY e.data_emprestimo DESC
       LIMIT 20`,
      [uid]
    );

    if (historicoResult.rows.length === 0) {
      // Se não tem histórico, retornar materiais mais populares
      const popularesResult = await db.query(
        `SELECT m.*, 
                COALESCE(
                  (SELECT COUNT(*) FROM emprestimos e 
                   WHERE e.material_id = m.id AND e.data_devolucao IS NOT NULL), 0
                ) as total_emprestimos
         FROM materials m
         WHERE m.active = TRUE
         ORDER BY total_emprestimos DESC, m.avaliacao DESC
         LIMIT 10`
      );

      return res.json({
        items: popularesResult.rows.map((m, idx) => ({
          ...m,
          score: 0.5 - idx * 0.05, // Score decrescente
          motivo: "Materiais mais populares",
        })),
      });
    }

    // 2. Extrair categorias e autores mais frequentes
    const categorias = {};
    const autores = {};
    const materiaisJaEmprestados = new Set();

    historicoResult.rows.forEach((row) => {
      materiaisJaEmprestados.add(row.material_id);
      if (row.categoria) {
        categorias[row.categoria] = (categorias[row.categoria] || 0) + 1;
      }
      if (row.autor) {
        autores[row.autor] = (autores[row.autor] || 0) + 1;
      }
    });

    // 3. Buscar materiais similares (mesma categoria ou mesmo autor)
    const categoriasFavoritas = Object.keys(categorias)
      .sort((a, b) => categorias[b] - categorias[a])
      .slice(0, 3);
    const autoresFavoritos = Object.keys(autores)
      .sort((a, b) => autores[b] - autores[a])
      .slice(0, 3);

    const materiaisIds = Array.from(materiaisJaEmprestados);
    
    // Se não há categorias ou autores favoritos, retornar materiais populares
    if (categoriasFavoritas.length === 0 && autoresFavoritos.length === 0) {
      const popularesResult = await db.query(
        `SELECT m.*, 
                0.5 as score_base
         FROM materials m
         WHERE m.active = TRUE
         AND m.id != ALL($1::int[])
         ORDER BY m.avaliacao DESC, m.titulo ASC
         LIMIT 10`,
        [materiaisIds.length > 0 ? materiaisIds : [0]]
      );

      return res.json({
        items: popularesResult.rows.map((m) => ({
          ...m,
          score: 0.5,
          motivo: "Materiais populares",
        })),
      });
    }

    let recomendacoesQuery = `
      SELECT m.*,
             CASE 
               WHEN m.autor = ANY($1::text[]) AND m.categoria = ANY($2::text[]) THEN 0.9
               WHEN m.autor = ANY($1::text[]) THEN 0.7
               WHEN m.categoria = ANY($2::text[]) THEN 0.6
               ELSE 0.4
             END as score_base
      FROM materials m
      WHERE m.active = TRUE
      AND m.id != ALL($3::int[])
      AND (
        m.autor = ANY($1::text[]) OR 
        m.categoria = ANY($2::text[])
      )
      ORDER BY score_base DESC, m.avaliacao DESC
      LIMIT 10
    `;

    const result = await db.query(recomendacoesQuery, [
      autoresFavoritos.length > 0 ? autoresFavoritos : [''],
      categoriasFavoritas.length > 0 ? categoriasFavoritas : [''],
      materiaisIds.length > 0 ? materiaisIds : [0],
    ]);

    // 4. Gerar motivos para cada recomendação
    const recomendacoes = result.rows.map((material) => {
      let motivo = "Baseado em seus empréstimos anteriores";
      if (autoresFavoritos.includes(material.autor)) {
        motivo = `Você já emprestou outros livros de ${material.autor}`;
      } else if (categoriasFavoritas.includes(material.categoria)) {
        motivo = `Você tem interesse em ${material.categoria}`;
      }

      return {
        ...material,
        motivo,
      };
    });

    // 5. Salvar recomendações no banco (opcional, para histórico)
    for (const rec of recomendacoes) {
      try {
        await db.query(
          `INSERT INTO recomendacoes (usuario_id, material_id, score, motivo)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [uid, rec.id, rec.score_base || 0.5, rec.motivo]
        );
      } catch (err) {
        // Ignorar erros de inserção (pode ser constraint)
        console.error("Erro ao salvar recomendação:", err);
      }
    }

    res.json({ items: recomendacoes });
  } catch (err) {
    console.error("Erro ao gerar recomendações:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      error: "Erro ao gerar recomendações",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/recomendacoes/historico/user/:id -> Histórico de recomendações
router.get("/historico/user/:id", verifyToken, async (req, res) => {
  const db = req.db;
  const uid = parseInt(req.params.id, 10);

  if (req.user.id !== uid && req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  try {
    const result = await db.query(
      `SELECT r.*, m.titulo, m.autor, m.capa, m.categoria
       FROM recomendacoes r
       JOIN materials m ON m.id = r.material_id
       WHERE r.usuario_id = $1
       ORDER BY r.data_recomendacao DESC
       LIMIT 50`,
      [uid]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar histórico de recomendações" });
  }
});

export default router;

