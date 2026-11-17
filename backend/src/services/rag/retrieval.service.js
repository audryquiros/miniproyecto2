import { env } from "../../config/env.js";
import { query } from "../../config/database.js";
import { createEmbedding, cosineSimilarity } from "../embeddings/embedding.service.js";

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
  `);

  if (!result.rows.length) return [];

  const queryEmbedding = await createEmbedding(message);

  const ranked = result.rows
    .map((row) => ({
      ...row,
      score: cosineSimilarity(queryEmbedding, parseEmbedding(row.embedding))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, env.ragTopK);

  return ranked.filter((item) => item.score >= env.ragMinScore);
}

function parseEmbedding(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return JSON.parse(value);
  if (value && typeof value === "object") return Object.values(value);
  return [];
}
