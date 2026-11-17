const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function generatePolicyAnswer(message, context) {
  const provider = process.env.LLM_PROVIDER || "groq";

  if (provider === "mock") {
    return `Modo de prueba. Consulta: "${message}". Contexto recuperado: ${context.length} fragmentos.`;
  }

  if (provider !== "groq") {
    throw new Error(`Proveedor LLM no implementado: ${provider}`);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no está configurada.");

  const contextText = context
    .map((item, index) => `[Fuente ${index + 1}] ${item.document_name} — ${item.section}\n${item.chunk_text}`)
    .join("\n\n");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Eres el agente de políticas de RR. HH. de Nuvexa. Responde únicamente con la evidencia proporcionada. No inventes reglas. Si la evidencia no alcanza para responder, dilo claramente y recomienda consultar a RR. HH. Mantén la respuesta breve y clara."
        },
        {
          role: "user",
          content: `Pregunta: ${message}\n\nContexto recuperado:\n${contextText}`
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Error del LLM: ${data?.error?.message || response.statusText}`);
  }

  return data.choices?.[0]?.message?.content?.trim() ||
    "No fue posible generar una respuesta con la evidencia recuperada.";
}
