// frontend/src/components/PaymentModal.jsx
import React, { useState, useEffect } from 'react';
import { X, CreditCard, QrCode, FileText, Loader } from 'lucide-react';
import { createPagamento } from '../services/api.js';

export default function PaymentModal({ isOpen, onClose, multa, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Dados do cartão
  const [cardData, setCardData] = useState({
    number: '',
    expMonth: '',
    expYear: '',
    cvv: '',
    holderName: '',
    installments: 1
  });

  // CPF para PIX/Boleto
  const [cpf, setCpf] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Resetar estado quando fechar
      setPaymentMethod('PIX');
      setPaymentResult(null);
      setError(null);
      setCardData({
        number: '',
        expMonth: '',
        expYear: '',
        cvv: '',
        holderName: '',
        installments: 1
      });
      setCpf('');
    }
  }, [isOpen]);

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    }
    return v;
  };

  const formatCPF = (value) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return v;
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData({ ...cardData, number: formatted });
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const paymentData = {
        multa_id: multa.id,
        metodo_pagamento: paymentMethod,
        dados_pagamento: {}
      };

      if (paymentMethod === 'CREDIT_CARD') {
        // Validar dados do cartão
        if (!cardData.number || !cardData.expMonth || !cardData.expYear || !cardData.cvv || !cardData.holderName) {
          throw new Error('Preencha todos os dados do cartão');
        }

        // Remover espaços do número do cartão
        const cardNumber = cardData.number.replace(/\s/g, '');
        if (cardNumber.length < 13 || cardNumber.length > 19) {
          throw new Error('Número do cartão inválido');
        }

        paymentData.dados_pagamento = {
          card: {
            number: cardNumber,
            expMonth: parseInt(cardData.expMonth),
            expYear: parseInt(cardData.expYear),
            cvv: cardData.cvv,
            holderName: cardData.holderName,
            installments: parseInt(cardData.installments)
          },
          cpf: cpf.replace(/\D/g, '')
        };
      } else if (paymentMethod === 'PIX' || paymentMethod === 'BOLETO') {
        if (cpf && cpf.replace(/\D/g, '').length === 11) {
          paymentData.dados_pagamento.cpf = cpf.replace(/\D/g, '');
        }
      }

      const response = await createPagamento(paymentData);

      if (response.paymentData) {
        setPaymentResult(response);
      } else {
        // Pagamento aprovado imediatamente (cartão)
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">Pagamento de Multa</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Informações da Multa */}
          <div className="bg-[#101010] rounded-lg p-4 mb-6 border border-gray-800">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400">Multa #{multa.id}</p>
                <p className="text-gray-300 mt-1">{multa.descricao || multa.material_titulo || 'Multa por atraso'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Valor</p>
                <p className="text-2xl font-bold text-accent">R$ {parseFloat(multa.valor).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Resultado do Pagamento (PIX/Boleto) */}
          {paymentResult?.paymentData && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
              {paymentMethod === 'PIX' && paymentResult.paymentData.qrCode && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-green-400 mb-4">Pagamento PIX Criado!</h3>
                  <p className="text-sm text-gray-300 mb-4">Escaneie o QR Code ou copie o código PIX</p>
                  
                  {paymentResult.paymentData.qrCodeBase64 && (
                    <div className="mb-4 flex justify-center">
                      <img 
                        src={paymentResult.paymentData.qrCodeBase64} 
                        alt="QR Code PIX" 
                        className="border-2 border-gray-700 rounded-lg p-2 bg-white"
                      />
                    </div>
                  )}
                  
                  <div className="bg-[#101010] p-3 rounded border border-gray-800 mb-4">
                    <p className="text-xs text-gray-400 mb-2">Código PIX (Copiar e Colar):</p>
                    <p className="text-sm text-white font-mono break-all">{paymentResult.paymentData.qrCode}</p>
                  </div>
                  
                  <p className="text-xs text-gray-400">
                    Expira em: {new Date(paymentResult.paymentData.expirationDate).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
              
              {paymentMethod === 'BOLETO' && paymentResult.paymentData.barcode && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-green-400 mb-4">Boleto Gerado!</h3>
                  <p className="text-sm text-gray-300 mb-4">Copie o código de barras ou baixe o PDF</p>
                  
                  <div className="bg-[#101010] p-3 rounded border border-gray-800 mb-4">
                    <p className="text-xs text-gray-400 mb-2">Código de Barras:</p>
                    <p className="text-sm text-white font-mono break-all">{paymentResult.paymentData.barcode}</p>
                  </div>
                  
                  {paymentResult.paymentData.pdf && (
                    <a
                      href={paymentResult.paymentData.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-orange-500 transition-colors"
                    >
                      Baixar Boleto PDF
                    </a>
                  )}
                </div>
              )}
              
              <button
                onClick={() => {
                  if (onSuccess) onSuccess();
                  onClose();
                }}
                className="w-full mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Formulário de Pagamento */}
          {!paymentResult && (
            <form onSubmit={handleSubmit}>
              {/* Seleção de Método */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Método de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'PIX'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <QrCode size={24} className={`mx-auto mb-2 ${paymentMethod === 'PIX' ? 'text-accent' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${paymentMethod === 'PIX' ? 'text-accent' : 'text-gray-400'}`}>
                      PIX
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <CreditCard size={24} className={`mx-auto mb-2 ${paymentMethod === 'CREDIT_CARD' ? 'text-accent' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${paymentMethod === 'CREDIT_CARD' ? 'text-accent' : 'text-gray-400'}`}>
                      Cartão
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BOLETO')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'BOLETO'
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <FileText size={24} className={`mx-auto mb-2 ${paymentMethod === 'BOLETO' ? 'text-accent' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${paymentMethod === 'BOLETO' ? 'text-accent' : 'text-gray-400'}`}>
                      Boleto
                    </p>
                  </button>
                </div>
              </div>

              {/* CPF (PIX e Boleto) */}
              {(paymentMethod === 'PIX' || paymentMethod === 'BOLETO') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CPF (Opcional)
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCPFChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-4 py-2 bg-[#101010] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              {/* Dados do Cartão */}
              {paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Número do Cartão
                    </label>
                    <input
                      type="text"
                      value={cardData.number}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      required
                      className="w-full px-4 py-2 bg-[#101010] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Mês
                      </label>
                      <input
                        type="number"
                        value={cardData.expMonth}
                        onChange={(e) => setCardData({ ...cardData, expMonth: e.target.value })}
                        placeholder="MM"
                        min="1"
                        max="12"
                        required
                        className="w-full px-4 py-2 bg-[#101010] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Ano
                      </label>
                      <input
                        type="number"
                        value={cardData.expYear}
                        onChange={(e) => setCardData({ ...cardData, expYear: e.target.value })}
                        placeholder="AAAA"
                        min={new Date().getFullYear()}
                        required
                        className="w-full px-4 py-2 bg-[#101010] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        placeholder="123"
                        maxLength={4}
                        required
                        className="w-full px-4 py-2 bg-[#101010] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Parcelas
                      </label>
                      <select
                        value={cardData.installments}
                        onChange={(e) => setCardData({ ...cardData, installments: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-[#101010] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-accent"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                          <option key={i} value={i}>{i}x sem juros</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nome no Cartão
                    </label>
                    <input
                      type="text"
                      value={cardData.holderName}
                      onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                      placeholder="NOME COMO ESTÁ NO CARTÃO"
                      required
                      className="w-full px-4 py-2 bg-[#101010] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CPF do Titular
                    </label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={handleCPFChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                      className="w-full px-4 py-2 bg-[#101010] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              {/* Erro */}
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    paymentMethod === 'PIX' ? 'Gerar QR Code PIX' :
                    paymentMethod === 'BOLETO' ? 'Gerar Boleto' :
                    'Pagar com Cartão'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

