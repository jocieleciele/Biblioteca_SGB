import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Acervo from "./pages/Acervo";
import Detail from "./pages/Detail";
import Account from "./pages/Account";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import Painel from "./pages/Painel";
import Register from "./pages/Register";
import Admin from "./pages/Admin";

export default function App() {
  const [route, setRoute] = useState("home");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState(null);

  // Lê o user salvo no localStorage ao carregar o app
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Normalizar role ao carregar do localStorage
      if (parsedUser.role === 'Bibliotecário') {
        parsedUser.role = 'Bibliotecario';
        localStorage.setItem("user", JSON.stringify(parsedUser));
      }
      setUser(parsedUser);
    }
  }, []);

  // Função de navegação
  const go = (r, payload) => {
    setRoute(r);
    if (payload) setSelected(payload);
  };

  // Ao logar — salva token e usuário
  const handleLogin = (data) => {
    if (data?.token && data?.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    } else {
      console.warn("Login inválido, sem token/user");
    }
    setRoute("home");
  };

  //Logout — limpa storage e volta pra home
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setRoute("home");
  };

  // Busca
  const handleSearch = (livro) => {
    if (livro && typeof livro === "object" && livro.id) {
      setSelected(livro);
      setRoute("detail");
    } else if (typeof livro === "string") {
      setQuery(livro);
      setRoute("acervo");
    } else {
      setQuery("");
      setRoute("acervo");
    }
  };

  return (
    <div className="min-h-screen bg-darkbg text-white font-inter">
      <Header
        onNavigate={go}
        user={user}
        onLogout={handleLogout}
        onShowLogin={() => setRoute("login")}
      />

      <main className="max-w-7xl mx-auto p-6">
        {route === "home" && (
          <Home
            user={user}
            onSearch={(q) => {
              setQuery(q);
              go("acervo");
            }}
            onNavigate={go}
          />
        )}
        {route === "acervo" && (
          <Acervo query={query} onOpen={(m) => go("detail", m)} />
        )}
        {route === "detail" && selected && (
          <Detail material={selected} onBack={() => go("acervo")} user={user} onNavigate={go} />
        )}
        {route === "account" && <Account user={user} onNavigate={go} />}
        {route === "login" && (
          <Login
            onLogin={handleLogin}
            onCancel={() => setRoute("home")}
            onGoToRegister={() => go("register")}
          />
        )}
        {route === "register" && (
          <Register
            onSuccess={() => go("login")}
            onCancel={() => go("login")}
          />
        )}

        {/* Páginas protegidas */}
        {route === "perfil" &&
          (user && user.role === "Leitor" ? (
            <Perfil user={user} />
          ) : (
            <div className="text-red-400">Acesso negado.</div>
          ))}

        {route === "painel" &&
          (user ? (
            (() => {
              // Normalizar role para verificação
              const userRole = user.role === 'Bibliotecário' ? 'Bibliotecario' : user.role;
              if (userRole === "Administrador" || userRole === "Bibliotecario") {
                return <Painel user={user} />;
              } else {
                return <div className="text-red-400">Acesso negado. Apenas Bibliotecarios e Administradores podem acessar.</div>;
              }
            })()
          ) : (
            <div className="text-red-400">Você precisa estar logado para acessar o painel.</div>
          ))}

        {route === "admin" &&
          (user && user.role === "Administrador" ? (
            <Admin user={user} />
          ) : (
            <div className="text-center py-10 text-red-400 bg-[#0a0a0a] rounded-xl border border-red-800/30">
              <p>Acesso negado. Apenas administradores podem acessar esta página.</p>
            </div>
          ))}
      </main>

      <Footer />
    </div>
  );
}
