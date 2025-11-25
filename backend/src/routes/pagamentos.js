// backend/src/routes/pagamentos.js
import express from "express";
import { verifyToken } from "./verify.js";
import pagseguroService from "../services/pagseguroService.js";

const router = express.Router();

// POST /api/pagamentos -> Criar pagamento de multa
router.post("/", verifyToken, async (req, res) => {
  const { multa_id, metodo_pagamento, dados_pagamento } = req.body;
  const db = req.db;

  if (!multa_id) {
    return res.status(400).json({ message: "ID da multa é obrigatório" });
  }

  if (!metodo_pagamento) {
    return res.status(400).json({ message: "Método de pagamento é obrigatório (PIX, CREDIT_CARD, BOLETO)" });
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

    // Buscar dados do usuário
    const userResult = await db.query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [multa.usuario_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const usuario = userResult.rows[0];

    // Preparar dados do cliente
    const customer = {
      name: usuario.name,
      email: usuario.email,
      cpf: dados_pagamento?.cpf || null,
      address: dados_pagamento?.address || null
    };

    // Processar pagamento via PagSeguro
    let pagamentoResult;
    let transacao_id;
    let status_pagamento;
    let paymentData = {};

    try {
      switch (metodo_pagamento.toUpperCase()) {
        case "PIX":
          pagamentoResult = await pagseguroService.createPixPayment({
            amount: parseFloat(multa.valor),
            reference: multa_id.toString(),
            customer
          });
          transacao_id = pagamentoResult.transactionId;
          status_pagamento = pagseguroService.mapPagSeguroStatus(pagamentoResult.status);
          paymentData = {
            qrCode: pagamentoResult.qrCode,
            qrCodeBase64: pagamentoResult.qrCodeBase64,
            expirationDate: pagamentoResult.expirationDate
          };
          break;

        case "CREDIT_CARD":
        case "CARTAO":
          if (!dados_pagamento?.card) {
            return res.status(400).json({ message: "Dados do cartão são obrigatórios" });
          }
          pagamentoResult = await pagseguroService.createCreditCardPayment({
            amount: parseFloat(multa.valor),
            reference: multa_id.toString(),
            customer,
            card: dados_pagamento.card
          });
          transacao_id = pagamentoResult.transactionId;
          status_pagamento = pagseguroService.mapPagSeguroStatus(pagamentoResult.status);
          paymentData = {
            authorizationCode: pagamentoResult.authorizationCode
          };
          break;

        case "BOLETO":
          pagamentoResult = await pagseguroService.createBoletoPayment({
            amount: parseFloat(multa.valor),
            reference: multa_id.toString(),
            customer
          });
          transacao_id = pagamentoResult.transactionId;
          status_pagamento = pagseguroService.mapPagSeguroStatus(pagamentoResult.status);
          paymentData = {
            barcode: pagamentoResult.barcode,
            pdf: pagamentoResult.pdf
          };
          break;

        default:
          return res.status(400).json({ message: "Método de pagamento inválido. Use: PIX, CREDIT_CARD ou BOLETO" });
      }
    } catch (paymentError) {
      console.error("Erro ao processar pagamento no PagSeguro:", paymentError);
      return res.status(500).json({ 
        error: "Erro ao processar pagamento no gateway",
        details: paymentError.message 
      });
    }

    // Criar registro de pagamento no banco
    const pagamentoDbResult = await db.query(
      `INSERT INTO pagamentos (multa_id, usuario_id, valor, metodo_pagamento, transacao_id, status, dados_pagamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        multa_id,
        multa.usuario_id,
        multa.valor,
        metodo_pagamento,
        transacao_id,
        status_pagamento,
        JSON.stringify({ ...paymentData, gateway: "PagSeguro" }),
      ]
    );

    // Se o pagamento foi aprovado imediatamente (ex: cartão), atualizar a multa
    if (status_pagamento === "Aprovado") {
      await db.query(
        `UPDATE multas 
         SET status = 'Paga', data_pagamento = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [multa_id]
      );
    }

    res.status(201).json({
      message: metodo_pagamento === "PIX" || metodo_pagamento === "BOLETO" 
        ? "Pagamento criado com sucesso! Aguarde a confirmação." 
        : "Pagamento processado com sucesso!",
      item: pagamentoDbResult.rows[0],
      paymentData: paymentData // Retorna dados adicionais (QR Code, boleto, etc.)
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

// GET /api/pagamentos/status/:transactionId -> Consultar status de uma transação
router.get("/status/:transactionId", verifyToken, async (req, res) => {
  const { transactionId } = req.params;
  const db = req.db;

  try {
    // Buscar pagamento no banco
    const pagamentoResult = await db.query(
      "SELECT * FROM pagamentos WHERE transacao_id = $1",
      [transactionId]
    );

    if (pagamentoResult.rows.length === 0) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    const pagamento = pagamentoResult.rows[0];

    // Verificar autorização
    if (req.user.id !== pagamento.usuario_id && req.user.role === "Leitor") {
      return res.status(403).json({ error: "Não autorizado" });
    }

    // Consultar status atualizado no PagSeguro
    try {
      const statusResult = await pagseguroService.getTransactionStatus(transactionId);
      
      // Atualizar status no banco se mudou
      if (statusResult.status !== pagamento.status) {
        const novoStatus = pagseguroService.mapPagSeguroStatus(statusResult.status);
        
        await db.query(
          "UPDATE pagamentos SET status = $1 WHERE transacao_id = $2",
          [novoStatus, transactionId]
        );

        // Se foi aprovado, atualizar multa
        if (novoStatus === "Aprovado" && pagamento.status !== "Aprovado") {
          await db.query(
            `UPDATE multas 
             SET status = 'Paga', data_pagamento = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [pagamento.multa_id]
          );
        }
      }

      res.json({
        transactionId: statusResult.id,
        status: pagseguroService.mapPagSeguroStatus(statusResult.status),
        pagamento: pagamentoResult.rows[0]
      });
    } catch (statusError) {
      // Se falhar ao consultar no gateway, retornar status do banco
      console.error("Erro ao consultar status no PagSeguro:", statusError);
      res.json({
        transactionId: pagamento.transacao_id,
        status: pagamento.status,
        pagamento: pagamento
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao consultar status" });
  }
});

// POST /api/pagamentos/webhook -> Webhook do PagSeguro para notificações
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const db = req.db;

  try {
    // O PagSeguro envia notificações via webhook
    // Em produção, você deve validar a assinatura do webhook
    const notification = req.body;

    // Processar notificação
    if (notification.id && notification.status) {
      const transactionId = notification.id;
      const novoStatus = pagseguroService.mapPagSeguroStatus(notification.status);

      // Buscar pagamento no banco
      const pagamentoResult = await db.query(
        "SELECT * FROM pagamentos WHERE transacao_id = $1",
        [transactionId]
      );

      if (pagamentoResult.rows.length > 0) {
        const pagamento = pagamentoResult.rows[0];

        // Atualizar status do pagamento
        await db.query(
          "UPDATE pagamentos SET status = $1 WHERE transacao_id = $2",
          [novoStatus, transactionId]
        );

        // Se foi aprovado, atualizar multa
        if (novoStatus === "Aprovado" && pagamento.status !== "Aprovado") {
          await db.query(
            `UPDATE multas 
             SET status = 'Paga', data_pagamento = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [pagamento.multa_id]
          );
        }

        console.log(`✅ Webhook PagSeguro: Transação ${transactionId} atualizada para ${novoStatus}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Erro ao processar webhook:", err);
    res.status(500).json({ error: "Erro ao processar webhook" });
  }
});

export default router;

