// Script para testar conexão com o banco de dados
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

console.log("=== Teste de Conexão com Banco de Dados ===");
console.log("\nConfiguração:");
console.log("  Host:", process.env.DB_HOST || "NÃO DEFINIDO");
console.log("  Porta:", process.env.DB_PORT || "NÃO DEFINIDO");
console.log("  Database:", process.env.DB_NAME || "NÃO DEFINIDO");
console.log("  User:", process.env.DB_USER || "NÃO DEFINIDO");
console.log("  Password:", process.env.DB_PASSWORD ? "***DEFINIDA***" : "NÃO DEFINIDA");

console.log("\nTentando conectar...");

pool.query("SELECT NOW()")
  .then((result) => {
    console.log("✅ Conexão bem-sucedida!");
    console.log("Data/Hora do servidor:", result.rows[0].now);
    
    // Testar se a tabela materials existe
    return pool.query("SELECT COUNT(*) as count FROM materials");
  })
  .then((result) => {
    console.log("✅ Tabela 'materials' existe!");
    console.log("Total de materiais:", result.rows[0].count);
    
    // Listar todas as tabelas
    return pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
  })
  .then((result) => {
    console.log("\n✅ Tabelas encontradas:");
    result.rows.forEach(row => {
      console.log("  -", row.table_name);
    });
    
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ ERRO na conexão:");
    console.error("  Mensagem:", err.message);
    console.error("  Código:", err.code);
    if (err.code === 'ECONNREFUSED') {
      console.error("\n💡 O PostgreSQL não está rodando ou a porta está incorreta.");
    } else if (err.code === '3D000') {
      console.error("\n💡 O banco de dados não existe. Execute: CREATE DATABASE sgbiblioteca2;");
    } else if (err.code === '28P01') {
      console.error("\n💡 Senha ou usuário incorreto. Verifique o arquivo .env");
    } else if (err.code === '42P01') {
      console.error("\n💡 Tabela não existe. Execute o script criar_tabelas.sql");
    }
    console.error("\nDetalhes completos:", err);
    pool.end();
    process.exit(1);
  });

