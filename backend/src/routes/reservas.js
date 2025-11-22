// backend/src/routes/reservas.js
import express from "express";
import { verifyToken } from "./verify.js";
const router = express.Router();

// POST /api/reservas -> Criar uma nova reserva
router.post("/", verifyToken, async (req, res) => {
  const { material_id } = req.body;
  const usuario_id = req.user.id;
  const db = req.db;

  if (!material_id) {
    return res.status(400).json({ message: "ID do material é obrigatório" });
  }

  try {
    // 1. Verificar se o material existe
    const materialResult = await db.query(
      `SELECT m.*, 
              COALESCE(
                (SELECT COUNT(*) FROM emprestimos e 
                 WHERE e.material_id = m.id AND e.data_devolucao IS NULL), 0
              ) as emprestados
       FROM materials m 
       WHERE m.id = $1 AND m.active = TRUE`,
      [material_id]
    );

    if (materialResult.rows.length === 0) {
      return res.status(404).json({ message: "Material não encontrado ou inativo" });
    }

    const material = materialResult.rows[0];
    const totalDisponivel = material.disponivel || material.total || 1;
    const emprestados = parseInt(material.emprestados) || 0;
    const disponiveis = totalDisponivel - emprestados;

    // 2. Verificar se o material está realmente indisponível
    if (disponiveis > 0) {
      return res
        .status(400)
        .json({
          message:
            "Este item está disponível para empréstimo e não pode ser reservado.",
        });
    }

    // 2. Verificar se o usuário já não tem uma reserva ativa para este item
    const reservaExistente = await db.query(
      `SELECT id FROM reservas WHERE material_id = $1 AND usuario_id = $2 AND status = 'Ativa'`,
      [material_id, usuario_id]
    );

    if (reservaExistente.rowCount > 0) {
      return res
        .status(400)
        .json({ message: "Você já possui uma reserva para este item." });
    }

    // 3. Criar a reserva
    const r = await db.query(
      `INSERT INTO reservas (usuario_id, material_id, status) VALUES ($1, $2, 'Ativa') RETURNING *`,
      [usuario_id, material_id]
    );

    res
      .status(201)
      .json({ message: "Reserva realizada com sucesso!", item: r.rows[0] });
  } catch (err) {
    console.error("Erro ao criar reserva:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/reservas -> Listar todas as reservas (protegido: bibliotecário/admin)
router.get("/", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const db = req.db;
  try {
    const r = await db.query(
      `SELECT r.*, 
              m.titulo AS material_titulo, 
              m.autor AS material_autor, 
              m.capa AS material_capa,
              u.name AS usuario_name,
              u.email AS usuario_email
       FROM reservas r
       JOIN materials m ON m.id = r.material_id
       JOIN users u ON u.id = r.usuario_id
       WHERE r.status IN ('Ativa', 'Aguardando Retirada')
       ORDER BY r.data_reserva ASC`
    );
    res.json({ items: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no banco de dados ao buscar reservas." });
  }
});

// GET /api/reservas/user/:id -> Listar reservas de um usuário
router.get("/user/:id", verifyToken, async (req, res) => {
  const db = req.db;
  const uid = parseInt(req.params.id, 10);

  // Apenas o próprio usuário ou administradores podem ver as reservas
  if (req.user.id !== uid && req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  try {
    const r = await db.query(
      `SELECT r.*, m.titulo AS material_titulo, m.autor AS material_autor, m.capa AS material_capa
       FROM reservas r
       JOIN materials m ON m.id = r.material_id
       WHERE r.usuario_id = $1
       ORDER BY r.data_reserva DESC`,
      [uid]
    );
    res.json({ items: r.rows });
  } catch (err) {
    console.error("Erro ao buscar reservas do usuário:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;
