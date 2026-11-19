import test from "node:test";
import assert from "node:assert/strict";
import { createScheduler } from "../src/services/scheduler/scheduler.service.js";
import { renderSummary } from "../src/services/reports/summary.service.js";
import { dataAgent } from "../src/services/agents/data.agent.js";
import { validateEvidence } from "../src/services/rag/llm.service.js";

test("reporte: una sincronización lenta no bloquea las 7:00 y no se duplican tareas", async () => {
  const completed = new Set(),
    calls = [];
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  let current = new Date("2026-11-19T12:59:00Z");
  const scheduler = createScheduler({
    now: () => current,
    hasDrive: () => true,
    dbQuery: async (sql, [task]) => {
      if (sql.startsWith("SELECT"))
        return { rows: completed.has(task) ? [{ completada_en: "ok" }] : [] };
      completed.add(task);
      return { rows: [] };
    },
    runDrive: async () => {
      calls.push("drive");
      await gate;
    },
    runReport: async () => calls.push("reporte"),
  });
  const early = scheduler.tick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ["drive"]);
  current = new Date("2026-11-19T13:00:00Z");
  await scheduler.tick();
  assert.deepEqual(calls, ["drive", "reporte"]);
  await scheduler.tick();
  assert.equal(calls.filter((c) => c === "reporte").length, 1);
  release();
  await early;
});
test("resumen: las cifras quedan asociadas a su indicador y se rechazan cifras del LLM", () => {
  const d = {
    ausentes_total: 2,
    pendientes_total: 50,
    pendientes_mas_3_dias: 9,
    incapacidades: { activas: 3, dias_mes: 7 },
    rotacion_porcentaje: 1.5,
    vacaciones_riesgo_total: 8,
    uso: { consultas: 80, porcentaje_resuelto: 75, latencia_promedio_ms: 120 },
  };
  const s = renderSummary(
    d,
    "Se recomienda revisar las solicitudes pendientes.",
  );
  assert.match(s, /2 personas ausentes y 50 solicitudes pendientes/);
  assert.match(s, /3, con 7 días/);
  assert.throws(
    () => renderSummary(d, "Se recomienda gestionar 50 ausentes."),
    /recomendación/,
  );
});
test("datos: un dato o solicitud inexistente no se contabiliza como resuelto", async () => {
  const loadProfile = async () => ({
    saldos: [],
    solicitudes: [],
    proximo_pago: null,
    proxima_evaluacion: null,
  });
  for (const message of [
    "¿Cuántos días de vacaciones me quedan?",
    "¿Qué día cae mi próximo pago?",
    "¿En qué estado está mi solicitud de permiso del viernes?",
  ])
    assert.equal(
      (await dataAgent(message, { id: 3 }, { loadProfile })).resolved,
      false,
    );
});
test("políticas: la respuesta parcial conserva la necesidad de aclaración", () => {
  const text =
    "La duración debe verificarse con Recursos Humanos según el régimen aplicable.";
  const r = validateEvidence(
    {
      sufficient: true,
      excerpts: [{ sourceId: 1, quote: text }],
      needsClarification: true,
    },
    [{ chunk_text: text }],
  );
  assert.equal(r.needsClarification, true);
});
