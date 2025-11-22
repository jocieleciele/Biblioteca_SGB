// backend/src/routes/multas.js
import express from "express";
import { verifyToken } from "./verify.js";

const router = express.Router();

// Função para calcular multa baseada em dias de atraso
function calcularMulta(diasAtraso) {
  const valorPorDia = 2.0; // R$ 2,00 por dia de atraso
  return diasAtraso * valorPorDia;
}

// Função para calcular dias de atraso
function calcularDiasAtraso(dataPrevista) {
  if (!dataPrevista) return 0;
  const prevista = new Date(dataPrevista);
  const hoje = new Date();
  const diffTime = hoje - prevista;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// GET /api/multas -> Listar todas as multas (protegido: bibliotecário/admin)
router.get("/", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const db = req.db;
  try {
    const result = await db.query(
      `SELECT m.*, u.name as usuario_name, u.email as usuario_email,
              e.material_id, mat.titulo as material_titulo
       FROM multas m
       JOIN users u ON u.id = m.usuario_id
       LEFT JOIN emprestimos e ON e.id = m.emprestimo_id
       LEFT JOIN materials mat ON mat.id = e.material_id
       ORDER BY m.data_criacao DESC`
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar multas" });
  }
});

// GET /api/multas/user/:id -> Listar multas de um usuário
router.get("/user/:id", verifyToken, async (req, res) => {
  const db = req.db;
  const uid = parseInt(req.params.id, 10);

  // Apenas o próprio usuário ou bibliotecário/admin podem ver
  if (req.user.id !== uid && req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  try {
    const result = await db.query(
      `SELECT m.*, e.material_id, mat.titulo as material_titulo, mat.autor as material_autor
       FROM multas m
       LEFT JOIN emprestimos e ON e.id = m.emprestimo_id
       LEFT JOIN materials mat ON mat.id = e.material_id
       WHERE m.usuario_id = $1
       ORDER BY m.data_criacao DESC`,
      [uid]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar multas" });
  }
});

// POST /api/multas/calcular -> Calcular e criar multas para empréstimos atrasados
router.post("/calcular", verifyToken, async (req, res) => {
  if (req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  const db = req.db;
  try {
    // Buscar empréstimos atrasados sem multa
    const emprestimosAtrasados = await db.query(
      `SELECT e.*, u.id as usuario_id
       FROM emprestimos e
       JOIN users u ON u.id = e.usuario_id
       WHERE e.data_devolucao IS NULL
       AND e.data_prevista < CURRENT_DATE
       AND NOT EXISTS (
         SELECT 1 FROM multas m 
         WHERE m.emprestimo_id = e.id AND m.status = 'Pendente'
       )`
    );

    const multasCriadas = [];

    for (const emprestimo of emprestimosAtrasados.rows) {
      const diasAtraso = calcularDiasAtraso(emprestimo.data_prevista);
      const valor = calcularMulta(diasAtraso);

      if (diasAtraso > 0) {
        const result = await db.query(
          `INSERT INTO multas (usuario_id, emprestimo_id, valor, dias_atraso, descricao)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            emprestimo.usuario_id,
            emprestimo.id,
            valor,
            diasAtraso,
            `Multa por atraso de ${diasAtraso} dia(s) na devolução do empréstimo #${emprestimo.id}`,
          ]
        );

        // Atualizar status do empréstimo
        await db.query(
          "UPDATE emprestimos SET status = 'Atrasado' WHERE id = $1",
          [emprestimo.id]
        );

        multasCriadas.push(result.rows[0]);
      }
    }

    res.json({
      message: `${multasCriadas.length} multa(s) criada(s)`,
      items: multasCriadas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao calcular multas" });
  }
});

// GET /api/multas/pendentes/user/:id -> Listar multas pendentes de um usuário
router.get("/pendentes/user/:id", verifyToken, async (req, res) => {
  const db = req.db;
  const uid = parseInt(req.params.id, 10);

  if (req.user.id !== uid && req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  try {
    const result = await db.query(
      `SELECT m.*, e.material_id, mat.titulo as material_titulo
       FROM multas m
       LEFT JOIN emprestimos e ON e.id = m.emprestimo_id
       LEFT JOIN materials mat ON mat.id = e.material_id
       WHERE m.usuario_id = $1 AND m.status = 'Pendente'
       ORDER BY m.data_criacao DESC`,
      [uid]
    );

    const totalPendente = result.rows.reduce(
      (sum, multa) => sum + parseFloat(multa.valor),
      0
    );

    res.json({
      items: result.rows,
      total_pendente: totalPendente,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar multas pendentes" });
  }
});

export default router;

