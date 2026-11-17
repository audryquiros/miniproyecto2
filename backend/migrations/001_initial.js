import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

await connection.execute(`
  CREATE TABLE IF NOT EXISTS policy_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_file_id VARCHAR(255) UNIQUE,
    document_name VARCHAR(500) NOT NULL,
    version VARCHAR(50) NOT NULL,
    effective_date DATE,
    drive_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

await connection.execute(`
  CREATE TABLE IF NOT EXISTS policy_chunks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    document_name VARCHAR(500) NOT NULL,
    section VARCHAR(500),
    version VARCHAR(50) NOT NULL,
    effective_date DATE,
    drive_file_id VARCHAR(255),
    drive_url TEXT,
    chunk_index INT NOT NULL,
    chunk_text LONGTEXT NOT NULL,
    embedding JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_policy_document
      FOREIGN KEY (document_id) REFERENCES policy_documents(id)
      ON DELETE CASCADE
  )
`);

await connection.execute(`
  CREATE INDEX policy_chunks_document_idx
  ON policy_chunks(document_id)
`);

console.log("Migración inicial MySQL ejecutada.");
await connection.end();
