// backend/src/services/notificationScheduler.js
import pool from "../../db/index.js";
import {
  sendDueDateReminderEmail,
  sendOverdueEmail,
} from "./notificationService.js";

/**
 * Envia notificações de lembrete de devolução para empréstimos próximos do vencimento
 */
export async function enviarLembretesDevolucao() {
  try {
    // Buscar empréstimos que vencem em 3 dias e ainda não foram notificados
    const tresDias = new Date();
    tresDias.setDate(tresDias.getDate() + 3);

    const result = await pool.query(
      `SELECT e.*, u.email, u.name, m.titulo
       FROM emprestimos e
       JOIN users u ON u.id = e.usuario_id
       JOIN materials m ON m.id = e.material_id
       WHERE e.data_devolucao IS NULL
       AND e.data_prevista BETWEEN CURRENT_DATE AND $1
       AND e.notificado_atraso = FALSE
       ORDER BY e.data_prevista ASC`,
      [tresDias]
    );

    for (const emprestimo of result.rows) {
      const dataPrevista = new Date(emprestimo.data_prevista);
      const hoje = new Date();
      const diffTime = dataPrevista - hoje;
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diasRestantes >= 0 && diasRestantes <= 3) {
        try {
          await sendDueDateReminderEmail(
            emprestimo.email,
            emprestimo.name,
            emprestimo.titulo,
            emprestimo.data_prevista,
            diasRestantes
          );
        } catch (error) {
          console.error(
            `Erro ao enviar lembrete para ${emprestimo.email}:`,
            error
          );
        }
      }
    }

    console.log(`Lembretes de devolução processados: ${result.rows.length}`);
  } catch (error) {
    console.error("Erro ao processar lembretes de devolução:", error);
  }
}

/**
 * Envia notificações de atraso para empréstimos vencidos
 */
export async function enviarNotificacoesAtraso() {
  try {
    // Buscar empréstimos atrasados que ainda não foram notificados
    const result = await pool.query(
      `SELECT e.*, u.email, u.name, m.titulo,
              COALESCE(SUM(mu.valor), 0) as multa_acumulada
       FROM emprestimos e
       JOIN users u ON u.id = e.usuario_id
       JOIN materials m ON m.id = e.material_id
       LEFT JOIN multas mu ON mu.emprestimo_id = e.id AND mu.status = 'Pendente'
       WHERE e.data_devolucao IS NULL
       AND e.data_prevista < CURRENT_DATE
       AND e.notificado_atraso = FALSE
       GROUP BY e.id, u.email, u.name, m.titulo
       ORDER BY e.data_prevista ASC`
    );

    for (const emprestimo of result.rows) {
      const dataPrevista = new Date(emprestimo.data_prevista);
      const hoje = new Date();
      const diffTime = hoje - dataPrevista;
      const diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diasAtraso > 0) {
        const valorMulta = parseFloat(emprestimo.multa_acumulada) || diasAtraso * 2.0;

        try {
          await sendOverdueEmail(
            emprestimo.email,
            emprestimo.name,
            emprestimo.titulo,
            emprestimo.data_prevista,
            diasAtraso,
            valorMulta
          );

          // Marcar como notificado
          await pool.query(
            "UPDATE emprestimos SET notificado_atraso = TRUE WHERE id = $1",
            [emprestimo.id]
          );
        } catch (error) {
          console.error(
            `Erro ao enviar notificação de atraso para ${emprestimo.email}:`,
            error
          );
        }
      }
    }

    console.log(`Notificações de atraso processadas: ${result.rows.length}`);
  } catch (error) {
    console.error("Erro ao processar notificações de atraso:", error);
  }
}

/**
 * Executa todas as notificações agendadas
 * Esta função deve ser chamada periodicamente (ex: via cron job)
 */
export async function executarNotificacoes() {
  console.log("Iniciando processamento de notificações...");
  await enviarLembretesDevolucao();
  await enviarNotificacoesAtraso();
  console.log("Processamento de notificações concluído.");
}

