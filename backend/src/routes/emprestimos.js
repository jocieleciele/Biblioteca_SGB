// backend/src/routes/emprestimos.js
import express from "express";
import { sendReservationAvailableEmail } from "../services/notificationService.js";
import { verifyToken } from "./verify.js"; // middleware JWT já criado
const router = express.Router();

// util: calcula se atrasado
function isAtrasado(row) {
  if (row.data_devolucao) return false;
  if (!row.data_prevista) return false;
  const prevista = new Date(row.data_prevista);
  const hoje = new Date();
  return prevista < hoje;
}

// GET /api/emprestimos/user/:id  -> empréstimos de um usuário
router.get("/user/:id", verifyToken, async (req, res) => {
  const db = req.db;
  const uid = parseInt(req.params.id, 10);
  // autorização: usuário pode ver seus próprios ou bibliotecário/admin vêem qualquer
  if (req.user.id !== uid && req.user.role === "Leitor") {
    return res.status(403).json({ error: "não autorizado" });
  }
  try {
    const r = await db.query(
      `SELECT e.*, m.titulo AS material_titulo, m.autor AS material_autor, m.capa AS material_capa
       FROM emprestimos e
       JOIN materials m ON m.id = e.material_id
       WHERE e.usuario_id = $1
       ORDER BY e.data_emprestimo DESC`,
      [uid]
    );
    const items = r.rows.map((row) => ({
      ...row,
      atrasado: isAtrasado(row),
    }));
    res.json({ items });
  } catch (err) {
    console.error("Erro ao buscar empréstimos do usuário:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/emprestimos/atrasados  -> todos os atrasados (bibliotecário/admin)
router.get("/atrasados", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor")
    return res.status(403).json({ error: "não autorizado" });
  const db = req.db;
  try {
    const r = await db.query(
      `SELECT e.*, u.name as usuario_name, m.titulo as material_titulo, m.autor as material_autor
       FROM emprestimos e
       JOIN users u ON u.id = e.usuario_id
       JOIN materials m ON m.id = e.material_id
       WHERE e.data_devolucao IS NULL AND e.data_prevista < CURRENT_DATE
       ORDER BY e.data_prevista ASC`
    );
    res.json({ items: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "db error" });
  }
});

// GET /api/emprestimos  -> list all (protected: bibliotecario/admin)
router.get("/", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor")
    return res.status(403).json({ error: "não autorizado" });
  const db = req.db;
  try {
    const r = await db.query(
      `SELECT e.*, u.name as usuario_name, m.titulo as material_titulo, m.autor as material_autor
       FROM emprestimos e
       JOIN users u ON u.id = e.usuario_id
       JOIN materials m ON m.id = e.material_id
       ORDER BY e.data_emprestimo DESC`
    );
    res.json({ items: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "db error" });
  }
});

// POST /api/emprestimos  -> criar empréstimo (protected)
router.post("/", verifyToken, async (req, res) => {
  const { material_id } = req.body;
  const { id: requisitante_id, role: requisitante_role } = req.user;

  // Um leitor só pode solicitar para si mesmo.
  const usuario_id = requisitante_id;

  // Define a data de devolução para 14 dias a partir de hoje
  const data_prevista = new Date();
  data_prevista.setDate(data_prevista.getDate() + 14);

  if (!material_id) {
    return res.status(400).json({ message: "ID do material é obrigatório" });
  }
  const db = req.db;
  try {
    // Verificar se o material existe e está disponível
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

    if (disponiveis <= 0) {
      return res.status(400).json({ 
        message: "Material não disponível para empréstimo. Todos os exemplares estão emprestados." 
      });
    }

    // Verificar se o usuário já tem um empréstimo ativo deste material
    const emprestimoAtivo = await db.query(
      `SELECT id FROM emprestimos 
       WHERE usuario_id = $1 AND material_id = $2 AND data_devolucao IS NULL`,
      [usuario_id, material_id]
    );

    if (emprestimoAtivo.rowCount > 0) {
      return res.status(400).json({ 
        message: "Você já possui um empréstimo ativo deste material" 
      });
    }

    // Criar o empréstimo
    const r = await db.query(
      `INSERT INTO emprestimos (usuario_id, material_id, data_prevista) VALUES ($1,$2,$3) RETURNING *`,
      [usuario_id, material_id, data_prevista]
    );
    res.status(201).json({ item: r.rows[0] });
  } catch (err) {
    console.error("Erro ao criar empréstimo:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PUT /api/emprestimos/:id/devolver  -> marcar devolução (protected)
router.put("/:id/devolver", verifyToken, async (req, res) => {
  // bibliotecário/admin ou dono pode marcar devolução
  const db = req.db;
  const id = parseInt(req.params.id, 10);
  try {
    // read first
    const r0 = await db.query("SELECT * FROM emprestimos WHERE id=$1", [id]);
    if (r0.rowCount === 0)
      return res.status(404).json({ error: "não encontrado" });
    const emp = r0.rows[0];
    if (req.user.role === "Leitor" && req.user.id !== emp.usuario_id) {
      return res.status(403).json({ error: "não autorizado" });
    }
    const r = await db.query(
      `UPDATE emprestimos SET data_devolucao = CURRENT_DATE, status='Concluído' WHERE id=$1 RETURNING *`,
      [id]
    );
    // opcional: incrementar avaliacao em materials
    await db.query(
      "UPDATE materials SET avaliacao = GREATEST(0, avaliacao + 1) WHERE id=$1",
      [emp.material_id]
    );

    // --- LÓGICA DE NOTIFICAÇÃO DE RESERVA ---
    // 1. Buscar informações do material
    const materialInfo = await db.query(
      "SELECT titulo FROM materials WHERE id = $1",
      [emp.material_id]
    );
    const materialTitulo = materialInfo.rows[0]?.titulo || "Material";

    // 2. Verificar se há reservas ativas para este material
    const reservas = await db.query(
      `SELECT r.id as reserva_id, u.email, u.name
       FROM reservas r
       JOIN users u ON u.id = r.usuario_id
       WHERE r.material_id = $1 AND r.status = 'Ativa'
       ORDER BY r.data_reserva ASC
       LIMIT 1`,
      [emp.material_id]
    );

    if (reservas.rowCount > 0) {
      const proximoDaFila = reservas.rows[0];
      // 3. Enviar e-mail de notificação
      try {
        await sendReservationAvailableEmail(
          proximoDaFila.email,
          proximoDaFila.name,
          materialTitulo
        );
      } catch (emailError) {
        console.error("Erro ao enviar e-mail de notificação:", emailError);
      }

      // 4. Atualizar o status da reserva para 'Aguardando Retirada'
      const expiraEm = new Date();
      expiraEm.setHours(expiraEm.getHours() + 48); // 48 horas para retirar

      await db.query(
        `UPDATE reservas 
         SET status = 'Aguardando Retirada', 
             notificado_em = NOW(),
             expira_em = $1
         WHERE id = $2`,
        [expiraEm, proximoDaFila.reserva_id]
      );
    }

    res.json({
      message: "Devolução registrada e notificações (se houver) enviadas.",
      item: r.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "db error" });
  }
});

// PUT /api/emprestimos/:id/renovar -> renovar um empréstimo (protected)
router.put("/:id/renovar", verifyToken, async (req, res) => {
  const db = req.db;
  const id = parseInt(req.params.id, 10);

  try {
    // 1. Busca o empréstimo atual
    const r0 = await db.query("SELECT * FROM emprestimos WHERE id=$1", [id]);
    if (r0.rowCount === 0) {
      return res.status(404).json({ error: "Empréstimo não encontrado" });
    }
    const emprestimo = r0.rows[0];

    // 2. Regras de Negócio para Renovação
    // Apenas o próprio usuário pode renovar
    if (req.user.id !== emprestimo.usuario_id) {
      return res.status(403).json({ error: "Não autorizado" });
    }
    // Não pode renovar se já foi devolvido
    if (emprestimo.data_devolucao) {
      return res.status(400).json({ error: "Este item já foi devolvido." });
    }
    // Não pode renovar se estiver atrasado
    if (isAtrasado(emprestimo)) {
      return res
        .status(400)
        .json({ error: "Não é possível renovar um empréstimo atrasado." });
    }
    // Regra: Permitir apenas uma renovação (assumindo uma coluna 'renovacoes')
    if (emprestimo.renovacoes && emprestimo.renovacoes > 0) {
      return res
        .status(400)
        .json({ error: "Este empréstimo já foi renovado." });
    }

    // 3. Calcula a nova data e atualiza o banco
    const novaDataPrevista = new Date(emprestimo.data_prevista);
    novaDataPrevista.setDate(novaDataPrevista.getDate() + 14);

    const r = await db.query(
      `UPDATE emprestimos SET data_prevista = $1, renovacoes = COALESCE(renovacoes, 0) + 1 WHERE id=$2 RETURNING *`,
      [novaDataPrevista, id]
    );
    res.json({ message: "Empréstimo renovado com sucesso!", item: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "db error" });
  }
});

export default router;
