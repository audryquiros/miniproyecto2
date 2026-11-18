import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

let extractorPromise;
async function localEmbedding(text) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = fileURLToPath(new URL("../../../.cache/models/", import.meta.url));
      return pipeline("feature-extraction",
        process.env.EMBEDDING_MODEL || "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
        { dtype: "q8", device: "cpu" });
    })().catch((error) => { extractorPromise = undefined; throw error; });
  }
  const extractor = await extractorPromise;
  const output = await extractor(text, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data);
  if (vector.length !== Number(process.env.EMBEDDING_DIMENSION || 384) ||
      vector.some((value) => !Number.isFinite(value)))
    throw new Error("El modelo local produjo un vector incompatible con el índice.");
  return vector;
}
const stopWords = new Set(
  "que cual cuales cuanto cuanta cuantos cuantas como puedo puede pueden debo debe dias dia tengo tiene tienen corresponden corresponde por para los las del una uno unos unas con hay son mis sus tus nuestro nuestra empresa nuvexa este esta estos estas ano anos sobre desde cada cuando quien donde dar hace hacer queda quedan disponible disponibles trabajar semana semanas recibo solicito solicitar quiero saber todos todas".split(
    " ",
  ),
);
export function mockTerms(text) {
  const normal = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(?:trabajar|trabajo) desde casa/g, "teletrabajo");
  return (normal.match(/[a-z]{3,}/g) || [])
    .filter((word) => !stopWords.has(word))
    .map((word) =>
      word === "vacaciones"
        ? "vacacion"
        : word.length > 5 && word.endsWith("s")
          ? word.slice(0, -1)
          : word,
    );
}
export function mockEmbedding(
  text,
  dimension = Number(process.env.EMBEDDING_DIMENSION || 1536),
) {
  const vector = Array(dimension).fill(0);
  for (const word of mockTerms(text)) {
    const hash = createHash("sha256").update(word).digest();
    vector[hash.readUInt32BE(0) % dimension] += 1;
  }
  return vector;
}

export async function createEmbedding(text) {
  const provider = process.env.EMBEDDING_PROVIDER || "local";

  if (provider === "local") return localEmbedding(text);

  if (provider === "mock") {
    return mockEmbedding(text);
  }

  throw new Error(`Proveedor de embeddings no implementado: ${provider}`);
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
