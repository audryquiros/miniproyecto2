import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
const base = process.env.EVAL_API_URL || "http://127.0.0.1:3000/api";
const password = process.env.SEED_PASSWORD;
if (!password)
  throw new Error("SEED_PASSWORD es necesaria para las cuentas simuladas.");
const questions = JSON.parse(
  await readFile(
    new URL("../../evaluation/questions.json", import.meta.url),
    "utf8",
  ),
);
const sessions = {};
for (const [role, email] of [
  ["colaborador", "colaborador@nuvexa.test"],
  ["RRHH", "rrhh@nuvexa.test"],
]) {
  const response = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok)
    throw new Error("No se pudo iniciar la cuenta de evaluación: " + role);
  const data = await response.json();
  sessions[role] = {
    cookie: response.headers.get("set-cookie").split(";")[0],
    csrf: data.csrfToken,
  };
}
const results = [];
for (const item of questions) {
  // Evita disparar las 45 consultas juntas contra los límites de la cuenta de Groq.
  if (results.length && process.env.LLM_PROVIDER !== "mock")
    await new Promise((resolve) => setTimeout(resolve, Number(process.env.EVAL_DELAY_MS || 3000)));
  const session = sessions[item.role];
  const started = performance.now();
  try {
    const response = await fetch(base + "/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: session.cookie,
        "X-CSRF-Token": session.csrf,
      },
      body: JSON.stringify({ message: item.question }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    results.push({
      ...item,
      obtained: data.answer || data.message,
      obtainedIntent: data.intent,
      httpStatus: response.status,
      resolved: data.resolved,
      escalated: data.escalated,
      latencyMs: Math.round(performance.now() - started),
      routingPassed: response.ok && data.intent === item.intent,
      citations: data.citations || [],
      contentCorrect: null,
      reviewNotes:
        "Revisión humana de contenido y respaldo requerida; el enrutamiento no demuestra exactitud RAG.",
    });
  } catch (error) {
    results.push({
      ...item,
      error: error.message,
      routingPassed: false,
      latencyMs: Math.round(performance.now() - started),
      contentCorrect: false,
    });
  }
  if (results.length % 5 === 0) console.log(`Evaluadas ${results.length}/${questions.length}.`);
}
const sorted = results.map((r) => r.latencyMs).sort((a, b) => a - b);
const output = {
  generatedAt: new Date().toISOString(),
  mode: process.env.LLM_PROVIDER || "groq",
  model: process.env.LLM_MODEL,
  embeddings: process.env.EMBEDDING_PROVIDER,
  total: results.length,
  routingAccuracy:
    results.filter((r) => r.routingPassed).length / results.length,
  p90LatencyMs: sorted[Math.ceil(sorted.length * 0.9) - 1],
  within8Seconds:
    results.filter((r) => r.latencyMs < 8000).length / results.length,
  contentAccuracy: null,
  results,
};
await writeFile(
  new URL("../../evaluation/results.json", import.meta.url),
  JSON.stringify(output, null, 2),
);
console.log(
  JSON.stringify({
    total: output.total,
    routingAccuracy: output.routingAccuracy,
    p90LatencyMs: output.p90LatencyMs,
    contentAccuracy: "pendiente de revisión humana",
  }),
);
for (const session of Object.values(sessions))
  await fetch(base + "/auth/logout", {
    method: "POST",
    headers: { Cookie: session.cookie, "X-CSRF-Token": session.csrf },
  });
