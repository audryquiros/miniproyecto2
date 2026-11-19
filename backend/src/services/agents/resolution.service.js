import { readFile } from "node:fs/promises";
import { callLLM } from "../rag/llm.service.js";

// Solo decide la métrica. No altera la respuesta, sus citas ni el enrutamiento.
export async function assessResolution(
  question,
  result,
  { judge = callLLM } = {},
) {
  if (result.needsClarification || !result.answer) return false;
  // Una remisión genérica no acredita que se haya contestado una cifra o fecha.
  if (
    /depende de|se determinará según|cuando la ley conceda|consulta.{0,12}rr\.?\s?hh|no (?:se )?(?:detalla|especifica|consta)/i.test(
      result.answer,
    )
  )
    return false;
  if (process.env.LLM_PROVIDER === "mock") return false;
  try {
    const prompt = await readFile(
      new URL("../../../prompts/resolution.txt", import.meta.url),
      "utf8",
    );
    const verdict = JSON.parse(
      await judge(
        prompt,
        JSON.stringify({ pregunta: question, respuesta: result.answer }),
        { json: true, maxTokens: 700 },
      ),
    );
    return (
      Array.isArray(verdict.partes) &&
      verdict.partes.length > 0 &&
      verdict.partes.every(
        (p) =>
          typeof p.aspecto === "string" &&
          p.aspecto.trim() &&
          p.estado === "completo" &&
          typeof p.evidencia === "string" &&
          p.evidencia.trim().length >= 8 &&
          result.answer.includes(
            p.evidencia.trim().replace(/^["“]|["”]$/g, ""),
          ),
      )
    );
  } catch {
    // No disponer de un veredicto no cuenta como éxito del chatbot.
    return false;
  }
}
