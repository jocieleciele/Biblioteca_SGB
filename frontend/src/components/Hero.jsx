import React, { useState } from 'react'
import { getMateriais } from '../services/api.js'
import { getImageSrc } from '../utils/imageHelper'

export default function Hero({ onSearch }) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)

  const buscarLivros = async () => {
    const termo = q.trim()
    if (termo === '') {
      setResultados([])
      return
    }
    
    setBuscando(true)
    try {
      const data = await getMateriais({ q: termo })
      setResultados(data.items || [])
    } catch (err) {
      console.error('Erro ao buscar:', err)
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }

  const abrirDetalhe = (livro) => {
    onSearch(livro)
  }

  return (
    <section className="rounded-lg p-6 bg-gradient-to-r from-[#071018] to-[#0b1420] border border-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Campo de busca */}
        <div>
          <h2 className="text-2xl font-bold text-white">Encontre o próximo livro</h2>
          <p className="mt-2 text-gray-400">
            Busque por título, autor ou categoria. Reserve e receba notificações.
          </p>

          <div className="mt-4 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar..."
              className="flex-1 bg-[#061019] border border-gray-800 rounded-md px-3 py-2 text-gray-200"
            />
            <button
              onClick={buscarLivros}
              className="px-4 py-2 rounded-md bg-accent text-black hover:brightness-95"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Resultados da pesquisa */}
        <div className="bg-panel rounded-md p-4 border border-gray-800 min-h-[220px]">
          {buscando ? (
            <div className="text-gray-500 flex items-center justify-center h-full text-sm">
              Buscando...
            </div>
          ) : resultados.length === 0 ? (
            <div className="text-gray-500 flex items-center justify-center h-full text-sm">
              {q ? 'Nenhum resultado encontrado' : 'Digite algo para buscar'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resultados.map((livro) => {
                const imageSrc = getImageSrc(livro.capa, livro.titulo);
                return (
                  <div
                    key={livro.id}
                    onClick={() => abrirDetalhe(livro)}
                    className="bg-[#071018] rounded-md p-3 hover:bg-[#0c1a26] cursor-pointer transition"
                  >
                    <div className="h-32 bg-panel flex items-center justify-center text-gray-400 rounded overflow-hidden relative">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={livro.titulo}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : null}
                      {!imageSrc && (
                        <span className="text-xs">Sem imagem</span>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-white">{livro.titulo}</h3>
                    <p className="text-xs text-gray-400">{livro.autor} • {livro.ano}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
