import React from 'react'
export default function UserArea({userType}){
  const loans = [
    {id:1, titulo:'Coroa dos Justos (Espada dos Mortos — Livro Três)', data:'2025-11-18', status:'atrasado', fine: 5.00},
    {id:3, titulo:'A Arte da Guerra', data:'2025-11-25', status:'ativo', fine: 0},
  ]
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-panel rounded-md p-4 shadow-sm">
        <h3 className="font-semibold text-lg">Minha Conta</h3>
        <p className="text-sm text-gray-400">Histórico de empréstimos, reservas e pendências.</p>
        <div className="mt-4">
          <h4 className="font-medium text-gray-200">Empréstimos Ativos</h4>
          <div className="mt-2 space-y-2">
            {loans.map(l=> (
              <div key={l.id} className="p-3 border border-gray-800 rounded-md flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{l.titulo}</div>
                  <div className="text-sm text-gray-400">Vencimento: {l.data} • Status: {l.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">Multa: R$ {l.fine.toFixed(2)}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="px-3 py-1 rounded-md border border-gray-700 text-sm">Renovar</button>
                    <button className="px-3 py-1 rounded-md bg-accent text-black text-sm">Pagar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="bg-panel rounded-md p-4 shadow-sm border border-gray-800">
        <h4 className="font-medium text-gray-200">Resumo</h4>
        <div className="mt-3 space-y-2 text-sm text-gray-300">
          <div>Empréstimos ativos: 2</div>
          <div>Reservas: 1</div>
          <div>Multas pendentes: R$ 5,00</div>
          {(userType === 'Bibliotecario' || userType === 'Bibliotecário') && <div className="mt-3"><button className="px-3 py-2 rounded-md bg-[#334155] text-white">Painel Bibliotecario</button></div>}
          {userType === 'Administrador' && <div className="mt-3"><button className="px-3 py-2 rounded-md bg-[#334155] text-white">Painel Admin</button></div>}
        </div>
      </aside>
    </div>
  )
}
