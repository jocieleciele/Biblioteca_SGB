# Sistema de Biblioteca - SGB

Sistema completo de gerenciamento de biblioteca com backend Node.js/Express e frontend React.

## 🚀 Início Rápido

1. **Configure o PostgreSQL local** (veja `README_SETUP.md`)
2. **Instale as dependências:**
   ```bash
   npm install
   ```
3. **Configure o arquivo `.env`** em `backend/.env`
4. **Execute o script de inicialização do banco:**
   ```bash
   psql -U postgres -d sgbiblioteca2 -f backend/db/init.sql
   ```
5. **Inicie o servidor:**
   ```bash
   npm start
   ```

## 📋 Tecnologias

- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** React, Vite, TailwindCSS
- **Autenticação:** JWT
- **Notificações:** Nodemailer

## 📚 Funcionalidades

- ✅ CRUD completo de materiais e usuários
- ✅ Sistema de empréstimos e devoluções
- ✅ Reservas e renovações
- ✅ Multas e pagamentos online
- ✅ Busca avançada com palavras-chave
- ✅ Recomendações inteligentes
- ✅ Notificações por e-mail

Para mais detalhes, consulte `README_SETUP.md`.
