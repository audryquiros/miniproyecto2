import { retrieve } from "../rag/retrieval.service.js";
import { generateGroundedAnswer } from "../rag/llm.service.js";

export async function policyAgent(message) {
  const context = await retrieve(message);

  const result = context.length
    ? await generateGroundedAnswer(message, context)
    : null;
  if (!result) {
    return {
      answer:
        "No encontré información suficiente en las políticas disponibles para responder con seguridad. La consulta debe ser revisada por RR. HH.",
      citations: [],
      resolved: false,
      escalated: true,
      fragmentIds: [],
    };
  }

  const answer = result.answer;
  const used = result.sourceIds.map((id) => context[id - 1]);

  const citations = used.map((item, index) => ({
    sourceId: result.sourceIds[index],
    document: item.document_name,
    section: item.section,
    version: item.version,
    url: item.drive_url || null,
  }));

  return {
    answer,
    citations,
    resolved: true,
    escalated: false,
    fragmentIds: used.map((item) => item.id),
  };
}
