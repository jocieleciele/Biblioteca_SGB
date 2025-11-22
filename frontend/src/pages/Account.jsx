import React from 'react'
import DashboardLeitor from './DashboardLeitor'

export default function Account({user}){
  if(!user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-[#0a0a0a] rounded-xl border border-gray-800 text-center">
        <p className="text-gray-400">Você precisa entrar para ver sua conta.</p>
      </div>
    );
  }
  
  // Se for leitor, mostra o dashboard do leitor
  if (user.role === 'Leitor') {
    return <DashboardLeitor user={user} />;
  }
  
  // Para outros perfis, redireciona para o painel apropriado
  return (
    <div className="max-w-md mx-auto p-6 bg-[#0a0a0a] rounded-xl border border-gray-800 text-center">
      <p className="text-gray-400">Acesse o Painel para gerenciar o sistema.</p>
    </div>
  );
}
