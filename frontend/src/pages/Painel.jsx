import React from "react";
import DashboardLeitor from "./DashboardLeitor";
import DashboardBibliotecario from "./DashboardBibliotecario";
import DashboardAdmin from "./DashboardAdmin";

export default function Painel({ user, onNavigate }) {
  console.log('🔍 Painel - User completo:', JSON.stringify(user, null, 2));
  
  if (!user) {
    return (
      <div className="text-center py-10 text-red-400 bg-[#0a0a0a] rounded-xl border border-red-800/30">
        Você precisa estar logado para acessar o painel.
      </div>
    );
  }

  // Normalizar role para garantir compatibilidade (remove acento de Bibliotecário)
  let normalizedRole = user.role;
  if (typeof normalizedRole === 'string') {
    // Normalizar Bibliotecário (com acento) para Bibliotecario (sem acento)
    if (normalizedRole === 'Bibliotecário' || normalizedRole.includes('Bibliotecário')) {
      normalizedRole = 'Bibliotecario';
    }
    normalizedRole = normalizedRole.trim();
  }
  
  console.log('🔍 Painel - User role original:', user.role);
  console.log('🔍 Painel - User role normalizado:', normalizedRole);
  console.log('🔍 Painel - Tipo do role:', typeof normalizedRole);

  // Renderiza dashboard baseado no perfil do usuário
  switch (normalizedRole) {
    case 'Leitor':
      console.log('Renderizando DashboardLeitor');
      return <DashboardLeitor user={user} />;
    case 'Bibliotecario':
      console.log('Renderizando DashboardBibliotecario');
      return <DashboardBibliotecario user={user} onNavigate={onNavigate} />;
    case 'Administrador':
      console.log('Renderizando DashboardAdmin');
      return <DashboardAdmin user={user} />;
    default:
      console.error('Role não reconhecido:', normalizedRole, 'Tipo:', typeof normalizedRole);
      return (
        <div className="text-center py-10 text-red-400 bg-[#0a0a0a] rounded-xl border border-red-800/30">
          <p className="text-lg font-bold mb-2">Perfil de usuário não reconhecido</p>
          <p className="text-sm mb-4">Role recebido: <code className="bg-gray-800 px-2 py-1 rounded">{String(user.role)}</code></p>
          <p className="text-sm mb-4">Role normalizado: <code className="bg-gray-800 px-2 py-1 rounded">{String(normalizedRole)}</code></p>
          <p className="text-sm text-gray-400 mt-2">Roles válidos: Leitor, Bibliotecario, Administrador</p>
          <div className="mt-4 p-4 bg-gray-900 rounded">
            <p className="text-xs text-gray-500">Debug Info:</p>
            <pre className="text-xs text-left mt-2">{JSON.stringify(user, null, 2)}</pre>
          </div>
        </div>
      );
  }
}
