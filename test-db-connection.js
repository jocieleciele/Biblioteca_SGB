// Script para testar conexão com o banco de dados
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

console.log("Tentando conectar ao banco de dados...");
console.log("Configuração:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? "***" : "NÃO DEFINIDA"
});

pool.query("SELECT NOW()")
  .then((result) => {
    console.log("Conexão bem-sucedida!");
    console.log("Data/Hora do servidor:", result.rows[0].now);
    
    // Testar se a tabela materials existe
    return pool.query("SELECT COUNT(*) FROM materials");
  })
  .then((result) => {
    console.log("Tabela 'materials' existe!");
    console.log("Total de materiais:", result.rows[0].count);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro na conexão:", err.message);
    console.error("Código do erro:", err.code);
    console.error("Detalhes:", err);
    process.exit(1);
  });

