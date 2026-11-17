export async function createEmbedding(text) {
  const provider = process.env.EMBEDDING_PROVIDER || "mock";
  const dimension = Number(process.env.EMBEDDING_DIMENSION || 1536);

  if (provider === "mock") {
    return Array(dimension).fill(0);
  }

  throw new Error(`Proveedor de embeddings no implementado: ${provider}`);
}
