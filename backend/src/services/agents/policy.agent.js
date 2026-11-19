import { retrieve } from "../rag/retrieval.service.js";
import { generateGroundedAnswer } from "../rag/llm.service.js";
import { assessResolution } from "./resolution.service.js";

export async function policyAgent(message) {
  const context = await retrieve(message);

  let result;
  try {
    result = context.length
      ? await generateGroundedAnswer(message, context)
      : null;
  } catch (error) {
    if (!error.code?.startsWith("LLM_")) throw error;
    console.error({
      code: error.code,
      providerStatus: error.providerStatus,
      providerCode: error.providerCode,
    });
    return {
      answer:
        "El servicio de respuestas está temporalmente ocupado o no disponible. Intenta de nuevo en unos minutos o solicita ayuda a RRHH.",
      citations: [],
      resolved: false,
      escalated: true,
      fragmentIds: [],
      unavailable: true,
    };
  }
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
  const resolved = await assessResolution(message, result);
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
    resolved,
    escalated: !resolved,
    fragmentIds: used.map((item) => item.id),
  };
}
