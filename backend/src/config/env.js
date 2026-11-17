import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  ragMode: process.env.RAG_MODE || "semantic",
  embeddingProvider: process.env.EMBEDDING_PROVIDER || "openai",
  embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  embeddingDimension: Number(process.env.EMBEDDING_DIMENSION || 1536),
  ragTopK: Number(process.env.RAG_TOP_K || 5),
  ragMinScore: Number(process.env.RAG_MIN_SCORE || 0.25),
  llmProvider: process.env.LLM_PROVIDER || "groq",
  llmModel: process.env.LLM_MODEL || "llama-3.3-70b-versatile"
};
