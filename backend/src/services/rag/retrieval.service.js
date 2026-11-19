import { env } from "../../config/env.js";
import { query } from "../../config/database.js";
import { searchVectors } from "./vector-store.service.js";
import { normalize } from "../agents/intent.js";
import {
  createEmbedding,
  embeddingConfig,
  mockTerms,
} from "../embeddings/embedding.service.js";

export function rankDemo(message, rows) {
  const terms = [...new Set(mockTerms(message))];
  const corpus = rows
    .map((row) => ({
      ...row,
      tokens: mockTerms(row.chunk_text),
      titleTokens: mockTerms(
        row.document_name.replace(/_/g, " ") + " " + row.section,
      ),
    }))
    .filter(
      (row) => row.section !== "Información general" || row.tokens.length >= 15,
    );
  const known = terms.filter((term) =>
    corpus.some(
      (row) => row.tokens.includes(term) || row.titleTokens.includes(term),
    ),
  );
  if (!known.length) return [];
  return corpus
    .map((row) => {
      const matches = known.filter((term) => row.tokens.includes(term)).length;
      const title = known.filter((term) =>
        row.titleTokens.includes(term),
      ).length;
      const density =
        row.tokens.filter((term) => known.includes(term)).length /
        Math.max(1, row.tokens.length);
      return {
        ...row,
        score:
          (matches / known.length) * 0.7 +
          (title / known.length) * 0.2 +
          Math.min(0.1, density),
      };
    })
    .filter((row) => row.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

export async function retrieve(message) {
  const result = await query(
    `
    SELECT
      id,
      document_id,
      chunk_index,
      document_name,
      section,
      version,
      drive_url,
      chunk_text,
      embedding
    FROM policy_chunks
    WHERE embedding IS NOT NULL
      AND ${process.env.EMBEDDING_PROVIDER === "mock" ? "drive_file_id IS NULL" : "drive_file_id IS NOT NULL AND document_id IN (SELECT id FROM policy_documents WHERE embedding_signature=?)"}
  `,
    process.env.EMBEDDING_PROVIDER === "mock"
      ? []
      : [embeddingConfig().signature],
  );

  if (!result.rows.length) return [];
  if (process.env.EMBEDDING_PROVIDER === "mock")
    return rankDemo(message, result.rows);

  // Normalizar expresiones laborales antes de la búsqueda evita que una cifra
  // compartida (p. ej. cinco días) acerque incapacidad a un permiso de duelo.
  const expanded = normalize(message)
    .replace(/incapacitaron|incapacitado|incapacitar/g, "incapacidad")
    .replace(/trabajar desde casa/g, "teletrabajo")
    .replace(/horas extra/g, "jornada horas extra")
    .replace(
      /pasar.*(?:otro|siguiente|proximo) ano/g,
      "acumulación de vacaciones",
    )
    .replace(/aprueba|aprobacion/g, "aprobación jefatura")
    .replace(/tarda/g, "plazo de respuesta");
  const queryEmbedding = await createEmbedding(expanded, "query");

  const ranked = await searchVectors(
    queryEmbedding,
    result.rows,
    result.rows.length,
  );
  return selectPolicyContext(expanded, ranked, result.rows);
}

export function selectPolicyContext(message, ranked, rows) {
  const terms = mockTerms(message);
  const documents = new Map();
  for (const row of ranked) {
    // Matrices de investigación y borradores no son políticas aprobadas.
    if (
      /readme|marco[_ ]juridico|revision|borrador/i.test(
        normalize(row.document_name),
      )
    )
      continue;
    const title = mockTerms(row.document_name.replace(/_/g, " "));
    const lexical = terms.some((term) => title.includes(term)) ? 0.2 : 0;
    const score = row.score + lexical;
    if (
      row.score >= env.ragMinScore &&
      (!documents.has(row.document_id) ||
        documents.get(row.document_id).score < score)
    )
      documents.set(row.document_id, { id: row.document_id, score });
  }
  const selected = [...documents.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  const seen = new Set();
  const context = [];
  let words = 0;
  for (const doc of selected) {
    if (doc !== selected[0] && doc.score < selected[0].score * 0.9) continue;
    // Se recupera el contexto vecino del mismo documento, no se pierde la
    // excepción o condición situada en otra sección de una política breve.
    const sections = rows
      .filter((r) => r.document_id === doc.id)
      .sort((a, b) => a.chunk_index - b.chunk_index);
    for (const item of sections) {
      const text = item.chunk_text.replace(/\s+/g, " ").trim();
      if (seen.has(text) || text.split(/\s+/).length < 8) continue;
      if (words + text.split(/\s+/).length > 1400) continue;
      seen.add(text);
      words += text.split(/\s+/).length;
      context.push({ ...item, score: doc.score });
    }
  }
  return context;
}
