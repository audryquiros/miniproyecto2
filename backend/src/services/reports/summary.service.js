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
  return (text.match(/-?\d+(?:[.,]\d+)?/g) || []).every((n) =>
    allowed.has(String(Number(n.replace(",", ".")))),
  );
}
export function summaryMetrics(data) {
  return {
    ausentes_total: {
      valor: data.ausentes_total,
      etiqueta: "personas ausentes",
    },
    pendientes_total: {
      valor: data.pendientes_total,
      etiqueta: "solicitudes pendientes",
    },
    incapacidades_activas: {
      valor: data.incapacidades.activas,
      etiqueta: "personas con incapacidad activa",
    },
    rotacion_porcentaje: {
      valor: data.rotacion_porcentaje,
      etiqueta: "por ciento de rotación mensual",
    },
    consultas: {
      valor: data.uso.consultas,
      etiqueta: "consultas del día anterior",
    },
    porcentaje_resuelto: {
      valor: data.uso.porcentaje_resuelto,
      etiqueta: "por ciento de consultas resueltas sin escalar",
    },
  };
}
// El LLM redacta todas las frases; solo los valores proceden de SQL.
export function renderSummary(data, result) {
  const metrics = summaryMetrics(data);
  if (
    !Array.isArray(result?.frases) ||
    result.frases.length < 3 ||
    result.frases.length > 5
  )
    throw new Error("El resumen debe contener de tres a cinco frases del LLM.");
  const seen = new Set();
  const sentences = result.frases.map(({ indicador, texto }) => {
    const metric = metrics[indicador];
    if (
      !metric ||
      seen.has(indicador) ||
      typeof texto !== "string" ||
      texto.length > 300
    )
      throw new Error("Indicador inválido o repetido en el resumen.");
    seen.add(indicador);
    const required = `{{valor}} ${metric.etiqueta}`;
    const rest = texto.replace(required, "").trim();
    if (
      !texto.includes(required) ||
      (texto.match(/\{\{valor\}\}/g) || []).length !== 1 ||
      /[\d{}%]|\b(uno|dos|tres|cuatro|cinco|diez|veinte|cien|mil|doble|mitad)\b/i.test(
        rest,
      ) ||
      /[.!?]/.test(rest.replace(/\.$/, "")) ||
      !texto.endsWith(".") ||
      /\b(aument|disminu|mejor|empeor|debido|caus|comparad)/i.test(rest)
    )
      throw new Error(
        "Frase inválida: cifra, etiqueta o afirmación no sustentada.",
      );
    if (!Number.isFinite(Number(metric.valor)))
      throw new Error("Falta una cifra SQL del resumen.");
    return texto.replace("{{valor}}", String(Number(metric.valor)));
  });
  const text = sentences.join(" ");
  if (!numbersSupported(text, data)) throw new Error("Cifra ajena al reporte.");
  return text;
}
export async function executiveSummary(data) {
  if ((process.env.LLM_PROVIDER || "groq") === "mock")
    return {
      provider: "plantilla-demo",
      text: renderSummary(data, {
        frases: [
          {
            indicador: "ausentes_total",
            texto: "Hoy se registran {{valor}} personas ausentes.",
          },
          {
            indicador: "pendientes_total",
            texto: "Hay {{valor}} solicitudes pendientes.",
          },
          {
            indicador: "consultas",
            texto: "El chatbot registra {{valor}} consultas del día anterior.",
          },
        ],
      }),
    };
  const { callLLM } = await import("../rag/llm.service.js");
  const prompt = await readFile(
    new URL("../../../prompts/analyst.txt", import.meta.url),
    "utf8",
  );
  const metrics = summaryMetrics(data);
  const indicadores = Object.fromEntries(
    [
      "ausentes_total",
      "pendientes_total",
      "consultas",
      "porcentaje_resuelto",
    ].map((key) => [key, metrics[key]]),
  );
  const raw = await callLLM(prompt, JSON.stringify({ indicadores }), {
    json: true,
    maxTokens: 1600,
  });
  return {
    provider: "analista-groq",
    text: renderSummary(data, JSON.parse(raw)),
  };
}
