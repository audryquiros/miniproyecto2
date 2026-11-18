import { pool } from "../src/config/database.js";
import { statements } from "../migrations/002_personnel.js";
const connection = await pool.getConnection();
try {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, aplicada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
  );
  const [applied] = await connection.query(
    "SELECT version FROM schema_migrations",
  );
  const versions = new Set(applied.map((row) => row.version));
  if (!versions.has("001_initial")) {
    // Preserve the original RAG schema; reuse its CREATE statements without its standalone connection.
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("../migrations/001_initial.js", import.meta.url),
      "utf8",
    );
    for (const match of source.matchAll(
      /connection\.execute\(`([\s\S]*?)`\)/g,
    )) {
      if (match[1].includes("CREATE INDEX")) {
        const [indexes] = await connection.query(
          "SHOW INDEX FROM policy_chunks WHERE Key_name = 'policy_chunks_document_idx'",
        );
        if (indexes.length) continue;
      }
      await connection.query(match[1]);
    }
    await connection.execute(
      "INSERT INTO schema_migrations(version) VALUES (?)",
      ["001_initial"],
    );
  }
  if (!versions.has("002_personnel")) {
    for (const sql of statements) await connection.query(sql);
    await connection.execute(
      "INSERT INTO schema_migrations(version) VALUES (?)",
      ["002_personnel"],
    );
  }
  console.log(
    "Migraciones completas: RAG conservado y esquema de personal disponible.",
  );
  if (!versions.has("003_drive_metadata")) {
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM policy_documents LIKE 'source_revision'",
    );
    if (!columns.length)
      await connection.query(
        "ALTER TABLE policy_documents ADD source_revision VARCHAR(255)",
      );
    await connection.execute(
      "INSERT INTO schema_migrations(version) VALUES (?)",
      ["003_drive_metadata"],
    );
  }
} finally {
  connection.release();
  await pool.end();
}
