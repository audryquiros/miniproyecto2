import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  ragMode: process.env.RAG_MODE || "mock",
  embeddingProvider: process.env.EMBEDDING_PROVIDER || "mock",
  embeddingDimension: Number(process.env.EMBEDDING_DIMENSION || 1536),
  ragTopK: Number(process.env.RAG_TOP_K || 5),
  llmProvider: process.env.LLM_PROVIDER || "mock"
};
