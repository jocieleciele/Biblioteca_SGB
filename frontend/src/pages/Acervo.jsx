import React, { useState, useEffect } from "react";
import MaterialCard from "../components/MaterialCard.jsx";
import { getMateriais } from "../services/api.js";

export default function Acervo({ query, onOpen }) {
  const [q, setQ] = useState(typeof query === "string" ? query : "");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Buscar materiais do banco de dados
  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = q ? { q } : {};
        const data = await getMateriais(filters);
        setMaterials(data.items || []);
      } catch (err) {
        setError(err.response?.data?.message || "Erro ao buscar materiais. Verifique se o servidor está rodando.");
        console.error("Erro ao buscar materiais:", err);
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [q]); // Busca quando o termo de busca muda ou ao carregar a página

  return (
    <div>
      <div className="flex items-center gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, autor ou categoria"
          className="flex-1 bg-[#061019] border border-gray-800 rounded-md px-4 py-2 text-gray-200"
        />
        <button
          onClick={() => setQ("")}
          className="px-4 py-2 rounded-md bg-[#334155]"
        >
          Limpar
        </button>
      </div>

      {error && (
        <div className="text-center mt-10 text-red-400">Erro: {error}</div>
      )}

      {loading && (
        <div className="text-center mt-10 text-gray-400">Buscando materiais...</div>
      )}

      {!loading && !error && materials.length === 0 && (
        <div className="text-center mt-10 text-gray-400">
          Nenhum material encontrado. Cadastre materiais no sistema.
        </div>
      )}

      {!loading && !error && materials.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} onOpen={() => onOpen(m)} />
          ))}
        </div>
      )}
    </div>
  );
}
