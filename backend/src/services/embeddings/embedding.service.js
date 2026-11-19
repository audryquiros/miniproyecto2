import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { requestVoyage } from "./voyage.client.js";
import { voyageSettings, createVoyageRequester } from "./voyage.client.js";
const requestVoyageQuery = createVoyageRequester();
const queryCache = new Map();

let extractorPromise;
async function localEmbedding(text) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = fileURLToPath(
        new URL("../../../.cache/models/", import.meta.url),
      );
      return pipeline(
        "feature-extraction",
        process.env.EMBEDDING_MODEL ||
          "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
        { dtype: "q8", device: "cpu" },
      );
    })().catch((error) => {
      extractorPromise = undefined;
      throw error;
    });
  }
  const extractor = await extractorPromise;
  const output = await extractor(text, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data);
  if (
    vector.length !== Number(process.env.EMBEDDING_DIMENSION || 384) ||
    vector.some((value) => !Number.isFinite(value))
  )
    throw new Error(
      "El modelo local produjo un vector incompatible con el índice.",
    );
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
        : /[dlrnz]es$/.test(word)
          ? word.slice(0, -2)
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

export function embeddingConfig() {
  const provider = process.env.EMBEDDING_PROVIDER || "local";
  const voyage = provider === "voyage";
  const model = voyage
    ? process.env.VOYAGE_MODEL || "voyage-3.5-lite"
    : process.env.EMBEDDING_MODEL ||
      "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
  const dimension = Number(
    voyage
      ? process.env.VOYAGE_DIMENSION || 1024
      : process.env.EMBEDDING_DIMENSION || 384,
  );
  return {
    provider,
    model,
    dimension,
    signature: `${provider}:${model}:${dimension}:v2`,
  };
}

export async function createEmbeddings(texts, inputType = "document") {
  if (!Array.isArray(texts) || !texts.length) return [];
  const config = embeddingConfig();
  if (config.provider !== "voyage")
    return Promise.all(texts.map((text) => createEmbedding(text, inputType)));
  if (!process.env.VOYAGE_API_KEY)
    throw new Error("Configura VOYAGE_API_KEY en backend/.env.");
  if (!["document", "query"].includes(inputType))
    throw new Error("Tipo de embedding inválido.");
  const settings = voyageSettings();
  const requester = inputType === "query" ? requestVoyageQuery : requestVoyage;
  const response = await requester(
    "https://api.voyageai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts,
        model: config.model,
        input_type: inputType,
        output_dimension: config.dimension,
        truncation: false,
      }),
    },
    inputType === "query"
      ? {
          ...settings,
          minIntervalMs: Number(process.env.VOYAGE_QUERY_INTERVAL_MS ?? 0),
          maxRetries: 0,
          maxRetryWaitMs: 500,
          timeoutMs: 3500,
        }
      : settings,
  );
  const payload = await response.json();
  const vectors = payload.data
    ?.sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
  if (
    vectors?.length !== texts.length ||
    vectors.some(
      (v) =>
        !Array.isArray(v) ||
        v.length !== config.dimension ||
        v.some((x) => !Number.isFinite(x)),
    )
  )
    throw new Error("Voyage devolvió embeddings incompatibles.");
  return vectors;
}

export async function createEmbedding(text, inputType = "document") {
  const provider = process.env.EMBEDDING_PROVIDER || "local";

  if (provider === "voyage") {
    if (inputType !== "query")
      return (await createEmbeddings([text], inputType))[0];
    const key = createHash("sha256")
      .update(embeddingConfig().signature + text.normalize("NFC").trim())
      .digest("hex");
    const cached = queryCache.get(key);
    if (cached && cached.expires > Date.now())
      return [...(await cached.vector)];
    const vector = createEmbeddings([text], "query").then((v) => v[0]);
    queryCache.set(key, { vector, expires: Date.now() + 30 * 60 * 1000 });
    if (queryCache.size > 256)
      queryCache.delete(queryCache.keys().next().value);
    try {
      return [...(await vector)];
    } catch (error) {
      queryCache.delete(key);
      throw error;
    }
  }

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
