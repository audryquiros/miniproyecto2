import "dotenv/config";
import {
  createEmbedding,
  cosineSimilarity,
} from "../src/services/embeddings/embedding.service.js";
console.log("Preparando el proveedor de embeddings configurado.");
const a = await createEmbedding("vacaciones anuales remuneradas", "document");
const b = await createEmbedding("descanso laboral pagado cada año", "query");
console.log(
  JSON.stringify({ dimension: a.length, similitud: cosineSimilarity(a, b) }),
);
