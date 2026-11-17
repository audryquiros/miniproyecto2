import { chunkText } from "./chunking.service.js";

export function prepareDocument(document) {
  const chunks = chunkText(document.text);

  return chunks.map((chunk, index) => ({
    document_id: document.id,
    document_name: document.name,
    section: document.section || "General",
    version: document.version || "1.0",
    effective_date: document.effectiveDate || null,
    drive_file_id: document.driveFileId || null,
    drive_url: document.driveUrl || null,
    chunk_index: index,
    chunk_text: chunk
  }));
}
