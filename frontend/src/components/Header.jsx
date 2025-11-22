import React from 'react'
import { BookOpen, Home, Search, User, Settings, LogOut, Shield, Library } from 'lucide-react'

export default function Header({onNavigate, user, onLogout, onShowLogin}){
  const getRoleBadge = (role) => {
    const badges = {
      'Administrador': 'bg-purple-600/20 text-purple-300 border-purple-500/30',
      'Bibliotecario': 'bg-blue-600/20 text-blue-300 border-blue-500/30',
      'Bibliotecário': 'bg-blue-600/20 text-blue-300 border-blue-500/30', // Compatibilidade
      'Leitor': 'bg-green-600/20 text-green-300 border-green-500/30'
    }
    return badges[role] || 'bg-gray-600/20 text-gray-300 border-gray-500/30'
  }

  return (
    <header className="border-b border-gray-800/50 bg-gradient-to-r from-[#071018] to-[#0a1520] backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-accent to-orange-600 shadow-lg">
              <Library className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                SGB Biblioteca
              </h1>
              <p className="text-xs text-gray-400">Sistema de Gerenciamento</p>
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex items-center gap-2">
            <button 
              onClick={()=>onNavigate('home')} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-300 hover:text-white"
            >
              <Home size={18} />
              <span>Início</span>
            </button>
            <button 
              onClick={()=>onNavigate('acervo')} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-300 hover:text-white"
            >
              <Search size={18} />
              <span>Acervo</span>
            </button>

            {!user && (
              <button 
                onClick={onShowLogin} 
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-orange-500 transition-colors ml-2"
              >
                <User size={18} />
                <span>Entrar</span>
              </button>
            )}

            {user && (
              <>
                {/* Navegação por perfil */}
                {user.role === 'Leitor' && (
                  <button 
                    onClick={() => onNavigate('account')} 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-300 hover:text-white"
                  >
                    <User size={18} />
                    <span>Minha Conta</span>
                  </button>
                )}

                {(user.role === 'Bibliotecario' || user.role === 'Bibliotecário' || user.role === 'Administrador') && (
                  <button 
                    onClick={() => onNavigate('painel')} 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-300 hover:text-white"
                  >
                    <Settings size={18} />
                    <span>Painel</span>
                  </button>
                )}

                {user.role === 'Administrador' && (
                  <button 
                    onClick={() => onNavigate('admin')} 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-purple-800/30 transition-colors text-purple-300 hover:text-purple-200"
                  >
                    <Shield size={18} />
                    <span>Admin</span>
                  </button>
                )}

                {/* Menu do usuário */}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadge(user.role)}`}>
                        {user.role === 'Bibliotecário' ? 'Bibliotecario' : user.role}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={onLogout} 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-red-900/30 text-gray-300 hover:text-red-300 transition-colors"
                    title="Sair"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
