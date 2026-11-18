import { readdir, readFile } from "node:fs/promises";
import { pool } from "../src/config/database.js";
import { prepareDocument } from "../src/services/rag/ingestion.service.js";
import { createEmbedding } from "../src/services/embeddings/embedding.service.js";
if (
  process.env.EMBEDDING_PROVIDER !== "mock" ||
  process.env.LLM_PROVIDER !== "mock"
)
  throw new Error(
    "La carga local es exclusiva de la demostración (ambos proveedores deben ser mock).",
  );
const folder = new URL("../../docs/politicas/", import.meta.url);
const c = await pool.getConnection();
try {
  for (const name of (await readdir(folder)).filter((name) =>
    name.endsWith(".txt"),
  )) {
    const text = await readFile(new URL(name, folder), "utf8");
    const [[existing]] = await c.execute(
      "SELECT id FROM policy_documents WHERE document_name=? AND drive_file_id IS NULL",
      [name],
    );
    await c.beginTransaction();
    let id = existing?.id;
    if (!id) {
      const [result] = await c.execute(
        "INSERT INTO policy_documents(document_name,version,effective_date) VALUES (?, 'demo-1.0', '2026-11-18')",
        [name],
      );
      id = result.insertId;
    }
    const chunks = prepareDocument({
      id,
      name,
      text,
      version: "demo-1.0",
      effectiveDate: "2026-11-18",
    });
    await c.execute("DELETE FROM policy_chunks WHERE document_id=?", [id]);
    for (const chunk of chunks)
      await c.execute(
        "INSERT INTO policy_chunks(document_id,document_name,section,version,effective_date,drive_url,chunk_index,chunk_text,embedding) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          id,
          name,
          chunk.section,
          chunk.version,
          chunk.effective_date,
          `/api/policies/${id}`,
          chunk.chunk_index,
          chunk.chunk_text,
          JSON.stringify(await createEmbedding(chunk.chunk_text)),
        ],
      );
    await c.commit();
  }
  console.log(
    "Diez políticas locales indexadas para demostración. Los documentos de Drive se conservan.",
  );
} catch (error) {
  await c.rollback();
  throw error;
} finally {
  c.release();
  await pool.end();
}
