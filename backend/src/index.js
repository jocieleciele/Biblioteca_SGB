import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import materialsRoutes from "./routes/materials.js";
import emprestimosRoutes from "./routes/emprestimos.js";
import reservasRoutes from "./routes/reservas.js";
import multasRoutes from "./routes/multas.js";
import pagamentosRoutes from "./routes/pagamentos.js";
import recomendacoesRoutes from "./routes/recomendacoes.js";
import uploadRoutes from "./routes/upload.js";
import pool from "../db/index.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Middleware para injetar o pool de conexão em cada requisição
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Rotas principais
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/emprestimos", emprestimosRoutes);
app.use("/api/reservas", reservasRoutes);
app.use("/api/multas", multasRoutes);
app.use("/api/pagamentos", pagamentosRoutes);
app.use("/api/recomendacoes", recomendacoesRoutes);
app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Testa a conexão com o banco de dados antes de iniciar o servidor
    await pool.query("SELECT NOW()");
    console.log("Conectado ao banco de dados PostgreSQL.");

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error.message);
    process.exit(1); // Encerra a aplicação se não conseguir conectar ao DB
  }
};

startServer();
