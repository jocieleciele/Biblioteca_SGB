// backend/src/services/pagseguroService.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Serviço de integração com PagSeguro
 * Documentação: https://dev.pagseguro.uol.com.br/
 */
class PagSeguroService {
  constructor() {
    // URLs da API PagSeguro
    this.sandboxUrl = 'https://sandbox.api.pagseguro.com';
    this.productionUrl = 'https://api.pagseguro.com';
    
    // Determina se está em modo sandbox ou produção
    this.isSandbox = process.env.PAGSEGURO_ENV === 'sandbox' || !process.env.PAGSEGURO_ENV;
    this.baseUrl = this.isSandbox ? this.sandboxUrl : this.productionUrl;
    
    // Credenciais
    this.token = process.env.PAGSEGURO_TOKEN;
    this.email = process.env.PAGSEGURO_EMAIL;
    
    if (!this.token || !this.email) {
      console.warn('⚠️  PagSeguro: Token ou Email não configurados. Pagamentos serão simulados.');
    }
  }

  /**
   * Cria headers para requisições à API PagSeguro
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'x-api-version': '4.0'
    };
  }

  /**
   * Cria um pagamento via PIX
   * @param {Object} paymentData - Dados do pagamento
   * @param {number} paymentData.amount - Valor em centavos
   * @param {string} paymentData.reference - Referência única (ID da multa)
   * @param {Object} paymentData.customer - Dados do cliente
   * @returns {Promise<Object>} Dados do pagamento criado
   */
  async createPixPayment({ amount, reference, customer }) {
    if (!this.token || !this.email) {
      // Modo simulado para desenvolvimento
      return this.simulatePayment('PIX', amount, reference);
    }

    try {
      const payload = {
        reference_id: `multa_${reference}`,
        description: `Pagamento de multa #${reference}`,
        amount: {
          value: Math.round(amount * 100), // Converte para centavos
          currency: 'BRL'
        },
        payment_method: {
          type: 'PIX',
          pix: {
            expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
          }
        },
        customer: {
          name: customer.name,
          email: customer.email,
          tax_id: customer.cpf || customer.cnpj || '00000000000'
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/charges`,
        payload,
        { headers: this.getHeaders() }
      );

      return {
        transactionId: response.data.id,
        status: response.data.status,
        qrCode: response.data.payment_method?.pix?.qr_code,
        qrCodeBase64: response.data.payment_method?.pix?.qr_code_base64,
        expirationDate: response.data.payment_method?.pix?.expiration_date,
        link: response.data.links?.find(link => link.rel === 'self')?.href
      };
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error.response?.data || error.message);
      throw new Error(`Erro ao processar pagamento PIX: ${error.response?.data?.error_messages?.[0]?.description || error.message}`);
    }
  }

  /**
   * Cria um pagamento via Cartão de Crédito
   * @param {Object} paymentData - Dados do pagamento
   * @param {number} paymentData.amount - Valor em reais
   * @param {string} paymentData.reference - Referência única
   * @param {Object} paymentData.customer - Dados do cliente
   * @param {Object} paymentData.card - Dados do cartão
   * @returns {Promise<Object>} Dados do pagamento criado
   */
  async createCreditCardPayment({ amount, reference, customer, card }) {
    if (!this.token || !this.email) {
      return this.simulatePayment('CREDIT_CARD', amount, reference);
    }

    try {
      const payload = {
        reference_id: `multa_${reference}`,
        description: `Pagamento de multa #${reference}`,
        amount: {
          value: Math.round(amount * 100), // Converte para centavos
          currency: 'BRL'
        },
        payment_method: {
          type: 'CREDIT_CARD',
          installments: card.installments || 1,
          capture: true,
          card: {
            number: card.number.replace(/\s/g, ''),
            exp_month: card.expMonth,
            exp_year: card.expYear,
            security_code: card.cvv,
            holder: {
              name: card.holderName,
              tax_id: customer.cpf || customer.cnpj || '00000000000'
            }
          }
        },
        customer: {
          name: customer.name,
          email: customer.email,
          tax_id: customer.cpf || customer.cnpj || '00000000000'
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/charges`,
        payload,
        { headers: this.getHeaders() }
      );

      return {
        transactionId: response.data.id,
        status: response.data.status,
        authorizationCode: response.data.payment_response?.code,
        link: response.data.links?.find(link => link.rel === 'self')?.href
      };
    } catch (error) {
      console.error('Erro ao criar pagamento com cartão:', error.response?.data || error.message);
      throw new Error(`Erro ao processar pagamento: ${error.response?.data?.error_messages?.[0]?.description || error.message}`);
    }
  }

  /**
   * Cria um boleto bancário
   * @param {Object} paymentData - Dados do pagamento
   * @param {number} paymentData.amount - Valor em reais
   * @param {string} paymentData.reference - Referência única
   * @param {Object} paymentData.customer - Dados do cliente
   * @returns {Promise<Object>} Dados do pagamento criado
   */
  async createBoletoPayment({ amount, reference, customer }) {
    if (!this.token || !this.email) {
      return this.simulatePayment('BOLETO', amount, reference);
    }

    try {
      const payload = {
        reference_id: `multa_${reference}`,
        description: `Pagamento de multa #${reference}`,
        amount: {
          value: Math.round(amount * 100), // Converte para centavos
          currency: 'BRL'
        },
        payment_method: {
          type: 'BOLETO',
          boleto: {
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3 dias
          }
        },
        customer: {
          name: customer.name,
          email: customer.email,
          tax_id: customer.cpf || customer.cnpj || '00000000000',
          address: customer.address || {
            street: 'Rua',
            number: '0',
            complement: '',
            locality: 'Bairro',
            city: 'Cidade',
            region_code: 'SP',
            country: 'BRA',
            postal_code: '00000000'
          }
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/charges`,
        payload,
        { headers: this.getHeaders() }
      );

      return {
        transactionId: response.data.id,
        status: response.data.status,
        barcode: response.data.payment_method?.boleto?.barcode,
        pdf: response.data.payment_method?.boleto?.formatted_barcode,
        link: response.data.links?.find(link => link.rel === 'self')?.href
      };
    } catch (error) {
      console.error('Erro ao criar boleto:', error.response?.data || error.message);
      throw new Error(`Erro ao gerar boleto: ${error.response?.data?.error_messages?.[0]?.description || error.message}`);
    }
  }

  /**
   * Consulta o status de uma transação
   * @param {string} transactionId - ID da transação no PagSeguro
   * @returns {Promise<Object>} Status da transação
   */
  async getTransactionStatus(transactionId) {
    if (!this.token || !this.email) {
      return { status: 'PAID', id: transactionId };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/charges/${transactionId}`,
        { headers: this.getHeaders() }
      );

      return {
        id: response.data.id,
        status: response.data.status,
        referenceId: response.data.reference_id
      };
    } catch (error) {
      console.error('Erro ao consultar transação:', error.response?.data || error.message);
      throw new Error('Erro ao consultar status da transação');
    }
  }

  /**
   * Processa notificação de webhook do PagSeguro
   * @param {Object} notificationData - Dados da notificação
   * @returns {Promise<Object>} Dados da transação atualizada
   */
  async processWebhook(notificationData) {
    // O PagSeguro envia notificações via webhook
    // Aqui você pode processar e atualizar o status do pagamento
    const { id, status } = notificationData;
    
    return {
      transactionId: id,
      status: this.mapPagSeguroStatus(status)
    };
  }

  /**
   * Mapeia status do PagSeguro para status interno
   */
  mapPagSeguroStatus(pagseguroStatus) {
    const statusMap = {
      'PAID': 'Aprovado',
      'IN_ANALYSIS': 'Pendente',
      'DECLINED': 'Rejeitado',
      'CANCELED': 'Cancelado',
      'WAITING': 'Pendente',
      'AUTHORIZED': 'Aprovado'
    };
    
    return statusMap[pagseguroStatus] || 'Pendente';
  }

  /**
   * Simula pagamento quando credenciais não estão configuradas
   */
  simulatePayment(method, amount, reference) {
    console.log(`⚠️  Modo simulado: Criando pagamento ${method} de R$ ${amount} para multa #${reference}`);
    
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (method === 'PIX') {
      return {
        transactionId,
        status: 'WAITING',
        qrCode: `00020126580014br.gov.bcb.pix0136${transactionId}5204000053039865405${amount}5802BR5925BIBLIOTECA SISTEMA6009SAO PAULO62070503***6304`,
        qrCodeBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };
    }
    
    if (method === 'BOLETO') {
      return {
        transactionId,
        status: 'WAITING',
        barcode: '34191.09008 01234.567890 12345.678901 2 12345678901234',
        pdf: 'https://sandbox.pagseguro.uol.com.br/boleto/simulado'
      };
    }
    
    // Cartão de crédito
    return {
      transactionId,
      status: 'PAID',
      authorizationCode: 'AUTH_' + Math.random().toString(36).substr(2, 9)
    };
  }
}

export default new PagSeguroService();

