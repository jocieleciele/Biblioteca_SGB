// backend/src/routes/pagamentos.js
import express from "express";
import { verifyToken } from "./verify.js";

const router = express.Router();

// POST /api/pagamentos -> Criar pagamento de multa
router.post("/", verifyToken, async (req, res) => {
  const { multa_id, metodo_pagamento, dados_pagamento } = req.body;
  const db = req.db;

  if (!multa_id) {
    return res.status(400).json({ message: "ID da multa é obrigatório" });
  }

  try {
    // Verificar se a multa existe e pertence ao usuário
    const multaResult = await db.query(
      "SELECT * FROM multas WHERE id = $1",
      [multa_id]
    );

    if (multaResult.rows.length === 0) {
      return res.status(404).json({ message: "Multa não encontrada" });
    }

    const multa = multaResult.rows[0];

    // Verificar autorização: usuário só pode pagar suas próprias multas
    if (req.user.id !== multa.usuario_id && req.user.role === "Leitor") {
      return res.status(403).json({ error: "Não autorizado" });
    }

    // Verificar se a multa já foi paga
    if (multa.status === "Paga") {
      return res.status(400).json({ message: "Esta multa já foi paga" });
    }

    // Simular processamento de pagamento
    // Em produção, aqui você integraria com um gateway de pagamento (Stripe, PagSeguro, etc.)
    const transacao_id = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const status_pagamento = "Aprovado";

    // Criar registro de pagamento
    const pagamentoResult = await db.query(
      `INSERT INTO pagamentos (multa_id, usuario_id, valor, metodo_pagamento, transacao_id, status, dados_pagamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        multa_id,
        multa.usuario_id,
        multa.valor,
        metodo_pagamento || "Online",
        transacao_id,
        status_pagamento,
        dados_pagamento ? JSON.stringify(dados_pagamento) : null,
      ]
    );

    // Se o pagamento foi aprovado, atualizar a multa
    if (status_pagamento === "Aprovado") {
      await db.query(
        `UPDATE multas 
         SET status = 'Paga', data_pagamento = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [multa_id]
      );
    }

    res.status(201).json({
      message: "Pagamento processado com sucesso!",
      item: pagamentoResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar pagamento" });
  }
});

// GET /api/pagamentos/user/:id -> Listar pagamentos de um usuário
router.get("/user/:id", verifyToken, async (req, res) => {
  const db = req.db;
  const uid = parseInt(req.params.id, 10);

  if (req.user.id !== uid && req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  try {
    const result = await db.query(
      `SELECT p.*, m.descricao as multa_descricao, m.dias_atraso,
              e.material_id, mat.titulo as material_titulo
       FROM pagamentos p
       JOIN multas m ON m.id = p.multa_id
       LEFT JOIN emprestimos e ON e.id = m.emprestimo_id
       LEFT JOIN materials mat ON mat.id = e.material_id
       WHERE p.usuario_id = $1
       ORDER BY p.data_pagamento DESC`,
      [uid]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar pagamentos" });
  }
});

// GET /api/pagamentos -> Listar todos os pagamentos (protegido: bibliotecário/admin)
router.get("/", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const db = req.db;
  try {
    const result = await db.query(
      `SELECT p.*, u.name as usuario_name, u.email as usuario_email,
              m.descricao as multa_descricao, m.dias_atraso,
              e.material_id, mat.titulo as material_titulo
       FROM pagamentos p
       JOIN users u ON u.id = p.usuario_id
       JOIN multas m ON m.id = p.multa_id
       LEFT JOIN emprestimos e ON e.id = m.emprestimo_id
       LEFT JOIN materials mat ON mat.id = e.material_id
       ORDER BY p.data_pagamento DESC`
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar pagamentos" });
  }
});

export default router;

