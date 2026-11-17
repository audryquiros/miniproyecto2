import { listPolicyFiles, downloadPolicyFile } from "./drive.service.js";
import { extractText } from "./document.parser.js";
import { prepareDocument } from "../rag/ingestion.service.js";
import { createEmbedding } from "../embeddings/embedding.service.js";
import { query } from "../../config/database.js";

export async function syncPoliciesFromDrive() {
  const files = await listPolicyFiles();
  const results = [];

  for (const file of files) {
    const downloaded = await downloadPolicyFile(file);
    const text = await extractText(downloaded.buffer, downloaded.mimeType);

    if (!text.trim()) {
      results.push({
        fileId: file.id,
        name: file.name,
        status: "skipped",
        reason: "Documento sin texto."
      });
      continue;
    }

    const chunks = prepareDocument({
      id: file.id,
      name: file.name,
      version: "1.0",
      driveFileId: file.id,
      driveUrl: file.webViewLink,
      text
    });

    await query(
      `INSERT INTO policy_documents
        (drive_file_id, document_name, version, drive_url)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        document_name = VALUES(document_name),
        drive_url = VALUES(drive_url),
        updated_at = CURRENT_TIMESTAMP`,
      [file.id, file.name, "1.0", file.webViewLink || null]
    );

    const documentResult = await query(
      `SELECT id FROM policy_documents WHERE drive_file_id = ?`,
      [file.id]
    );
    const documentId = documentResult.rows[0].id;

    await query(`DELETE FROM policy_chunks WHERE document_id = ?`, [documentId]);

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk.chunk_text);

      await query(
        `INSERT INTO policy_chunks
          (document_id, document_name, section, version, drive_file_id,
           drive_url, chunk_index, chunk_text, embedding)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          chunk.document_name,
          chunk.section,
          chunk.version,
          chunk.drive_file_id,
          chunk.drive_url,
          chunk.chunk_index,
          chunk.chunk_text,
          JSON.stringify(embedding)
        ]
      );
    }

    results.push({
      fileId: file.id,
      name: file.name,
      status: "ingested",
      chunks: chunks.length
    });
  }

  return {
    totalFiles: files.length,
    results
  };
}
