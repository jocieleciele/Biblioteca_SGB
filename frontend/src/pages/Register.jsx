// frontend/src/pages/Register.jsx
import React, { useState } from "react";
import { register } from "../services/api.js";

export default function Register({ onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validações
    if (!name || !email || !password) {
      return setError("Preencha todos os campos");
    }
    if (password !== confirm) {
      return setError("Senhas não conferem");
    }
    if (password.length < 6) {
      return setError("A senha deve ter pelo menos 6 caracteres");
    }
    
    try {
      setLoading(true);
      const data = await register(name, email, password);
      if (data.user) {
        onSuccess && onSuccess(data.user);
      } else {
        setError("Erro ao processar registro");
      }
    } catch (err) {
      console.error("Erro no registro:", err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          "Erro ao cadastrar. Verifique se o servidor está rodando.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-panel rounded-md p-6 shadow">
      <h2 className="text-xl font-semibold mb-3">Registrar</h2>
      <form onSubmit={handle} className="space-y-3">
        <div>
          <label className="text-sm text-gray-300">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md bg-[#061019] border border-gray-800 text-gray-200"
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md bg-[#061019] border border-gray-800 text-gray-200"
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md bg-[#061019] border border-gray-800 text-gray-200"
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">Confirmar Senha</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md bg-[#061019] border border-gray-800 text-gray-200"
          />
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md bg-accent text-black"
          >
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
