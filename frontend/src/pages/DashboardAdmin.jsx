import React, { useEffect, useState } from "react";
import { Shield, Users, Book, TrendingUp, AlertTriangle, DollarSign, Settings, Trash2, Edit, PlusCircle, X } from "lucide-react";
import { getAllEmprestimos, getAtrasados, getUsers, getMateriais, getAllPagamentos, deleteUser, updateUser, createMaterial, updateMaterial, deleteMaterial, getMultas, register, uploadImage } from "../services/api.js";
import { getImageSrc } from "../utils/imageHelper.js";

export default function DashboardAdmin({ user }) {
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalMateriais: 0,
    emprestimosAtivos: 0,
    atrasados: 0,
    multasPendentes: 0,
    receitaTotal: 0
  });
      const [usuarios, setUsuarios] = useState([]);
      const [materiais, setMateriais] = useState([]);
      const [loading, setLoading] = useState(true);
      const [activeTab, setActiveTab] = useState('overview');
      const [showMaterialModal, setShowMaterialModal] = useState(false);
      const [showUserModal, setShowUserModal] = useState(false);
      const [editingMaterial, setEditingMaterial] = useState(null);
      const [editingUser, setEditingUser] = useState(null);
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
      const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        role: 'Leitor',
        password: ''
      });
      const [saving, setSaving] = useState(false);
      const [uploadingImage, setUploadingImage] = useState(false);
      const [selectedImage, setSelectedImage] = useState(null);
      const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usrRes, matRes, empRes, atrRes, pagRes, multRes] = await Promise.all([
        getUsers(),
        getMateriais(),
        getAllEmprestimos(),
        getAtrasados(),
        getAllPagamentos().catch(() => ({ items: [] })),
        getMultas().catch(() => ({ items: [] }))
      ]);

      const usr = usrRes.users || [];
      const mat = matRes.items || [];
      const emp = empRes.items || [];
      const atr = atrRes.items || [];
      const pag = pagRes.items || [];
      const mult = multRes.items || [];

      const receita = pag
        .filter(p => p.status === 'Aprovado')
        .reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);

      const multasPendentes = mult.filter(m => m.status === 'Pendente').length;

      setUsuarios(usr);
      setMateriais(mat);
      setStats({
        totalUsuarios: usr.length,
        totalMateriais: mat.length,
        emprestimosAtivos: emp.filter(e => !e.data_devolucao).length,
        atrasados: atr.length,
        multasPendentes: multasPendentes,
        receitaTotal: receita
      });
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteUser(id);
      await loadData();
      alert("Usuário excluído com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Erro desconhecido";
      alert("Erro ao excluir usuário: " + errorMsg);
    }
  };

  const handleImageUpload = async (file) => {
    setUploadingImage(true);
    try {
      const result = await uploadImage(file);
      // Salvar o nome sem extensão no banco (compatibilidade)
      setMaterialForm({...materialForm, capa: result.filename});
      setUploadingImage(false);
      return result.filename;
    } catch (err) {
      console.error("Erro ao fazer upload da imagem:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Erro desconhecido";
      alert("Erro ao fazer upload da imagem: " + errorMsg);
      setUploadingImage(false);
      throw err;
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      alert("Apenas arquivos PNG ou JPG são permitidos!");
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB!");
      return;
    }

    setSelectedImage(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Fazer upload
    try {
      await handleImageUpload(file);
    } catch (err) {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let capaValue = materialForm.capa;
      
      // Se há uma imagem selecionada mas ainda não foi feito upload, fazer upload agora
      if (selectedImage && !uploadingImage) {
        capaValue = await handleImageUpload(selectedImage);
      }

      const materialData = {
        ...materialForm,
        capa: capaValue || 'img1',
        ano: materialForm.ano ? parseInt(materialForm.ano) : null,
        total: parseInt(materialForm.total) || 1
      };
      await createMaterial(materialData);
      setShowMaterialModal(false);
      setEditingMaterial(null);
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
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Erro desconhecido";
      alert("Erro ao criar material: " + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleEditMaterial = (material) => {
    setEditingMaterial(material);
    setMaterialForm({
      titulo: material.titulo || '',
      autor: material.autor || '',
      categoria: material.categoria || '',
      ano: material.ano || '',
      descricao: material.descricao || '',
      isbn: material.isbn || '',
      tipo: material.tipo || 'Livro',
      total: material.total || 1,
      capa: material.capa || 'img1'
    });
    setSelectedImage(null);
    setImagePreview(null);
    setShowMaterialModal(true);
  };

  const handleUpdateMaterial = async (e) => {
    e.preventDefault();
    if (!editingMaterial) return;
    setSaving(true);
    try {
      let capaValue = materialForm.capa;
      
      // Se há uma imagem selecionada mas ainda não foi feito upload, fazer upload agora
      if (selectedImage && !uploadingImage) {
        capaValue = await handleImageUpload(selectedImage);
      }

      const materialData = {
        ...materialForm,
        capa: capaValue || editingMaterial.capa || 'img1',
        ano: materialForm.ano ? parseInt(materialForm.ano) : null,
        total: parseInt(materialForm.total) || 1
      };
      await updateMaterial(editingMaterial.id, materialData);
      setShowMaterialModal(false);
      setEditingMaterial(null);
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
      alert("Material atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar material:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Erro desconhecido";
      alert("Erro ao atualizar material: " + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteMaterial(id);
      await loadData();
      alert("Material excluído com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir material:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Erro desconhecido";
      alert("Erro ao excluir material: " + errorMsg);
    }
  };

  const handleEditUser = (usr) => {
    setEditingUser(usr);
    setUserForm({
      name: usr.name || '',
      email: usr.email || '',
      role: usr.role || 'Leitor',
      password: ''
    });
    setShowUserModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        // Atualizar usuário existente
        const userData = {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role
        };
        if (userForm.password) {
          userData.password = userForm.password;
        }
        await updateUser(editingUser.id, userData);
        alert("Usuário atualizado com sucesso!");
      } else {
        // Criar novo usuário
        if (!userForm.password || userForm.password.length < 6) {
          alert("Senha é obrigatória e deve ter no mínimo 6 caracteres");
          setSaving(false);
          return;
        }
        const result = await register(userForm.name, userForm.email, userForm.password);
        // Após criar, atualizar o role (register cria como Leitor por padrão)
        if (result?.user?.id && userForm.role !== 'Leitor') {
          await updateUser(result.user.id, { role: userForm.role });
        }
        alert("Usuário criado com sucesso!");
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({
        name: '',
        email: '',
        role: 'Leitor',
        password: ''
      });
      await loadData();
    } catch (err) {
      console.error("Erro ao salvar usuário:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Erro desconhecido";
      alert("Erro ao salvar usuário: " + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando dados administrativos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/10 rounded-xl p-6 border border-purple-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Shield size={32} className="text-purple-400" />
              Painel Administrativo
            </h1>
            <p className="text-gray-400">Gestão completa do sistema de biblioteca</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/30 border border-purple-800/50">
            <Shield size={20} className="text-purple-300" />
            <span className="text-purple-300 font-medium">{user.name}</span>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<Users className="text-blue-400" size={24} />}
          label="Usuários"
          value={stats.totalUsuarios}
          color="blue"
        />
        <StatCard
          icon={<Book className="text-green-400" size={24} />}
          label="Materiais"
          value={stats.totalMateriais}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="text-purple-400" size={24} />}
          label="Empréstimos"
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
          icon={<DollarSign className="text-yellow-400" size={24} />}
          label="Receita Total"
          value={`R$ ${stats.receitaTotal.toFixed(2)}`}
          color="yellow"
        />
        <StatCard
          icon={<AlertTriangle className="text-orange-400" size={24} />}
          label="Multas Pendentes"
          value={stats.multasPendentes}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="bg-[#0a0a0a] rounded-xl border border-gray-800">
        <div className="flex border-b border-gray-800">
          {[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'users', label: 'Usuários' },
            { id: 'materials', label: 'Materiais' },
            { id: 'settings', label: 'Configurações' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Resumo do Sistema</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#101010] rounded-lg p-4 border border-gray-800">
                  <h3 className="font-semibold mb-3">Distribuição de Usuários</h3>
                  <div className="space-y-2">
                    {['Leitor', 'Bibliotecario', 'Administrador'].map(role => {
                      const count = usuarios.filter(u => u.role === role || (role === 'Bibliotecario' && u.role === 'Bibliotecário')).length;
                      return (
                        <div key={role} className="flex items-center justify-between">
                          <span className="text-gray-400">{role}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-[#101010] rounded-lg p-4 border border-gray-800">
                  <h3 className="font-semibold mb-3">Status dos Materiais</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total de Materiais</span>
                      <span className="font-semibold">{stats.totalMateriais}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Empréstimos Ativos</span>
                      <span className="font-semibold">{stats.emprestimosAtivos}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Disponíveis</span>
                      <span className="font-semibold text-green-400">
                        {stats.totalMateriais - stats.emprestimosAtivos}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Gerenciamento de Usuários</h2>
                <button 
                  onClick={() => {
                    setEditingUser(null);
                    setUserForm({
                      name: '',
                      email: '',
                      role: 'Leitor',
                      password: ''
                    });
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  <PlusCircle size={18} />
                  Novo Usuário
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-3 text-gray-400 font-medium">Nome</th>
                      <th className="text-left p-3 text-gray-400 font-medium">Email</th>
                      <th className="text-left p-3 text-gray-400 font-medium">Perfil</th>
                      <th className="text-left p-3 text-gray-400 font-medium">Status</th>
                      <th className="text-right p-3 text-gray-400 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usr) => (
                      <tr key={usr.id} className="border-b border-gray-800/50 hover:bg-[#101010] transition-colors">
                        <td className="p-3 text-white">{usr.name}</td>
                        <td className="p-3 text-gray-400">{usr.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            usr.role === 'Administrador' ? 'bg-purple-900/30 text-purple-300 border border-purple-800' :
                            (usr.role === 'Bibliotecario' || usr.role === 'Bibliotecário') ? 'bg-blue-900/30 text-blue-300 border border-blue-800' :
                            'bg-green-900/30 text-green-300 border border-green-800'
                          }`}>
                            {usr.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            usr.active !== false ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                          }`}>
                            {usr.active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditUser(usr)}
                              className="p-2 rounded-lg hover:bg-blue-900/20 text-blue-400 transition-colors"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            {usr.id !== user.id && (
                              <button
                                onClick={() => handleDeleteUser(usr.id)}
                                className="p-2 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Gerenciamento de Materiais</h2>
                <button 
                  onClick={() => setShowMaterialModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  <PlusCircle size={18} />
                  Novo Material
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materiais.slice(0, 12).map((mat) => (
                  <div key={mat.id} className="bg-[#101010] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
                    <h3 className="font-semibold text-white mb-1 truncate">{mat.titulo}</h3>
                    <p className="text-sm text-gray-400 mb-2">{mat.autor}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{mat.categoria}</span>
                      <span>Disponível: {mat.disponiveis_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button 
                        onClick={() => handleEditMaterial(mat)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm border border-blue-800/50 transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteMaterial(mat.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm border border-red-800/50 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Configurações do Sistema</h2>
              <div className="bg-[#101010] rounded-lg p-6 border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Prazo de Empréstimo</h3>
                    <p className="text-sm text-gray-400">Dias padrão para empréstimos</p>
                  </div>
                  <span className="text-accent font-semibold">14 dias</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Valor da Multa por Dia</h3>
                    <p className="text-sm text-gray-400">Valor cobrado por dia de atraso</p>
                  </div>
                  <span className="text-accent font-semibold">R$ 2,00</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Limite de Renovações</h3>
                    <p className="text-sm text-gray-400">Máximo de renovações por empréstimo</p>
                  </div>
                  <span className="text-accent font-semibold">1 renovação</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Novo Material */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{editingMaterial ? 'Editar Material' : 'Novo Material'}</h2>
              <button
                  onClick={() => {
                  setShowMaterialModal(false);
                  setEditingMaterial(null);
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
            <form onSubmit={editingMaterial ? handleUpdateMaterial : handleCreateMaterial} className="space-y-4">
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
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
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
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
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
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
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
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                    placeholder="Ex: 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={materialForm.isbn}
                    onChange={(e) => setMaterialForm({...materialForm, isbn: e.target.value})}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                    placeholder="ISBN do material"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo
                  </label>
                  <select
                    value={materialForm.tipo}
                    onChange={(e) => setMaterialForm({...materialForm, tipo: e.target.value})}
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
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
                    className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                    placeholder="1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Imagem da Capa (PNG ou JPG, máx. 5MB)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleImageChange}
                      disabled={uploadingImage || saving}
                      className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer disabled:opacity-50"
                    />
                    {uploadingImage && (
                      <p className="text-sm text-yellow-400">Fazendo upload da imagem...</p>
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
                    {!imagePreview && editingMaterial && editingMaterial.capa && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-400 mb-2">Imagem atual:</p>
                        <img 
                          src={getImageSrc(editingMaterial.capa, editingMaterial.titulo)}
                          alt="Capa atual" 
                          className="max-w-full h-32 object-cover rounded-lg border border-gray-800"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
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
                  className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
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
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingMaterial ? 'Atualizar Material' : 'Criar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Editar/Criar Usuário */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                  setUserForm({
                    name: '',
                    email: '',
                    role: 'Leitor',
                    password: ''
                  });
                }}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                disabled={saving}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Digite o nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Digite o email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Perfil *
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                  className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Leitor">Leitor</option>
                  <option value="Bibliotecario">Bibliotecario</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="w-full bg-[#101010] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Digite a senha"
                  minLength={6}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setUserForm({
                      name: '',
                      email: '',
                      role: 'Leitor',
                      password: ''
                    });
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingUser ? 'Atualizar Usuário' : 'Criar Usuário'}
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

