import { env } from "../../config/env.js";
import { query } from "../../config/database.js";

export async function retrieve(message) {
  if (env.ragMode === "mock") {
    return [
      {
        document_name: "Políticas de RR. HH. de Nuvexa",
        section: "Modo de prueba",
        version: "1.0",
        drive_url: null,
        chunk_text:
          "El sistema está funcionando en modo mock. Para respuestas reales se deben ingerir las políticas y habilitar embeddings."
      }
    ];
  }

  // El embedding queda desacoplado del agente para poder conectar
  // el proveedor/vectorización seleccionado sin cambiar el resto del flujo.
  await createQueryEmbedding(message);

  // Base inicial en MySQL. La estrategia de ranking semántico
  // se mantiene aislada en este servicio.
  const result = await query(
    `
      SELECT
        document_name,
        section,
        version,
        drive_url,
        chunk_text
      FROM policy_chunks
      ORDER BY id DESC
      LIMIT ?
    `,
    [env.ragTopK]
  );

  return result.rows;
}

async function createQueryEmbedding(_message) {
  if (env.embeddingProvider === "mock") {
    return Array(env.embeddingDimension).fill(0);
  }

  throw new Error("Proveedor de embeddings no configurado.");
}
