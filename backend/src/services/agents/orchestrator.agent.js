import { policyAgent } from "./policy.agent.js";
import { dataAgent } from "./data.agent.js";
import { classifyRules, restricted } from "./intent.js";
import { callLLM } from "../rag/llm.service.js";
import { getReport } from "../reports/report.service.js";
import { today } from "../../utils/dates.js";
import { query } from "../../config/database.js";
import { readFile } from "node:fs/promises";
const intents = new Set([
  "POLITICA",
  "DATO_PERSONAL",
  "MIXTA",
  "REPORTE",
  "FUERA_DE_ALCANCE",
  "RESTRINGIDA",
]);
export async function orchestrator(message, user, conversationId) {
  const base = {
    citations: [],
    resolved: true,
    escalated: false,
    fragmentIds: [],
  };
  const denied = {
    ...base,
    agent: "orchestrator",
    intent: "RESTRINGIDA",
    answer:
      "No puedo revelar datos de otras personas ni credenciales. Consulta tus propios datos o los reportes autorizados de RRHH.",
  };
  if (restricted(message)) return denied;
  const { rows: history } = await query(
    "SELECT pregunta,respuesta FROM consultas_chat WHERE colaborador_id=? AND conversacion_id=? ORDER BY id DESC LIMIT 4",
    [user.id, conversationId],
  );
  let intent = classifyRules(message),
    rewritten = message;
  // Las herramientas conocidas se eligen con reglas estables; el LLM resuelve
  // expresiones ambiguas y seguimientos, sin sustituir una ruta explícita.
  if (
    (process.env.LLM_PROVIDER || "groq") !== "mock" &&
    intent === "FUERA_DE_ALCANCE"
  ) {
    try {
      const prompt = await readFile(
        new URL("../../../prompts/orchestrator.txt", import.meta.url),
        "utf8",
      );
      const result = JSON.parse(
        await callLLM(
          prompt,
          JSON.stringify({
            historial: [...history].reverse(),
            consulta: message,
            rol: user.rol,
          }),
          { json: true, maxTokens: 250 },
        ),
      );
      if (
        intents.has(result.intent) &&
        typeof result.query === "string" &&
        result.query.length <= 2000
      ) {
        intent = result.intent;
        rewritten = result.query;
      }
    } catch {
      /* Fallback conservador a reglas locales. */
    }
  } else if (
    intent === "FUERA_DE_ALCANCE" &&
    /^(y |¿?y |eso|esos|esa)/i.test(message) &&
    history[0]
  ) {
    rewritten = history[0].pregunta + " Seguimiento: " + message;
    intent = classifyRules(rewritten);
  }
  if (restricted(rewritten) || intent === "RESTRINGIDA") return denied;
  if (intent === "POLITICA")
    return {
      ...base,
      intent,
      agent: "policy",
      ...(await policyAgent(rewritten)),
    };
  if (intent === "DATO_PERSONAL")
    return {
      ...base,
      intent,
      agent: "data",
      ...(await dataAgent(rewritten, user)),
    };
  if (intent === "MIXTA") {
    const [data, policy] = await Promise.all([
      dataAgent(
        /vacacion/i.test(rewritten)
          ? rewritten
          : `Saldo de vacaciones: ${rewritten}`,
        user,
      ),
      policyAgent(rewritten),
    ]);
    return {
      ...base,
      intent,
      agent: "data,policy",
      ...policy,
      resolved: data.resolved && policy.resolved,
      answer: data.answer + "\n\nPolítica aplicable:\n" + policy.answer,
    };
  }
  if (intent === "REPORTE") {
    if (user.rol !== "RRHH")
      return {
        ...denied,
        answer: "Los reportes agregados requieren el rol RRHH.",
      };
    const report = await getReport(today());
    if (report && /vacaciones/i.test(message)) {
      const d =
        typeof report.datos_json === "string"
          ? JSON.parse(report.datos_json)
          : report.datos_json;
      const total = d.ausencias
        .filter((row) => row.tipo === "vacaciones")
        .reduce((sum, row) => sum + Number(row.total), 0);
      return {
        ...base,
        intent,
        agent: "analyst",
        answer: `Según el reporte publicado del ${report.fecha}, hay ${total} personas de vacaciones. Es la instantánea del reporte; los cambios posteriores se reflejarán en el próximo reporte.`,
      };
    }
    return {
      ...base,
      intent,
      agent: "analyst",
      resolved: !!report,
      answer: report
        ? "Reporte publicado del " +
          report.fecha +
          ":\n" +
          report.resumen_texto +
          "\nConsulta el dashboard para ver las cifras y el historial."
        : "Todavía no hay un reporte publicado para hoy. RRHH puede generarlo desde el dashboard.",
    };
  }
  return {
    ...base,
    intent,
    agent: "orchestrator",
    answer:
      "Puedo ayudarte con políticas de RRHH y tus datos laborales. Pregunta por vacaciones, permisos, pagos o solicitudes.",
  };
}
