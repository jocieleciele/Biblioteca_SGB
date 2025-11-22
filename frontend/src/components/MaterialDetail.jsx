import React, {useState} from 'react'
import { getImageSrc } from '../utils/imageHelper'
import { createEmprestimo, createReserva } from '../services/api'

export default function MaterialDetail({material, onBack, user, onNavigate}){
  const [reserved, setReserved] = useState(false)
  const [loaned, setLoaned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const imageSrc = getImageSrc(material.capa, material.titulo)

  const handleEmprestimo = async () => {
    if (!user) {
      setError('Você precisa estar logado para solicitar um empréstimo. Faça login primeiro.')
      return
    }

    if (!material || !material.id) {
      setError('Erro: Material inválido')
      return
    }

    // Verificar se há token
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Sessão expirada. Por favor, faça login novamente.')
      return
    }

    setLoading(true)
    setError(null)
    setLoaned(false)
    
    try {
      console.log('Solicitando empréstimo para material:', material.id)
      const response = await createEmprestimo(material.id)
      console.log('Empréstimo criado com sucesso:', response)
      setLoaned(true)
      setError(null)
      
      // Redireciona para o perfil após 2 segundos
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('account')
        }
      }, 2000)
    } catch (err) {
      console.error('Erro completo ao criar empréstimo:', err)
      console.error('Resposta do servidor:', err.response?.data)
      
      let errorMessage = 'Erro ao solicitar empréstimo'
      
      if (err.response) {
        // Erro com resposta do servidor
        if (err.response.status === 401) {
          errorMessage = 'Sessão expirada. Por favor, faça login novamente.'
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Material não disponível ou você já possui um empréstimo ativo deste material'
        } else if (err.response.status === 404) {
          errorMessage = 'Material não encontrado'
        } else if (err.response.status === 403) {
          errorMessage = 'Você não tem permissão para realizar esta ação'
        } else {
          errorMessage = err.response.data?.message || err.response.data?.error || `Erro do servidor: ${err.response.status}`
        }
      } else if (err.request) {
        // Erro de rede
        errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.'
      } else {
        // Outro erro
        errorMessage = err.message || 'Erro desconhecido'
      }
      
      setError(errorMessage)
      setLoaned(false)
    } finally {
      setLoading(false)
    }
  }

  const handleReserva = async () => {
    if (!user) {
      setError('Você precisa estar logado para fazer uma reserva. Faça login primeiro.')
      return
    }

    if (!material || !material.id) {
      setError('Erro: Material inválido')
      return
    }

    // Verificar se há token
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Sessão expirada. Por favor, faça login novamente.')
      return
    }

    setLoading(true)
    setError(null)
    setReserved(false)
    
    try {
      console.log('Criando reserva para material:', material.id)
      const response = await createReserva(material.id)
      console.log('Reserva criada com sucesso:', response)
      setReserved(true)
      setError(null)
      
      // Redireciona para o perfil após 2 segundos
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('account')
        }
      }, 2000)
    } catch (err) {
      console.error('Erro completo ao criar reserva:', err)
      console.error('Resposta do servidor:', err.response?.data)
      
      let errorMessage = 'Erro ao fazer reserva'
      
      if (err.response) {
        // Erro com resposta do servidor
        if (err.response.status === 401) {
          errorMessage = 'Sessão expirada. Por favor, faça login novamente.'
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Material disponível para empréstimo ou você já possui uma reserva ativa'
        } else if (err.response.status === 404) {
          errorMessage = 'Material não encontrado'
        } else if (err.response.status === 403) {
          errorMessage = 'Você não tem permissão para realizar esta ação'
        } else {
          errorMessage = err.response.data?.message || err.response.data?.error || `Erro do servidor: ${err.response.status}`
        }
      } else if (err.request) {
        // Erro de rede
        errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.'
      } else {
        // Outro erro
        errorMessage = err.message || 'Erro desconhecido'
      }
      
      setError(errorMessage)
      setReserved(false)
    } finally {
      setLoading(false)
    }
  }

  // Verifica disponibilidade
  const disponiveis = material.disponiveis_count !== undefined 
    ? material.disponiveis_count 
    : (material.disponivel || material.total || 0)
  const isDisponivel = disponiveis > 0
  
  return (
    <div className="bg-panel rounded-lg shadow p-6">
      <div className="flex items-start gap-6">
       <div className="w-48 h-64 rounded-md bg-[#0a0a0a] flex items-center justify-center overflow-hidden relative">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={material.titulo}
              className="object-cover w-full h-full"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          {!imageSrc && (
            <span className="text-gray-500 text-sm">Sem imagem</span>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{material.titulo}</h2>
          <p className="text-sm text-gray-400">{material.autor} • {material.categoria} • {material.ano}</p>
          <div className="mt-4 text-gray-300">Sinopse curta do material. Informações adicionais podem aparecer aqui.</div>
          {!user && (
            <div className="mt-4 p-3 bg-blue-900/30 border-l-4 border-blue-700 text-blue-300">
              Você precisa estar logado para solicitar empréstimos ou fazer reservas.
            </div>
          )}
          <div className="mt-6 flex items-center gap-3">
            <button 
              onClick={handleEmprestimo} 
              disabled={loading || !user || !isDisponivel} 
              className={`px-4 py-2 rounded-md ${isDisponivel && !loading && user ? 'bg-accent text-black hover:brightness-95' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
            >
              {loading ? 'Processando...' : 'Solicitar Empréstimo'}
            </button>
            <button 
              onClick={handleReserva} 
              disabled={loading || !user || isDisponivel}
              className={`px-4 py-2 rounded-md ${!isDisponivel && !loading && user ? 'bg-accent text-black hover:brightness-95' : 'bg-gray-800 text-gray-300 cursor-not-allowed'}`}
            >
              {loading ? 'Processando...' : 'Reservar'}
            </button>
            <button onClick={onBack} className="px-3 py-2 rounded-md border border-gray-700 hover:bg-gray-800">Voltar</button>
          </div>
          <div className="mt-4 space-y-2 text-gray-300">
            <div><span className="font-medium text-white">Status:</span> {isDisponivel ? 'Disponível' : 'Indisponível'}</div>
            <div><span className="font-medium text-white">Total de cópias:</span> {material.total || 1}</div>
            <div><span className="font-medium text-white">Disponíveis:</span> {disponiveis}</div>
            <div><span className="font-medium text-white">Localização:</span> Prateleira A3</div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border-l-4 border-red-700 text-red-300 rounded">
              <p className="font-semibold">Erro:</p>
              <p>{error}</p>
            </div>
          )}
          {loaned && !error && (
            <div className="mt-4 p-3 bg-green-900/30 border-l-4 border-green-700 text-green-300 rounded">
              <p className="font-semibold">✓ Sucesso!</p>
              <p>Empréstimo registrado com sucesso! Redirecionando para seu perfil...</p>
            </div>
          )}
          {reserved && !error && (
            <div className="mt-4 p-3 bg-yellow-900/30 border-l-4 border-yellow-700 text-yellow-300 rounded">
              <p className="font-semibold">✓ Sucesso!</p>
              <p>Reserva criada com sucesso! Redirecionando para seu perfil...</p>
            </div>
          )}
        </div>

        <aside className="w-64">
            <div className="bg-[#071018] p-4 rounded-md border border-gray-800">
              <h4 className="font-semibold text-white">Ações rápidas</h4>
              <div className="mt-3 flex flex-col gap-2">
                <button className="px-3 py-2 rounded-md border border-gray-700 text-sm">Ver histórico</button>
                <button className="px-3 py-2 rounded-md border border-gray-700 text-sm">Editar material</button>
              </div>
            </div>
        </aside>
      </div>
    </div>
  )
}
