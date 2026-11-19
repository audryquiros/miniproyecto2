import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { executiveSummary } from "../src/services/reports/summary.service.js";
import { assessResolution } from "../src/services/agents/resolution.service.js";
import { getReport } from "../src/services/reports/report.service.js";
import { today } from "../src/utils/dates.js";
import { pool } from "../src/config/database.js";

try {
  assert.equal(
    process.env.LLM_PROVIDER,
    "groq",
    "Esta verificación requiere Groq real.",
  );
  const report = await getReport(today());
  assert.ok(report, "Se necesita un reporte de hoy como fuente SQL.");
  const summary = await executiveSummary(report.datos_json);
  const source = JSON.parse(
    await readFile(
      new URL("../../evaluation/entrega-20261119.json", import.meta.url),
      "utf8",
    ),
  );
  const checks = [];
  for (const id of [5, 6, 7, 12, 13, 20, 1, 3, 4]) {
    const row = source.results.find((r) => r.id === id);
    const start = performance.now();
    const resolved = await assessResolution(row.question, {
      answer: row.obtained,
      needsClarification: row.resolved === false,
    });
    const expected = ![5, 6, 7, 12, 13, 20].includes(id);
    checks.push({
      id,
      resolved,
      expected,
      elapsedMs: Math.round(performance.now() - start),
    });
    console.log(JSON.stringify(checks.at(-1)));
    assert.equal(resolved, expected, `Cobertura incorrecta en pregunta ${id}`);
  }
  const evidence = {
    generatedAt: new Date().toISOString(),
    llm: "groq",
    scope:
      "Resumen nuevo y revisión de cobertura sobre respuestas históricas; sin modificar reportes ni logs",
    summary,
    checks,
    historicalReportsModified: false,
    actualSevenAMObserved: false,
  };
  await writeFile(
    new URL("../../docs/entrega/validacion-persona2.json", import.meta.url),
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    "Resumen completo del LLM y nueve casos de resolución comprobados.",
  );
} finally {
  await pool.end();
}
