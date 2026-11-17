const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export async function createEmbedding(text) {
  const provider = process.env.EMBEDDING_PROVIDER || "openai";

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY no está configurada para embeddings.");
    }

    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        input: text,
        dimensions: Number(process.env.EMBEDDING_DIMENSION || 1536)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Error de embeddings: ${data?.error?.message || response.statusText}`);
    }

    return data.data[0].embedding;
  }

  if (provider === "mock") {
    return Array(Number(process.env.EMBEDDING_DIMENSION || 1536)).fill(0);
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
