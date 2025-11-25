import React, { useEffect, useState } from "react";
import { Book, Clock, AlertCircle, Bookmark, TrendingUp, DollarSign, RefreshCw } from "lucide-react";
import { getEmprestimosByUser, getReservasByUser, getMultasPendentesByUser, getRecomendacoesByUser } from "../services/api.js";
import PaymentModal from "../components/PaymentModal.jsx";

export default function DashboardLeitor({ user }) {
  const [emprestimos, setEmprestimos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [multas, setMultas] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [multaSelecionada, setMultaSelecionada] = useState(null); // Multa selecionada para pagamento
  const [stats, setStats] = useState({
    emprestimosAtivos: 0,
    reservasAtivas: 0,
    multasPendentes: 0,
    totalMultas: 0
  });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    // Carregar cada seção independentemente para que erros não quebrem tudo
    let emp = [];
    let res = [];
    let mult = [];
    let rec = [];

    try {
      const empRes = await getEmprestimosByUser(user.id);
      emp = empRes.items || [];
    } catch (err) {
      console.error("Erro ao carregar empréstimos:", err);
      emp = [];
    }

    try {
      const resRes = await getReservasByUser(user.id);
      res = resRes.items || [];
    } catch (err) {
      console.error("Erro ao carregar reservas:", err);
      res = [];
    }

    try {
      const multRes = await getMultasPendentesByUser(user.id);
      mult = multRes.items || [];
      console.log("Multas carregadas:", mult.length, mult);
    } catch (err) {
      console.error("Erro ao carregar multas:", err);
      mult = [];
    }

    try {
      const recRes = await getRecomendacoesByUser(user.id);
      rec = recRes.items || [];
    } catch (err) {
      console.error("Erro ao carregar recomendações:", err);
      rec = [];
    }

    setEmprestimos(emp);
    // Mostrar todas as reservas ativas (Ativa, Aguardando Retirada, Pendente)
    const reservasAtivas = res.filter(r => 
      r.status === 'Ativa' || 
      r.status === 'Aguardando Retirada' || 
      r.status === 'Pendente'
    );
    setReservas(reservasAtivas);
    setMultas(mult);
    setRecomendacoes(rec.slice(0, 4));

    const ativos = emp.filter(e => !e.data_devolucao);
    const totalMultas = mult.reduce((sum, m) => sum + parseFloat(m.valor || 0), 0);

    setStats({
      emprestimosAtivos: ativos.length,
      reservasAtivas: reservasAtivas.length,
      multasPendentes: mult.length,
      totalMultas: totalMultas
    });

    setLoading(false);
  };

  const renovarEmprestimo = async (id) => {
    try {
      const { renovarEmprestimo } = await import("../services/api.js");
      await renovarEmprestimo(id);
      await loadData();
    } catch (err) {
      alert("Erro ao renovar empréstimo: " + (err.response?.data?.error || err.message));
    }
  };

  const handlePagarMulta = (multa) => {
    console.log('Abrindo modal de pagamento para multa:', multa);
    if (!multa || !multa.id) {
      console.error('Multa inválida:', multa);
      alert('Erro: Multa inválida. Por favor, recarregue a página.');
      return;
    }
    setMultaSelecionada(multa);
  };

  const handlePagamentoSucesso = () => {
    loadData(); // Recarregar dados para atualizar a lista
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#071018] to-[#0a1520] rounded-xl p-6 border border-gray-800">
        <h1 className="text-3xl font-bold mb-2">Bem-vindo, {user.name}!</h1>
        <p className="text-gray-400">Gerencie seus empréstimos, reservas e multas</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Book className="text-blue-400" size={24} />}
          label="Empréstimos Ativos"
          value={stats.emprestimosAtivos}
          color="blue"
        />
        <StatCard
          icon={<Bookmark className="text-purple-400" size={24} />}
          label="Reservas Ativas"
          value={stats.reservasAtivas}
          color="purple"
        />
        <StatCard
          icon={<AlertCircle className="text-red-400" size={24} />}
          label="Multas Pendentes"
          value={stats.multasPendentes}
          color="red"
        />
        <StatCard
          icon={<DollarSign className="text-yellow-400" size={24} />}
          label="Total em Multas"
          value={`R$ ${stats.totalMultas.toFixed(2)}`}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Empréstimos Ativos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0a0a0a] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Book size={20} className="text-accent" />
                Meus Empréstimos
              </h2>
            </div>
            {emprestimos.filter(e => !e.data_devolucao).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Book size={48} className="mx-auto mb-2 opacity-50" />
                <p>Você não possui empréstimos ativos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emprestimos.filter(e => !e.data_devolucao).map((emp) => (
                  <div
                    key={emp.id}
                    className="p-4 bg-[#101010] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{emp.material_titulo}</h3>
                        <p className="text-sm text-gray-400 mb-2">{emp.material_autor}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">
                            Emprestado em: {new Date(emp.data_emprestimo).toLocaleDateString('pt-BR')}
                          </span>
                          <span className={emp.atrasado ? "text-red-400" : "text-green-400"}>
                            Vence em: {new Date(emp.data_prevista).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {emp.atrasado ? (
                          <span className="px-3 py-1 rounded-full bg-red-900/30 text-red-300 text-xs font-medium border border-red-800">
                            Atrasado
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-green-900/30 text-green-300 text-xs font-medium border border-green-800">
                            Em dia
                          </span>
                        )}
                        {!emp.atrasado && emp.renovacoes === 0 && (
                          <button
                            onClick={() => renovarEmprestimo(emp.id)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm border border-blue-800/50 transition-colors"
                          >
                            <RefreshCw size={14} />
                            Renovar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reservas */}
          <div className="bg-[#0a0a0a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Bookmark size={20} className="text-purple-400" />
              Minhas Reservas
            </h2>
            {reservas.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Bookmark size={48} className="mx-auto mb-2 opacity-50" />
                <p>Você não possui reservas ativas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservas.map((res) => (
                  <div
                    key={res.id}
                    className="p-4 bg-[#101010] rounded-lg border border-gray-800"
                  >
                    <h3 className="font-semibold text-white mb-1">{res.material_titulo}</h3>
                    <p className="text-sm text-gray-400 mb-2">{res.material_autor}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Reservado em: {new Date(res.data_reserva).toLocaleDateString('pt-BR')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        res.status === 'Aguardando Retirada' 
                          ? 'bg-green-900/30 text-green-300 border border-green-800'
                          : res.status === 'Ativa'
                          ? 'bg-blue-900/30 text-blue-300 border border-blue-800'
                          : res.status === 'Pendente'
                          ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800'
                          : 'bg-gray-900/30 text-gray-300 border border-gray-800'
                      }`}>
                        {res.status || 'Ativa'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Multas - Sempre exibir */}
          <div className="bg-[#0a0a0a] rounded-xl p-6 border border-red-800/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-400">
              <AlertCircle size={20} />
              Multas Pendentes
            </h2>
            {multas.length > 0 ? (
              <div className="space-y-3">
                {multas.map((multa) => (
                  <div key={multa.id} className="p-3 bg-[#101010] rounded-lg border border-red-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">{multa.material_titulo || 'Empréstimo'}</span>
                      <span className="text-lg font-bold text-red-400">
                        R$ {parseFloat(multa.valor).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {multa.dias_atraso} dia(s) de atraso
                    </p>
                    <button 
                      onClick={() => handlePagarMulta(multa)}
                      disabled={multa.status === 'Paga'}
                      className="w-full px-3 py-2 rounded-lg bg-accent text-black font-medium hover:bg-orange-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {multa.status === 'Paga' ? 'Paga' : 'Pagar Multa'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle size={48} className="mx-auto mb-3 text-gray-600 opacity-50" />
                <p className="text-gray-400 text-sm mb-2">Nenhuma multa pendente</p>
                {emprestimos.filter(e => !e.data_devolucao && new Date(e.data_prevista) < new Date()).length > 0 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Você tem empréstimos atrasados. As multas serão calculadas em breve.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Recomendações */}
          {recomendacoes.length > 0 && (
            <div className="bg-[#0a0a0a] rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-accent" />
                Recomendações para Você
              </h2>
              <div className="space-y-3">
                {recomendacoes.map((rec) => (
                  <div key={rec.id || rec.material_id} className="p-3 bg-[#101010] rounded-lg border border-gray-800 hover:border-accent/30 transition-colors cursor-pointer">
                    <h3 className="font-semibold text-white text-sm mb-1">{rec.titulo || rec.material_titulo || 'Material'}</h3>
                    <p className="text-xs text-gray-400 mb-2">{rec.autor || rec.material_autor || 'Autor desconhecido'}</p>
                    <p className="text-xs text-accent">{rec.motivo || 'Recomendado para você'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Pagamento */}
      {multaSelecionada && (
        <PaymentModal
          isOpen={!!multaSelecionada}
          onClose={() => setMultaSelecionada(null)}
          multa={multaSelecionada}
          onSuccess={handlePagamentoSucesso}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-900/20 border-blue-800/30',
    purple: 'bg-purple-900/20 border-purple-800/30',
    red: 'bg-red-900/20 border-red-800/30',
    yellow: 'bg-yellow-900/20 border-yellow-800/30',
    green: 'bg-green-900/20 border-green-800/30'
  };

  return (
    <div className="bg-[#0a0a0a] rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

