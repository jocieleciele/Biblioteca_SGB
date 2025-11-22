// frontend/src/pages/Admin.jsx
import React from 'react'
import DashboardAdmin from './DashboardAdmin'

export default function Admin({ user }){
  if (!user || user.role !== 'Administrador') {
    return (
      <div className="text-center py-10 text-red-400">
        Acesso negado. Apenas administradores podem acessar esta página.
      </div>
    );
  }
  
  return <DashboardAdmin user={user} />
}
