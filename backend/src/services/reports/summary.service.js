import { readFile } from "node:fs/promises";
export function numbersSupported(text, data) {
  const allowed = new Set();
  const visit = (value) => {
    if (typeof value === "number" ||
        (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)))
      allowed.add(String(Number(value)));
    else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  };
  visit(data);
  return (text.match(/-?\d+(?:[.,]\d+)?/g) || []).every((number) =>
    allowed.has(String(Number(number.replace(",", ".")))),
  );
}
export async function executiveSummary(data) {
  if ((process.env.LLM_PROVIDER || "groq") === "mock")
    return {
      provider: "plantilla-demo",
      text: `Hay ${data.ausentes_total} personas ausentes y ${data.pendientes_total} solicitudes pendientes. Se identifican ${data.pendientes_mas_3_dias} solicitudes con más de tres días de espera. El chatbot recibió ${data.uso.consultas} consultas el día anterior. RRHH debe revisar los pendientes y el riesgo por vacaciones acumuladas.`,
    };
  const { callLLM } = await import("../rag/llm.service.js");
  const prompt = await readFile(
    new URL("../../../prompts/analyst.txt", import.meta.url),
    "utf8",
  );
  const summaryData = {
    umbrales: { pendientes_dias: 3, vacaciones_dias: 20 },
    ausentes_total: data.ausentes_total,
    pendientes_total: data.pendientes_total,
    pendientes_mas_3_dias: data.pendientes_mas_3_dias,
    incapacidades: data.incapacidades,
    rotacion_porcentaje: data.rotacion_porcentaje,
    vacaciones_riesgo_total: data.vacaciones_riesgo_total,
    uso: data.uso,
  };
  const text = await callLLM(prompt, JSON.stringify(summaryData));
  if (!numbersSupported(text, summaryData))
    throw new Error(
      "El resumen contiene cifras que no están en el reporte; no se publicará.",
    );
  const sentences = text.split(/[.!?](?:\s|$)/).filter((part) => part.trim());
  if (sentences.length < 3 || sentences.length > 5)
    throw new Error("El resumen debe tener de tres a cinco frases.");
  return { provider: "analista-groq", text };
}
