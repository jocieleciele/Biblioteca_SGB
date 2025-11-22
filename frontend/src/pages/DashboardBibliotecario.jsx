import React, { useEffect, useState } from "react";
import { Book, Users, Clock, AlertTriangle, PlusCircle, CheckCircle, Bookmark } from "lucide-react";
import { getAllEmprestimos, getAtrasados, getUsers, getMateriais, getAllReservas } from "../services/api.js";

export default function DashboardBibliotecario({ user }) {
  const [emprestimos, setEmprestimos] = useState([]);
  const [atrasados, setAtrasados] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMateriais: 0,
    totalUsuarios: 0,
    emprestimosAtivos: 0,
    atrasados: 0,
    reservasPendentes: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Carregar cada seção independentemente para que erros não quebrem tudo
    let emp = [];
    let atr = [];
    let mat = [];
    let usr = [];
    let res = [];

    try {
      const empRes = await getAllEmprestimos();
      emp = empRes.items || [];
    } catch (err) {
      console.error("Erro ao carregar empréstimos:", err);
      emp = [];
    }

    try {
      const atrRes = await getAtrasados();
      atr = atrRes.items || [];
    } catch (err) {
      console.error("Erro ao carregar atrasados:", err);
      atr = [];
    }

    try {
      const matRes = await getMateriais();
      mat = matRes.items || [];
    } catch (err) {
      console.error("Erro ao carregar materiais:", err);
      mat = [];
    }

    try {
      const usrRes = await getUsers();
      usr = usrRes.users || [];
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
      usr = [];
    }

    try {
      const resRes = await getAllReservas();
      res = resRes.items || [];
    } catch (err) {
      console.error("Erro ao carregar reservas:", err);
      res = [];
    }

    setEmprestimos(emp.filter(e => !e.data_devolucao));
    setAtrasados(atr);
    setReservas(res.filter(r => r.status === 'Ativa' || r.status === 'Aguardando Retirada' || r.status === 'Pendente'));

    setStats({
      totalMateriais: mat.length,
      totalUsuarios: usr.length,
      emprestimosAtivos: emp.filter(e => !e.data_devolucao).length,
      atrasados: atr.length,
      reservasPendentes: res.filter(r => r.status === 'Ativa' || r.status === 'Aguardando Retirada' || r.status === 'Pendente').length
    });

    setLoading(false);
  };

  const marcarDevolucao = async (id) => {
    try {
      const { devolverEmprestimo } = await import("../services/api.js");
      await devolverEmprestimo(id);
      await loadData();
    } catch (err) {
      alert("Erro ao marcar devolução: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 rounded-xl p-6 border border-blue-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Painel do Bibliotecario</h1>
            <p className="text-gray-400">Gerencie empréstimos, reservas e materiais</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900/30 border border-blue-800/50">
            <Users size={20} className="text-blue-300" />
            <span className="text-blue-300 font-medium">{user.name}</span>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Book className="text-blue-400" size={24} />}
          label="Materiais"
          value={stats.totalMateriais}
          color="blue"
        />
        <StatCard
          icon={<Users className="text-green-400" size={24} />}
          label="Usuários"
          value={stats.totalUsuarios}
          color="green"
        />
        <StatCard
          icon={<Clock className="text-purple-400" size={24} />}
          label="Empréstimos Ativos"
          value={stats.emprestimosAtivos}
          color="purple"
        />
        <StatCard
          icon={<AlertTriangle className="text-red-400" size={24} />}
          label="Atrasados"
          value={stats.atrasados}
          color="red"
        />
        <StatCard
          icon={<Bookmark className="text-yellow-400" size={24} />}
          label="Reservas"
          value={stats.reservasPendentes}
          color="yellow"
        />
      </div>

      {/* Ações Rápidas */}
      <div className="bg-[#0a0a0a] rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ActionButton
            icon={<PlusCircle size={20} />}
            label="Novo Material"
            onClick={() => {/* TODO: modal de cadastro */}}
            color="blue"
          />
          <ActionButton
            icon={<Book size={20} />}
            label="Novo Empréstimo"
            onClick={() => {/* TODO: modal de empréstimo */}}
            color="green"
          />
          <ActionButton
            icon={<Users size={20} />}
            label="Gerenciar Usuários"
            onClick={() => {/* TODO: navegar para gestão */}}
            color="purple"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empréstimos Atrasados */}
        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-red-800/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-400">
            <AlertTriangle size={20} />
            Empréstimos Atrasados ({atrasados.length})
          </h2>
          {atrasados.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>Todos os empréstimos estão em dia!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {atrasados.map((emp) => (
                <div
                  key={emp.id}
                  className="p-4 bg-[#101010] rounded-lg border border-red-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{emp.material_titulo}</h3>
                      <p className="text-sm text-gray-400 mb-2">{emp.usuario_name}</p>
                      <div className="text-sm text-red-400">
                        Venceu em: {new Date(emp.data_prevista).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <button
                      onClick={() => marcarDevolucao(emp.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm border border-red-800/50 transition-colors"
                    >
                      Marcar Devolução
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empréstimos Recentes */}
        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-blue-400" />
            Empréstimos Ativos
          </h2>
          {emprestimos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Book size={48} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum empréstimo ativo</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {emprestimos.slice(0, 10).map((emp) => (
                <div
                  key={emp.id}
                  className="p-4 bg-[#101010] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{emp.material_titulo}</h3>
                      <p className="text-sm text-gray-400 mb-2">{emp.usuario_name}</p>
                      <div className="text-sm text-gray-500">
                        Vence em: {new Date(emp.data_prevista).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <button
                      onClick={() => marcarDevolucao(emp.id)}
                      className="px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-300 text-sm border border-green-800/50 transition-colors"
                    >
                      Devolver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reservas Pendentes */}
        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bookmark size={20} className="text-yellow-400" />
            Reservas Pendentes ({reservas.length})
          </h2>
          {reservas.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Bookmark size={48} className="mx-auto mb-2 opacity-50" />
              <p>Nenhuma reserva pendente</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {reservas.map((res) => (
                <div
                  key={res.id}
                  className="p-4 bg-[#101010] rounded-lg border border-gray-800 hover:border-yellow-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{res.material_titulo}</h3>
                      <p className="text-sm text-gray-400 mb-2">{res.usuario_name} ({res.usuario_email})</p>
                      <div className="text-sm text-gray-500">
                        Reservado em: {new Date(res.data_reserva).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      res.status === 'Aguardando Retirada'
                        ? 'bg-green-900/30 text-green-300 border border-green-800'
                        : 'bg-yellow-900/30 text-yellow-300 border border-yellow-800'
                    }`}>
                      {res.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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

function ActionButton({ icon, label, onClick, color }) {
  const colorClasses = {
    blue: 'hover:border-blue-800/50 text-blue-400',
    purple: 'hover:border-purple-800/50 text-purple-400',
    red: 'hover:border-red-800/50 text-red-400',
    yellow: 'hover:border-yellow-800/50 text-yellow-400',
    green: 'hover:border-green-800/50 text-green-400'
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 bg-[#101010] rounded-lg border border-gray-800 transition-all hover:bg-[#151515] ${colorClasses[color] || colorClasses.blue}`}
    >
      <div>{icon}</div>
      <span className="font-medium text-white">{label}</span>
    </button>
  );
}

