import { env } from "../../config/env.js";
import { query } from "../../config/database.js";
import { searchVectors } from "./vector-store.service.js";
import {
  createEmbedding,
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
  const result = await query(`
    SELECT
      id,
      document_name,
      section,
      version,
      drive_url,
      chunk_text,
      embedding
    FROM policy_chunks
    WHERE embedding IS NOT NULL
      AND ${process.env.EMBEDDING_PROVIDER === "mock" ? "drive_file_id IS NULL" : "drive_file_id IS NOT NULL"}
  `);

  if (!result.rows.length) return [];
  if (process.env.EMBEDDING_PROVIDER === "mock")
    return rankDemo(message, result.rows);

  const queryEmbedding = await createEmbedding(message);

  const ranked = await searchVectors(queryEmbedding, result.rows, env.ragTopK * 4);
  const seen = new Set();
  return ranked.filter((item) => {
    const text = item.chunk_text.replace(/\s+/g, " ").trim();
    if (item.score < env.ragMinScore || seen.has(text)) return false;
    seen.add(text);
    return true;
  }).slice(0, env.ragTopK);
}
