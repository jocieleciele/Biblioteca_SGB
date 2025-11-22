// backend/src/services/notificationService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configuração do "transportador" de e-mail.
// Use um serviço como o Mailtrap.io para testes ou configure seu provedor (Gmail, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true para porta 465, false para outras
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envia um e-mail de notificação de que um item reservado está disponível.
 * @param {string} userEmail - E-mail do destinatário.
 * @param {string} userName - Nome do destinatário.
 * @param {string} materialTitle - Título do material.
 */
export const sendReservationAvailableEmail = async (
  userEmail,
  userName,
  materialTitle
) => {
  const mailOptions = {
    from: '"Biblioteca Digital" <noreply@biblioteca.com>',
    to: userEmail,
    subject: "Sua reserva está disponível para retirada!",
    html: `
      <p>Olá, ${userName}!</p>
      <p>O item "<b>${materialTitle}</b>" que você reservou já está disponível para retirada na biblioteca.</p>
      <p>Você tem 48 horas para retirá-lo antes que a reserva expire.</p>
      <br>
      <p>Atenciosamente,</p>
      <p>Equipe da Biblioteca Digital</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`E-mail de notificação enviado para ${userEmail}`);
  } catch (error) {
    console.error(`Erro ao enviar e-mail para ${userEmail}:`, error);
    throw error;
  }
};

/**
 * Envia um e-mail de notificação sobre prazo de devolução próximo.
 * @param {string} userEmail - E-mail do destinatário.
 * @param {string} userName - Nome do destinatário.
 * @param {string} materialTitle - Título do material.
 * @param {Date} dataPrevista - Data prevista para devolução.
 * @param {number} diasRestantes - Dias restantes até a devolução.
 */
export const sendDueDateReminderEmail = async (
  userEmail,
  userName,
  materialTitle,
  dataPrevista,
  diasRestantes
) => {
  const dataFormatada = new Date(dataPrevista).toLocaleDateString("pt-BR");
  
  const mailOptions = {
    from: '"Biblioteca Digital" <noreply@biblioteca.com>',
    to: userEmail,
    subject: `Lembrete: Devolução do item "${materialTitle}"`,
    html: `
      <p>Olá, ${userName}!</p>
      <p>Este é um lembrete de que o item "<b>${materialTitle}</b>" deve ser devolvido até <b>${dataFormatada}</b>.</p>
      <p>Você tem <b>${diasRestantes} dia(s)</b> restante(s) para devolução.</p>
      <p>Lembre-se de renovar o empréstimo caso precise de mais tempo (se permitido pelas regras).</p>
      <br>
      <p>Atenciosamente,</p>
      <p>Equipe da Biblioteca Digital</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`E-mail de lembrete enviado para ${userEmail}`);
  } catch (error) {
    console.error(`Erro ao enviar e-mail para ${userEmail}:`, error);
    throw error;
  }
};

/**
 * Envia um e-mail de notificação sobre empréstimo atrasado.
 * @param {string} userEmail - E-mail do destinatário.
 * @param {string} userName - Nome do destinatário.
 * @param {string} materialTitle - Título do material.
 * @param {Date} dataPrevista - Data prevista para devolução.
 * @param {number} diasAtraso - Dias de atraso.
 * @param {number} valorMulta - Valor da multa acumulada.
 */
export const sendOverdueEmail = async (
  userEmail,
  userName,
  materialTitle,
  dataPrevista,
  diasAtraso,
  valorMulta
) => {
  const dataFormatada = new Date(dataPrevista).toLocaleDateString("pt-BR");
  
  const mailOptions = {
    from: '"Biblioteca Digital" <noreply@biblioteca.com>',
    to: userEmail,
    subject: `URGENTE: Empréstimo atrasado - "${materialTitle}"`,
    html: `
      <p>Olá, ${userName}!</p>
      <p><b>ATENÇÃO:</b> O item "<b>${materialTitle}</b>" está <b>${diasAtraso} dia(s) atrasado</b>.</p>
      <p>Data prevista de devolução: <b>${dataFormatada}</b></p>
      <p>Multa acumulada: <b>R$ ${valorMulta.toFixed(2)}</b></p>
      <p>Por favor, devolva o item o mais rápido possível para evitar o acúmulo de multas.</p>
      <br>
      <p>Atenciosamente,</p>
      <p>Equipe da Biblioteca Digital</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`E-mail de atraso enviado para ${userEmail}`);
  } catch (error) {
    console.error(`Erro ao enviar e-mail para ${userEmail}:`, error);
    throw error;
  }
};
