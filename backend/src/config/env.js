import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  ragMode: process.env.RAG_MODE || "semantic",
  embeddingProvider: process.env.EMBEDDING_PROVIDER || "local",
  embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  embeddingDimension: Number(process.env.EMBEDDING_DIMENSION || 384),
  ragTopK: Number(process.env.RAG_TOP_K || 5),
  ragMinScore: Number(process.env.RAG_MIN_SCORE || 0.25),
  llmProvider: process.env.LLM_PROVIDER || "groq",
  llmModel: process.env.LLM_MODEL || "openai/gpt-oss-20b"
};
