const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
import { readFile } from "node:fs/promises";
export async function callLLM(system, user) {
  if (!process.env.GROQ_API_KEY)
    throw new Error("GROQ_API_KEY no está configurada.");
  const response = await fetch(GROQ_URL, {
    method: "POST",
    signal: AbortSignal.timeout(6500),
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "openai/gpt-oss-20b",
      ...((process.env.LLM_MODEL || "openai/gpt-oss-20b").startsWith("openai/gpt-oss-")
        ? { reasoning_effort: "low" } : {}),
      max_completion_tokens: 2048,
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
  return (await response.json()).choices?.[0]?.message?.content?.trim() || "";
}
export async function generateGroundedAnswer(message, context) {
  if (process.env.LLM_PROVIDER === "mock")
    return {
      answer: context
        .map((r, i) => `${r.chunk_text.slice(0, 650)} [Fuente ${i + 1}]`)
        .join("\n\n"),
      sourceIds: context.map((_, i) => i + 1),
      sufficient: true,
    };
  const prompt = await readFile(
    new URL("../../../prompts/policy.txt", import.meta.url),
    "utf8",
  );
  const raw = await callLLM(
    prompt,
    JSON.stringify({
      pregunta: message,
      fuentes: context.map((r, i) => ({
        id: i + 1,
        documento: r.document_name,
        seccion: r.section,
        texto: r.chunk_text,
      })),
    }),
  );
  try {
    const result = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    const ids = [...new Set(result.sourceIds)].filter(
      (i) => Number.isInteger(i) && i > 0 && i <= context.length,
    );
    const mentioned = [
      ...String(result.answer).matchAll(/\[Fuente (\d+)\]/g),
    ].map((m) => +m[1]);
    if (
      result.sufficient !== true ||
      !ids.length ||
      !mentioned.length ||
      mentioned.some((i) => !ids.includes(i))
    )
      return null;
    return {
      answer: String(result.answer),
      sourceIds: ids.filter((id) => mentioned.includes(id)),
      sufficient: true,
    };
  } catch {
    return null;
  }
}

// Mantiene el contrato original sin duplicar el proveedor ni omitir la validación de citas.
export async function generatePolicyAnswer(message, context) {
  const result = await generateGroundedAnswer(message, context);
  return (
    result?.answer || "No hay evidencia documental suficiente. Consulta a RRHH."
  );
}
