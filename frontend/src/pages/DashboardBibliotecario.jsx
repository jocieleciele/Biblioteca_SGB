import React, { useEffect, useState } from "react";
import { Book, Users, Clock, AlertTriangle, PlusCircle, CheckCircle, Bookmark, X, DollarSign, AlertCircle, Loader } from "lucide-react";
import { getAllEmprestimos, getAtrasados, getUsers, getMateriais, getAllReservas, createMaterial, createEmprestimo, uploadImage, getMultas, createPagamento, calcularMultas } from "../services/api.js";
import { getImageSrc } from "../utils/imageHelper.js";

export default function DashboardBibliotecario({ user, onNavigate }) {
  const [emprestimos, setEmprestimos] = useState([]);
  const [atrasados, setAtrasados] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [multas, setMultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagandoMulta, setPagandoMulta] = useState(null);
  const [stats, setStats] = useState({
    totalMateriais: 0,
    totalUsuarios: 0,
    emprestimosAtivos: 0,
    atrasados: 0,
    reservasPendentes: 0,
    multasPendentes: 0,
    totalMultas: 0
  });
  
  // Estados para modais
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEmprestimoModal, setShowEmprestimoModal] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    titulo: '',
    autor: '',
    categoria: '',
    ano: '',
    descricao: '',
    isbn: '',
    tipo: 'Livro',
    total: 1,
    capa: 'img1'
  });
  const [emprestimoForm, setEmprestimoForm] = useState({
    usuario_id: '',
    material_id: ''
  });
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [listaMateriais, setListaMateriais] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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
    let mult = [];

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

    try {
      const multRes = await getMultas();
      mult = multRes.items || [];
    } catch (err) {
      console.error("Erro ao carregar multas:", err);
      mult = [];
    }

    setEmprestimos(emp.filter(e => !e.data_devolucao));
    setAtrasados(atr);
    setReservas(res.filter(r => r.status === 'Ativa' || r.status === 'Aguardando Retirada' || r.status === 'Pendente'));
    setMultas(mult.filter(m => m.status === 'Pendente'));

    const multasPendentes = mult.filter(m => m.status === 'Pendente');
    const totalMultas = multasPendentes.reduce((sum, m) => sum + parseFloat(m.valor || 0), 0);

    setStats({
      totalMateriais: mat.length,
      totalUsuarios: usr.length,
      emprestimosAtivos: emp.filter(e => !e.data_devolucao).length,
      atrasados: atr.length,
      reservasPendentes: res.filter(r => r.status === 'Ativa' || r.status === 'Aguardando Retirada' || r.status === 'Pendente').length,
      multasPendentes: multasPendentes.length,
      totalMultas: totalMultas
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

  const pagarMulta = async (multaId) => {
    if (!window.confirm("Deseja realmente pagar esta multa?")) {
      return;
    }

    setPagandoMulta(multaId);
    try {
      await createPagamento({
        multa_id: multaId,
        metodo_pagamento: "Online"
      });
      alert("Multa paga com sucesso!");
      await loadData(); // Recarregar dados para atualizar a lista
    } catch (err) {
      console.error("Erro ao pagar multa:", err);
      alert("Erro ao pagar multa: " + (err.response?.data?.error || err.response?.data?.message || err.message || "Erro desconhecido"));
    } finally {
      setPagandoMulta(null);
    }
  };

  const [calculandoMultas, setCalculandoMultas] = useState(false);

  const handleCalcularMultas = async () => {
    if (!window.confirm("Deseja calcular multas para todos os empréstimos atrasados?")) {
      return;
    }

    setCalculandoMultas(true);
    try {
      const result = await calcularMultas();
      alert(result.message || `${result.items?.length || 0} multa(s) criada(s) com sucesso!`);
      await loadData(); // Recarregar dados
    } catch (err) {
      console.error("Erro ao calcular multas:", err);
      alert("Erro ao calcular multas: " + (err.response?.data?.error || err.message || "Erro desconhecido"));
    } finally {
      setCalculandoMultas(false);
    }
  };

  // Funções para ações rápidas
  const handleNovoMaterial = () => {
    setShowMaterialModal(true);
  };

  const handleNovoEmprestimo = async () => {
    try {
      const [usersRes, materialsRes] = await Promise.all([
        getUsers(),
        getMateriais()
      ]);
      setListaUsuarios(usersRes.users || []);
      setListaMateriais(materialsRes.items || []);
      setShowEmprestimoModal(true);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      alert("Erro ao carregar dados para novo empréstimo");
    }
  };

  const handleGerenciarUsuarios = () => {
    if (onNavigate) {
      onNavigate('admin');
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      alert("Apenas arquivos PNG ou JPG são permitidos!");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB!");
      return;
    }

    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    try {
      setUploadingImage(true);
      const result = await uploadImage(file);
      setMaterialForm({...materialForm, capa: result.filename});
      setUploadingImage(false);
    } catch (err) {
      console.error("Erro ao fazer upload da imagem:", err);
      alert("Erro ao fazer upload da imagem: " + (err.response?.data?.error || err.message));
      setSelectedImage(null);
      setImagePreview(null);
      setUploadingImage(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let capaValue = materialForm.capa;
      
      if (selectedImage && !uploadingImage) {
        try {
          setUploadingImage(true);
          const result = await uploadImage(selectedImage);
          capaValue = result.filename;
          setUploadingImage(false);
        } catch (err) {
          console.error("Erro ao fazer upload:", err);
          throw err;
        }
      }

      const materialData = {
        ...materialForm,
        capa: capaValue || 'img1',
        ano: materialForm.ano ? parseInt(materialForm.ano) : null,
        total: parseInt(materialForm.total) || 1
      };
      await createMaterial(materialData);
      setShowMaterialModal(false);
      setSelectedImage(null);
      setImagePreview(null);
      setMaterialForm({
        titulo: '',
        autor: '',
        categoria: '',
        ano: '',
        descricao: '',
        isbn: '',
        tipo: 'Livro',
        total: 1,
        capa: 'img1'
      });
      await loadData();
      alert("Material criado com sucesso!");
    } catch (err) {
      console.error("Erro ao criar material:", err);
      alert("Erro ao criar material: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEmprestimo = async (e) => {
    e.preventDefault();
    if (!emprestimoForm.usuario_id || !emprestimoForm.material_id) {
      alert("Por favor, selecione um usuário e um material");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/emprestimos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          material_id: parseInt(emprestimoForm.material_id),
          usuario_id: parseInt(emprestimoForm.usuario_id)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Erro ao criar empréstimo');
      }

      setShowEmprestimoModal(false);
      setEmprestimoForm({ usuario_id: '', material_id: '' });
      await loadData();
      alert("Empréstimo criado com sucesso!");
    } catch (err) {
      console.error("Erro ao criar empréstimo:", err);
      alert("Erro ao criar empréstimo: " + (err.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  // Exemplo de empréstimo atrasado para demonstração
  const exemploAtrasado = {
    id: 'exemplo',
    material_titulo: 'Exemplo de Material Atrasado',
    usuario_name: 'Usuário Exemplo',
    data_prevista: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 dias atrás
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
        <StatCard
          icon={<DollarSign className="text-orange-400" size={24} />}
          label="Multas Pendentes"
          value={stats.multasPendentes}
          color="orange"
        />
      </div>

      {/* Ações Rápidas */}
      <div className="bg-[#0a0a0a] rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ActionButton
            icon={<PlusCircle size={20} />}
            label="Novo Material"
            onClick={handleNovoMaterial}
            color="blue"
          />
          <ActionButton
            icon={<Book size={20} />}
            label="Novo Empréstimo"
            onClick={handleNovoEmprestimo}
            color="green"
          />
          <ActionButton
            icon={<Users size={20} />}
            label="Gerenciar Usuários"
            onClick={handleGerenciarUsuarios}
            color="purple"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empréstimos Atrasados */}
        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-red-800/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} />
              Empréstimos Atrasados ({atrasados.length})
            </h2>
            {atrasados.length > 0 && (
              <button
                onClick={handleCalcularMultas}
                disabled={calculandoMultas}
                className="px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-orange-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {calculandoMultas ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Calculando...
                  </>
                ) : (
                  <>
                    <DollarSign size={16} />
                    Calcular Multas
                  </>
                )}
              </button>
            )}
          </div>
          {atrasados.length === 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {/* Exemplo de empréstimo atrasado para demonstração */}
              <div className="p-4 bg-[#101010] rounded-lg border border-red-800/50 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{exemploAtrasado.material_titulo}</h3>
                      <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/30 text-yellow-300 border border-yellow-800">
                        Exemplo
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{exemploAtrasado.usuario_name}</p>
                    <div className="text-sm text-red-400">
                      Venceu em: {new Date(exemploAtrasado.data_prevista).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <button
                    disabled
                    className="px-3 py-1.5 rounded-lg bg-red-600/10 text-red-300/50 text-sm border border-red-800/30 cursor-not-allowed"
                    title="Este é apenas um exemplo"
                  >
                    Marcar Devolução
                  </button>
                </div>
              </div>
              <div className="text-center py-4 text-gray-500 text-sm">
                <p>Este é um exemplo de empréstimo atrasado.</p>
                <p className="mt-1">Quando houver empréstimos atrasados reais, eles aparecerão aqui.</p>
              </div>
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

        {/* Multas Pendentes */}
        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-red-800/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-400">
            <DollarSign size={20} />
            Multas Pendentes ({multas.length})
          </h2>
          {multas.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>Nenhuma multa pendente</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {multas.map((multa) => (
                <div
                  key={multa.id}
                  className="p-4 bg-[#101010] rounded-lg border border-red-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{multa.material_titulo || 'Empréstimo'}</h3>
                      <p className="text-sm text-gray-400 mb-2">{multa.usuario_name || multa.usuario_email}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          {multa.dias_atraso} dia(s) de atraso
                        </span>
                        <span className="text-lg font-bold text-red-400">
                          R$ {parseFloat(multa.valor || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => pagarMulta(multa.id)}
                      disabled={pagandoMulta === multa.id || multa.status === 'Paga'}
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm border border-red-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pagandoMulta === multa.id ? 'Processando...' : multa.status === 'Paga' ? 'Paga' : 'Pagar Multa'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Novo Material */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Novo Material</h2>
              <button
                onClick={() => {
                  setShowMaterialModal(false);
                  setSelectedImage(null);
                  setImagePreview(null);
                  setMaterialForm({
                    titulo: '',
                    autor: '',
                    categoria: '',
                    ano: '',
                    descricao: '',
                    isbn: '',
                    tipo: 'Livro',
                    total: 1,
                    capa: 'img1'
                  });
                }}
                disabled={saving}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={materialForm.titulo}
                    onChange={(e) => setMaterialForm({...materialForm, titulo: e.target.value})}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Digite o título"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Autor
                  </label>
                  <input
                    type="text"
                    value={materialForm.autor}
                    onChange={(e) => setMaterialForm({...materialForm, autor: e.target.value})}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Digite o autor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={materialForm.categoria}
                    onChange={(e) => setMaterialForm({...materialForm, categoria: e.target.value})}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Ficção, Ação, etc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={materialForm.ano}
                    onChange={(e) => setMaterialForm({...materialForm, ano: e.target.value})}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Ex: 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo
                  </label>
                  <select
                    value={materialForm.tipo}
                    onChange={(e) => setMaterialForm({...materialForm, tipo: e.target.value})}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Livro">Livro</option>
                    <option value="Periódico">Periódico</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantidade Total *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={materialForm.total}
                    onChange={(e) => setMaterialForm({...materialForm, total: e.target.value})}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Imagem da Capa (PNG ou JPG, máx. 5MB)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageChange}
                    disabled={uploadingImage || saving}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer disabled:opacity-50"
                  />
                  {uploadingImage && (
                    <p className="text-sm text-yellow-400 mt-2">Fazendo upload da imagem...</p>
                  )}
                  {imagePreview && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-400 mb-2">Preview:</p>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-full h-32 object-cover rounded-lg border border-gray-800"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={materialForm.descricao}
                  onChange={(e) => setMaterialForm({...materialForm, descricao: e.target.value})}
                  rows={4}
                  className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Descrição do material"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Criar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Novo Empréstimo */}
      {showEmprestimoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Novo Empréstimo</h2>
              <button
                onClick={() => {
                  setShowEmprestimoModal(false);
                  setEmprestimoForm({ usuario_id: '', material_id: '' });
                }}
                disabled={saving}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateEmprestimo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Usuário *
                </label>
                <select
                  required
                  value={emprestimoForm.usuario_id}
                  onChange={(e) => setEmprestimoForm({...emprestimoForm, usuario_id: e.target.value})}
                  className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione um usuário</option>
                  {listaUsuarios.map((usr) => (
                    <option key={usr.id} value={usr.id}>
                      {usr.name} ({usr.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Material *
                </label>
                <select
                  required
                  value={emprestimoForm.material_id}
                  onChange={(e) => setEmprestimoForm({...emprestimoForm, material_id: e.target.value})}
                  className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione um material</option>
                  {listaMateriais.filter(m => m.active !== false).map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.titulo} {mat.autor ? `- ${mat.autor}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmprestimoModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  {saving ? 'Criando...' : 'Criar Empréstimo'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
    green: 'bg-green-900/20 border-green-800/30',
    orange: 'bg-orange-900/20 border-orange-800/30'
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

