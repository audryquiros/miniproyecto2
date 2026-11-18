import 'dotenv/config';
import { createEmbedding, cosineSimilarity } from '../src/services/embeddings/embedding.service.js';
if (process.env.EMBEDDING_PROVIDER !== 'local') {
  process.env.EMBEDDING_PROVIDER = 'local';
  process.env.EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
  process.env.EMBEDDING_DIMENSION = '384';
}
console.log('Preparando el buscador local (la primera descarga puede tardar).');
const a = await createEmbedding('vacaciones anuales remuneradas');
const b = await createEmbedding('descanso laboral pagado cada año');
console.log(JSON.stringify({ dimension: a.length, similitud: cosineSimilarity(a,b) }));
