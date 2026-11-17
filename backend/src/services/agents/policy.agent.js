import { retrieve } from "../rag/retrieval.service.js";
import { generatePolicyAnswer } from "../rag/llm.service.js";

export async function policyAgent(message) {
  const context = await retrieve(message);

  if (!context.length) {
    return {
      answer:
        "No encontré información suficiente en las políticas disponibles para responder con seguridad. La consulta debe ser revisada por RR. HH.",
      citations: []
    };
  }

  const answer = await generatePolicyAnswer(message, context);

  const citations = context.map(item => ({
    document: item.document_name,
    section: item.section,
    version: item.version,
    url: item.drive_url || null
  }));

  return {
    answer,
    citations
  };
}
