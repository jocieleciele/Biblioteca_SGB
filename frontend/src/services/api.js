// frontend/src/services/api.js
import axios from 'axios';

// Define a URL base da API — em produção ou desenvolvimento
const api = axios.create({
  baseURL: 'http://localhost:4000/api', // backend Express
});

// Intercepta e adiciona o token JWT (se existir)
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
}, err => Promise.reject(err))

// Intercepta respostas para tratar erros
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// ==================== ROTAS DE AUTENTICAÇÃO ====================
export const register = async (name, email, password) => {
  const res = await api.post('/auth/register', { name, email, password });
  return res.data;
};

export const login = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  if (res.data?.token) {
    localStorage.setItem('token', res.data.token);
  }
  return res.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

// ==================== ROTAS DE UPLOAD ====================
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const res = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

// ==================== ROTAS DE MATERIAIS ====================
// Buscar materiais com filtros opcionais
export const getMateriais = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.q) params.append('q', filters.q);
  if (filters.categoria) params.append('categoria', filters.categoria);
  if (filters.autor) params.append('autor', filters.autor);
  if (filters.ano) params.append('ano', filters.ano);
  if (filters.tipo) params.append('tipo', filters.tipo);
  if (filters.disponivel !== undefined) params.append('disponivel', filters.disponivel);
  
  const queryString = params.toString();
  const url = `/materials${queryString ? `?${queryString}` : ''}`;
  const res = await api.get(url);
  return res.data;
};

export const getMaterialById = async (id) => {
  const res = await api.get(`/materials/${id}`);
  return res.data;
};

// Criar material (bibliotecário/admin)
export const createMaterial = async (materialData) => {
  const res = await api.post('/materials', materialData);
  return res.data;
};

// Atualizar material (bibliotecário/admin)
export const updateMaterial = async (id, materialData) => {
  const res = await api.put(`/materials/${id}`, materialData);
  return res.data;
};

// Excluir material (bibliotecário/admin)
export const deleteMaterial = async (id) => {
  const res = await api.delete(`/materials/${id}`);
  return res.data;
};

// ==================== ROTAS DE EMPRÉSTIMOS ====================
export const getEmprestimosByUser = async (userId) => {
  const res = await api.get(`/emprestimos/user/${userId}`);
  return res.data;
};

export const getAllEmprestimos = async () => {
  const res = await api.get('/emprestimos');
  return res.data;
};

export const createEmprestimo = async (materialId) => {
  const res = await api.post('/emprestimos', { material_id: materialId });
  return res.data;
};

export const devolverEmprestimo = async (id) => {
  const res = await api.put(`/emprestimos/${id}/devolver`);
  return res.data;
};

export const renovarEmprestimo = async (id) => {
  const res = await api.put(`/emprestimos/${id}/renovar`);
  return res.data;
};

export const getAtrasados = async () => {
  const res = await api.get('/emprestimos/atrasados');
  return res.data;
};

// ==================== ROTAS DE RESERVAS ====================
export const createReserva = async (materialId) => {
  const res = await api.post('/reservas', { material_id: materialId });
  return res.data;
};

export const getAllReservas = async () => {
  const res = await api.get('/reservas');
  return res.data;
};

export const getReservasByUser = async (userId) => {
  const res = await api.get(`/reservas/user/${userId}`);
  return res.data;
};

// ==================== ROTAS DE USUÁRIOS ====================
export const getUsers = async () => {
  const res = await api.get('/users');
  return res.data;
};

export const getUserById = async (id) => {
  const res = await api.get(`/users/${id}`);
  return res.data;
};

export const updateUser = async (id, userData) => {
  const res = await api.put(`/users/${id}`, userData);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

// ==================== ROTAS DE MULTAS ====================
export const getMultas = async () => {
  const res = await api.get('/multas');
  return res.data;
};

export const getMultasByUser = async (userId) => {
  const res = await api.get(`/multas/user/${userId}`);
  return res.data;
};

export const getMultasPendentesByUser = async (userId) => {
  const res = await api.get(`/multas/pendentes/user/${userId}`);
  return res.data;
};

export const calcularMultas = async () => {
  const res = await api.post('/multas/calcular');
  return res.data;
};

// ROTAS DE PAGAMENTOS //
export const createPagamento = async (pagamentoData) => {
  const res = await api.post('/pagamentos', pagamentoData);
  return res.data;
};

export const getPagamentosByUser = async (userId) => {
  const res = await api.get(`/pagamentos/user/${userId}`);
  return res.data;
};

export const getAllPagamentos = async () => {
  const res = await api.get('/pagamentos');
  return res.data;
};

// ROTAS DE RECOMENDAÇÕES //
export const getRecomendacoesByUser = async (userId) => {
  const res = await api.get(`/recomendacoes/user/${userId}`);
  return res.data;
};

export const getHistoricoRecomendacoesByUser = async (userId) => {
  const res = await api.get(`/recomendacoes/historico/user/${userId}`);
  return res.data;
};

export default api;
