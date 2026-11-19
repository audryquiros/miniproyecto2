import { chunkText } from "./chunking.service.js";

export function documentMetadata(text) {
  return {
    version: text.match(/versi[oó]n\s*[:：]?\s*([a-z0-9][a-z0-9._-]{0,39})/i)?.[1] || "no declarada",
    effectiveDate: text.match(/vigencia\s*[:：]?\s*(\d{4}-\d{2}-\d{2})/i)?.[1] || null,
  };
}

export function prepareDocument(document) {
  const sections = document.text
    .split(/\n(?=\s*\d+\.\s+[^\n]+\n)/)
    .filter((part) => part.trim());
  const chunks = sections.flatMap((part) =>
    // Fragmentos cortos evitan truncar el contenido al generar embeddings locales.
    chunkText(part, 90, 20).map((text) => ({
      text,
      section:
        part.match(/^\s*\d+\.\s*([^\n]+)/)?.[1]?.trim() ||
        document.section ||
        "Información general",
    })),
  );

  return chunks.map((chunk, index) => ({
    document_id: document.id,
    document_name: document.name,
    section: chunk.section,
    version: document.version || "1.0",
    effective_date: document.effectiveDate || null,
    drive_file_id: document.driveFileId || null,
    drive_url: document.driveUrl || null,
    chunk_index: index,
    chunk_text: chunk.text,
  }));
}
