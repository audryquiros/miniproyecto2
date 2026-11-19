const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
import { readFile } from "node:fs/promises";
export async function callLLM(
  system,
  user,
  { json = false, maxTokens = 1200 } = {},
) {
  if (!process.env.GROQ_API_KEY)
    throw new Error("GROQ_API_KEY no está configurada.");
  const signal = AbortSignal.timeout(7000);
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await fetch(GROQ_URL, {
        method: "POST",
        signal,
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "openai/gpt-oss-20b",
          ...((process.env.LLM_MODEL || "openai/gpt-oss-20b").startsWith(
            "openai/gpt-oss-",
          )
            ? { reasoning_effort: "low" }
            : {}),
          max_completion_tokens: maxTokens,
          ...(json ? { response_format: { type: "json_object" } } : {}),
          temperature: 0,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
    } catch (cause) {
      throw Object.assign(
        new Error("El proveedor de lenguaje no está disponible.", { cause }),
        { code: "LLM_NETWORK", status: 503 },
      );
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const retry = Math.max(
        100,
        Number(response.headers.get("retry-after") || 0.5) * 1000,
      );
      if (
        attempt === 0 &&
        [429, 502, 503].includes(response.status) &&
        retry <= 1500 &&
        !signal.aborted
      ) {
        await new Promise((resolve) => setTimeout(resolve, retry));
        continue;
      }
      throw Object.assign(new Error(`LLM HTTP ${response.status}`), {
        code: "LLM_UNAVAILABLE",
        status: 503,
        providerStatus: response.status,
        providerCode: payload.error?.code || "unknown",
      });
    }
    const content = (
      await response.json()
    ).choices?.[0]?.message?.content?.trim();
    if (!content)
      throw Object.assign(
        new Error("El proveedor devolvió una respuesta vacía."),
        { code: "LLM_EMPTY", status: 503 },
      );
    return content;
  }
}
export function validateEvidence(result, context) {
  if (
    result.sufficient !== true ||
    !Array.isArray(result.excerpts) ||
    !result.excerpts.length
  )
    return null;
  const normalizeText = (value) =>
    String(value).normalize("NFC").replace(/\s+/g, " ").trim();
  const excerpts = [];
  for (const item of result.excerpts.slice(0, 4)) {
    if (
      !Number.isInteger(item.sourceId) ||
      !context[item.sourceId - 1] ||
      typeof item.quote !== "string"
    )
      return null;
    const quote = normalizeText(item.quote);
    if (
      quote.length < 8 ||
      quote.length > 1600 ||
      !normalizeText(context[item.sourceId - 1].chunk_text).includes(quote)
    )
      return null;
    if (!excerpts.some((e) => e.quote === quote))
      excerpts.push({ sourceId: item.sourceId, quote });
  }
  if (!excerpts.length) return null;
  const allowedIds = new Set(excerpts.map((e) => e.sourceId));
  const answer = typeof result.answer === "string" ? result.answer.trim() : "";
  const citedIds = [...new Set(
    [...answer.matchAll(/\[Fuente\s+(\d+)\]/g)].map((m) => Number(m[1])),
  )];
  const validAnswer =
    answer.length >= 10 &&
    citedIds.length > 0 &&
    citedIds.every((id) => allowedIds.has(id));
  const fallback = excerpts
    .map((e) => `${e.quote} [Fuente ${e.sourceId}]`)
    .join("\n\n");
  return {
    // La prosa natural solo se acepta si sus citas apuntan a evidencia previamente validada.
    answer: validAnswer ? answer : fallback,
    sourceIds: [...new Set(excerpts.map((e) => e.sourceId))],
    sufficient: true,
    needsClarification: result.needsClarification === true,
  };
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
    { json: true },
  );
  try {
    const result = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    return validateEvidence(result, context);
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
