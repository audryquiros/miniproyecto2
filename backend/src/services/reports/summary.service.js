import { readFile } from "node:fs/promises";
export function numbersSupported(text, data) {
  const allowed = new Set();
  const visit = (value) => {
    if (
      typeof value === "number" ||
      (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value))
    )
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
      text: renderSummary(
        data,
        "Se recomienda revisar las solicitudes pendientes y las vacaciones acumuladas.",
      ),
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
  const result = JSON.parse(
    await callLLM(prompt, JSON.stringify(summaryData), {
      json: true,
      maxTokens: 300,
    }),
  );
  const text = renderSummary(data, result.recomendacion);
  return { provider: "analista-groq", text };
}

export function renderSummary(data, recommendation) {
  if (
    typeof recommendation !== "string" ||
    recommendation.length > 280 ||
    !/^Se recomienda\s/i.test(recommendation) ||
    /[\d%]|\b(uno|dos|tres|cuatro|cinco|diez|veinte|cien|mil|todos|ninguno|doble|mitad)\b/i.test(
      recommendation,
    ) ||
    recommendation.replace(/[.!?]$/, " ").match(/[.!?]/)
  )
    throw new Error(
      "La recomendación debe ser una sola frase de acción sin cifras ni afirmaciones cuantitativas.",
    );
  // Etiquetas y cifras se vinculan en código: el LLM no puede intercambiar
  // pendientes con ausentes ni usar un número válido para otro indicador.
  return [
    `Hay ${data.ausentes_total} personas ausentes y ${data.pendientes_total} solicitudes pendientes; ${data.pendientes_mas_3_dias} superan tres días de espera.`,
    `Las incapacidades activas son ${data.incapacidades.activas}, con ${data.incapacidades.dias_mes} días acumulados en el mes.`,
    `La rotación mensual es ${data.rotacion_porcentaje}% y ${data.vacaciones_riesgo_total} personas superan veinte días de vacaciones acumulados.`,
    `El chatbot recibió ${data.uso.consultas} consultas del día anterior, con ${data.uso.porcentaje_resuelto}% resueltas sin escalar y una latencia media de ${data.uso.latencia_promedio_ms} ms.`,
    recommendation.trim().replace(/[.!?]$/, ".") +
      (/[.!?]$/.test(recommendation.trim()) ? "" : "."),
  ].join(" ");
}
