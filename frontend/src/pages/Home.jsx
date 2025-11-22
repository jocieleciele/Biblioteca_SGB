import React, { useState, useEffect } from 'react'
import Hero from '../components/Hero'
import MaterialCard from '../components/MaterialCard'
import { getMateriais, getAllEmprestimos, getAllReservas, getMultas, getUsers } from '../services/api.js'
import { BookOpen, Users, Clock, AlertTriangle, Bookmark, DollarSign, ArrowRight } from 'lucide-react'

export default function Home({ onSearch, user, onNavigate }) {
  const [materiais, setMateriais] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    emprestimosAtivos: 0,
    reservasPendentes: 0,
    multasPendentes: 0,
    totalMateriais: 0,
    totalUsuarios: 0
  })

  // Verificar se é Bibliotecario
  const isBibliotecario = user && (user.role === 'Bibliotecario' || user.role === 'Bibliotecário')

  // Buscar dados para Bibliotecario
  useEffect(() => {
    if (isBibliotecario) {
      loadBibliotecarioData()
    } else {
      loadMateriais()
    }
  }, [isBibliotecario])

  const loadBibliotecarioData = async () => {
    setLoading(true)
    try {
      // Carregar dados em paralelo
      const [empRes, resRes, multRes, matRes, usrRes] = await Promise.allSettled([
        getAllEmprestimos(),
        getAllReservas(),
        getMultas(),
        getMateriais({}),
        getUsers()
      ])

      const emprestimos = empRes.status === 'fulfilled' ? (empRes.value.items || []) : []
      const reservas = resRes.status === 'fulfilled' ? (resRes.value.items || []) : []
      const multas = multRes.status === 'fulfilled' ? (multRes.value.items || []) : []
      const materiais = matRes.status === 'fulfilled' ? (matRes.value.items || []) : []
      const usuarios = usrRes.status === 'fulfilled' ? (usrRes.value.items || []) : []

      // Filtrar empréstimos ativos
      const ativos = emprestimos.filter(e => e.status === 'Ativo')
      
      // Filtrar reservas pendentes/ativas
      const pendentes = reservas.filter(r => 
        r.status === 'Pendente' || r.status === 'Ativa' || r.status === 'Aguardando Retirada'
      )

      // Filtrar multas pendentes
      const multasPendentes = multas.filter(m => m.status === 'Pendente' || m.pago === false)

      setStats({
        emprestimosAtivos: ativos.length,
        reservasPendentes: pendentes.length,
        multasPendentes: multasPendentes.length,
        totalMateriais: materiais.length,
        totalUsuarios: usuarios.length
      })

      // Limitar a 4 materiais para a seção de recomendados
      setMateriais(materiais.slice(0, 4))
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMateriais = async () => {
    setLoading(true)
    try {
      const data = await getMateriais({})
      setMateriais((data.items || []).slice(0, 4))
    } catch (err) {
      console.error('Erro ao buscar materiais:', err)
      setMateriais([])
    } finally {
      setLoading(false)
    }
  }

  // Se for Bibliotecario, mostrar dashboard resumido
  if (isBibliotecario) {
    return (
      <div className="space-y-8">
        {/* Header de boas-vindas */}
        <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-6">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo, {user.name}!</h1>
          <p className="text-gray-300">Painel de controle do Bibliotecario</p>
        </div>

        {/* Cards de funcionalidades principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gerenciar Empréstimos e Devoluções */}
          <button
            onClick={() => onNavigate('painel')}
            className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-6 hover:from-blue-600/30 hover:to-blue-800/30 transition-all hover:scale-105 cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-600/30 flex items-center justify-center">
                <BookOpen className="text-blue-300" size={24} />
              </div>
              <ArrowRight className="text-gray-400 group-hover:text-blue-300 transition-colors" size={20} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Empréstimos e Devoluções</h3>
            <p className="text-sm text-gray-400 mb-3">Gerencie empréstimos e devoluções de materiais</p>
            <div className="flex items-center gap-2 text-blue-300">
              <Clock size={16} />
              <span className="text-sm font-medium">{stats.emprestimosAtivos} ativos</span>
            </div>
          </button>

          {/* Atender Reservas */}
          <button
            onClick={() => onNavigate('painel')}
            className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-6 hover:from-green-600/30 hover:to-green-800/30 transition-all hover:scale-105 cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-600/30 flex items-center justify-center">
                <Bookmark className="text-green-300" size={24} />
              </div>
              <ArrowRight className="text-gray-400 group-hover:text-green-300 transition-colors" size={20} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Atender Reservas</h3>
            <p className="text-sm text-gray-400 mb-3">Gerencie reservas de materiais</p>
            <div className="flex items-center gap-2 text-green-300">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{stats.reservasPendentes} pendentes</span>
            </div>
          </button>

          {/* Visualizar Materiais e Usuários */}
          <button
            onClick={() => onNavigate('acervo')}
            className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-6 hover:from-purple-600/30 hover:to-purple-800/30 transition-all hover:scale-105 cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-600/30 flex items-center justify-center">
                <Users className="text-purple-300" size={24} />
              </div>
              <ArrowRight className="text-gray-400 group-hover:text-purple-300 transition-colors" size={20} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Materiais e Usuários</h3>
            <p className="text-sm text-gray-400 mb-3">Visualize materiais e usuários do sistema</p>
            <div className="flex items-center gap-4 text-purple-300">
              <span className="text-sm font-medium">{stats.totalMateriais} materiais</span>
              <span className="text-sm font-medium">{stats.totalUsuarios} usuários</span>
            </div>
          </button>

          {/* Gerenciar Multas */}
          <button
            onClick={() => onNavigate('painel')}
            className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border border-orange-500/30 rounded-xl p-6 hover:from-orange-600/30 hover:to-orange-800/30 transition-all hover:scale-105 cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-orange-600/30 flex items-center justify-center">
                <DollarSign className="text-orange-300" size={24} />
              </div>
              <ArrowRight className="text-gray-400 group-hover:text-orange-300 transition-colors" size={20} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gerenciar Multas</h3>
            <p className="text-sm text-gray-400 mb-3">Gerencie multas e pagamentos</p>
            <div className="flex items-center gap-2 text-orange-300">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{stats.multasPendentes} pendentes</span>
            </div>
          </button>
        </div>

        {/* Seção de recomendados */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Materiais Recentes</h2>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Carregando materiais...</div>
          ) : materiais.length === 0 ? (
            <div className="text-center text-gray-400 py-8">Nenhum material cadastrado ainda.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {materiais.map((m) => (
                <MaterialCard key={m.id} material={m} onOpen={() => onSearch(m)} />
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  // Para outros usuários, mostrar página padrão
  return (
    <div>
      {/* Hero com busca e resultados */}
      <Hero
        onSearch={(livro) => {
          // se o usuário clicou em um livro, abre os detalhes
          if (livro && livro.id) {
            onSearch(livro)
          } else {
            // caso apenas tenha feito uma busca genérica, vai para o acervo
            onSearch('')
          }
        }}
      />

      {/* Seção de recomendados */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Recomendados</h2>
        {loading ? (
          <div className="text-center text-gray-400 py-8">Carregando materiais...</div>
        ) : materiais.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Nenhum material cadastrado ainda.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {materiais.map((m) => (
              <MaterialCard key={m.id} material={m} onOpen={() => onSearch(m)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}