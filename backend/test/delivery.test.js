import test from "node:test";
import assert from "node:assert/strict";
import { createScheduler } from "../src/services/scheduler/scheduler.service.js";
import { renderSummary } from "../src/services/reports/summary.service.js";
import { dataAgent } from "../src/services/agents/data.agent.js";
import { validateEvidence } from "../src/services/rag/llm.service.js";
import { assessResolution } from "../src/services/agents/resolution.service.js";

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
test("resumen: admite prosa del LLM y bloquea cifras libres y etiquetas intercambiadas", () => {
  const d = {
    ausentes_total: 2,
    pendientes_total: 50,
    pendientes_mas_3_dias: 9,
    incapacidades: { activas: 3, dias_mes: 7 },
    rotacion_porcentaje: 1.5,
    vacaciones_riesgo_total: 8,
    uso: { consultas: 80, porcentaje_resuelto: 75, latencia_promedio_ms: 120 },
  };
  const phrases = [
    {
      indicador: "ausentes_total",
      texto: "Hoy constan {{valor}} personas ausentes.",
    },
    {
      indicador: "pendientes_total",
      texto: "Se mantienen {{valor}} solicitudes pendientes.",
    },
    {
      indicador: "rotacion_porcentaje",
      texto: "El reporte refleja {{valor}} por ciento de rotación mensual.",
    },
  ];
  const s = renderSummary(d, { frases: phrases });
  assert.match(s, /2 personas ausentes/);
  assert.match(s, /50 solicitudes pendientes/);
  assert.match(s, /1.5 por ciento de rotación mensual/);
  for (const texto of [
    "Hay 50 personas ausentes.",
    "Hay {{valor}} solicitudes pendientes.",
    "Hay {{valor}} personas ausentes y 50 permisos.",
  ])
    assert.throws(() =>
      renderSummary(d, {
        frases: [{ ...phrases[0], texto }, ...phrases.slice(1)],
      }),
    );
  assert.throws(() => renderSummary(d, { frases: phrases.slice(0, 2) }));
  assert.throws(() => renderSummary(d, { frases: [...phrases, ...phrases] }));
});

test("resolución: evidencia literal y cobertura completa obligatorias; fallos no inflan éxito", async () => {
  const previous = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "groq";
  try {
    const result = {
      answer: "La licencia de maternidad dura cuatro meses.",
      needsClarification: false,
    };
    const judge = async () =>
      JSON.stringify({
        partes: [
          {
            aspecto: "maternidad",
            estado: "completo",
            evidencia: "dura cuatro meses",
          },
          { aspecto: "paternidad", estado: "ausente", evidencia: "" },
        ],
      });
    assert.equal(
      await assessResolution("maternidad y paternidad", result, { judge }),
      false,
    );
    assert.equal(
      await assessResolution("maternidad", result, {
        judge: async () =>
          JSON.stringify({
            partes: [
              {
                aspecto: "duración",
                estado: "completo",
                evidencia: "dura cuatro meses",
              },
            ],
          }),
      }),
      true,
    );
    assert.equal(
      await assessResolution("maternidad", result, {
        judge: async () => {
          throw new Error("cuota");
        },
      }),
      false,
    );
    assert.equal(
      await assessResolution("feriados", result, {
        judge: async () => '{"partes":[]}',
      }),
      false,
    );
    assert.equal(
      await assessResolution(
        "preaviso",
        { answer: "Depende de la antigüedad." },
        { judge },
      ),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previous;
  }
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
