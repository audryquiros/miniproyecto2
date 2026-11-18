import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

let connection;
let loaded;
let building = Promise.resolve();

// MySQL conserva el catálogo transaccional del RAG existente. LanceDB mantiene
// una proyección reconstruible de sus vectores; nunca contiene datos del personal.
async function snapshot(rows) {
  const signature = createHash("sha256").update(JSON.stringify([
    process.env.EMBEDDING_MODEL, rows.map((row) => Number(row.id)).sort((a,b) => a-b),
  ])).digest("hex").slice(0, 24);
  if (loaded?.signature === signature) return loaded.table;
  const previous = building;
  building = (async () => {
    await previous.catch(() => {});
    if (loaded?.signature === signature) return loaded.table;
    if (!connection) {
      const { connect } = await import("@lancedb/lancedb");
      connection = await connect(fileURLToPath(new URL("../../../.cache/vectors/", import.meta.url)));
    }
    const records = rows.map((row) => ({
      id: Number(row.id),
      vector: Array.isArray(row.embedding) ? row.embedding : JSON.parse(row.embedding),
    }));
    const table = await connection.createTable("drive_policy_chunks", records, { mode: "overwrite" });
    loaded = { signature, table };
    return table;
  })();
  return building;
}

export async function searchVectors(vector, rows, limit) {
  if (!rows.length) return [];
  const compatible = rows.filter((row) => {
    const embedding = Array.isArray(row.embedding) ? row.embedding : JSON.parse(row.embedding);
    return embedding.length === vector.length;
  });
  if (compatible.length !== rows.length)
    throw new Error("El índice usa otro modelo de embeddings. Sincroniza Drive antes de consultar.");
  const table = await snapshot(compatible);
  const matches = await table.vectorSearch(vector).distanceType("cosine").limit(limit).toArray();
  const current = new Map(rows.map((row) => [Number(row.id), row]));
  return matches.flatMap((match) => current.has(Number(match.id))
    ? [{ ...current.get(Number(match.id)), score: 1 - Number(match._distance) }] : []);
}
