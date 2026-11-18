import {
  listPolicyFiles,
  downloadPolicyFile,
  readDriveChanges,
} from "./drive.service.js";
import { extractText } from "./document.parser.js";
import { prepareDocument, documentMetadata } from "../rag/ingestion.service.js";
import { createEmbedding } from "../embeddings/embedding.service.js";
import { pool } from "../../config/database.js";
import { createHash } from "node:crypto";
export async function syncPoliciesFromDrive() {
  const c = await pool.getConnection();
  let locked = false;
  try {
    const [[lock]] = await c.query("SELECT GET_LOCK('drive-sync',0) acquired");
    locked = !!lock.acquired;
    if (!locked)
      throw Object.assign(new Error("Ya hay una sincronización en curso."), {
        status: 409,
      });
    const [[state]] = await c.query(
      "SELECT page_token FROM drive_sync_state WHERE id=1",
    );
    const changes = await readDriveChanges(state?.page_token);
    const files = await listPolicyFiles();
    const results = [];
    for (const file of files) {
      const revision = createHash("sha256")
        .update(
          [
            file.modifiedTime,
            file.version,
            process.env.EMBEDDING_PROVIDER || "local",
            process.env.EMBEDDING_MODEL || "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
            process.env.EMBEDDING_DIMENSION || 384,
            "chunks-90-20-v1",
            "metadata-v2",
          ].join(":"),
        )
        .digest("hex");
      const [[existing]] = await c.execute(
        "SELECT id,source_revision FROM policy_documents WHERE drive_file_id=?",
        [file.id],
      );
      if (existing?.source_revision === revision) {
        results.push({ fileId: file.id, status: "unchanged" });
        continue;
      }
      const downloaded = await downloadPolicyFile(file);
      const text = await extractText(downloaded.buffer, downloaded.mimeType);
      if (!text.trim())
        throw new Error(
          "Un documento no tiene texto extraíble; se conserva el índice anterior.",
        );
      // La revisión técnica de Drive no es la versión aprobada de una política.
      const { version, effectiveDate } = documentMetadata(text);
      const chunks = prepareDocument({
        id: file.id,
        name: file.name,
        version,
        effectiveDate,
        driveFileId: file.id,
        driveUrl:
          file.webViewLink ||
          "https://drive.google.com/file/d/" + file.id + "/view",
        text,
      });
      // Generate every embedding before replacing a document, then replace atomically.
      const vectors = [];
      for (const chunk of chunks)
        vectors.push(await createEmbedding(chunk.chunk_text));
      await c.beginTransaction();
      await c.execute(
        "INSERT INTO policy_documents(drive_file_id,document_name,version,effective_date,drive_url,source_revision) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE document_name=VALUES(document_name),version=VALUES(version),effective_date=VALUES(effective_date),drive_url=VALUES(drive_url),source_revision=VALUES(source_revision),updated_at=CURRENT_TIMESTAMP",
        [
          file.id,
          file.name,
          version,
          effectiveDate,
          chunks[0].drive_url,
          revision,
        ],
      );
      const [[doc]] = await c.execute(
        "SELECT id FROM policy_documents WHERE drive_file_id=?",
        [file.id],
      );
      await c.execute("DELETE FROM policy_chunks WHERE document_id=?", [
        doc.id,
      ]);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await c.execute(
          "INSERT INTO policy_chunks(document_id,document_name,section,version,effective_date,drive_file_id,drive_url,chunk_index,chunk_text,embedding) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [
            doc.id,
            chunk.document_name,
            chunk.section,
            version,
            effectiveDate,
            file.id,
            chunk.drive_url,
            i,
            chunk.chunk_text,
            JSON.stringify(vectors[i]),
          ],
        );
      }
      await c.commit();
      results.push({
        fileId: file.id,
        name: file.name,
        status: "ingested",
        chunks: chunks.length,
      });
    }
    // Only reconcile deletions after a complete successful listing and processing.
    const ids = new Set(files.map((f) => f.id));
    const [stored] = await c.query(
      "SELECT id,drive_file_id FROM policy_documents WHERE drive_file_id IS NOT NULL",
    );
    for (const doc of stored)
      if (!ids.has(doc.drive_file_id)) {
        await c.execute("DELETE FROM policy_documents WHERE id=?", [doc.id]);
        results.push({ fileId: doc.drive_file_id, status: "removed" });
      }
    await c.execute(
      "INSERT INTO drive_sync_state(id,page_token,ultima_sync) VALUES (1,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE page_token=VALUES(page_token),ultima_sync=UTC_TIMESTAMP()",
      [changes.token],
    );
    return { totalFiles: files.length, results };
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    if (locked) await c.query("SELECT RELEASE_LOCK('drive-sync')");
    c.release();
  }
}
