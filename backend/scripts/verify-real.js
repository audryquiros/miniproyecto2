import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import { pool, query } from "../src/config/database.js";
import { retrieve } from "../src/services/rag/retrieval.service.js";
import { executiveSummary } from "../src/services/reports/summary.service.js";
import { today } from "../src/utils/dates.js";

assert.equal(process.env.LLM_PROVIDER, "groq");
assert.equal(process.env.EMBEDDING_PROVIDER, "local");
const server = process.argv.includes("--live") ? null : app.listen(0, "127.0.0.1");
if (server) await new Promise((resolve) => server.once("listening", resolve));
const base = server ? `http://127.0.0.1:${server.address().port}/api` : "http://127.0.0.1:3000/api";
let session;
const conversationId = randomUUID();
try {
  const context = await retrieve("¿Cuántos días de vacaciones corresponden por año?");
  assert.ok(context.length);
  assert.ok(context.every((row) => row.drive_url?.startsWith("https://")));
  console.log("Búsqueda vectorial:", JSON.stringify(context.map(({document_name,section,score}) => ({document_name,section,score}))));
  const login = await fetch(base + "/auth/login", { method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({email:"colaborador@nuvexa.test",password:process.env.SEED_PASSWORD}) });
  assert.equal(login.status, 200);
  session = {Cookie:login.headers.get("set-cookie").split(";")[0], "X-CSRF-Token":(await login.json()).csrfToken};
  for (const [message, intent] of [
    ["¿Cuántos días de vacaciones corresponden por año?", "POLITICA"],
    ["¿Cuántos días de vacaciones me quedan disponibles?", "DATO_PERSONAL"],
    ["¿Cuántos días de vacaciones tiene mi compañero Juan?", "RESTRINGIDA"],
    ["¿Hay un bono para mascotas en Nuvexa?", "POLITICA"],
  ]) {
    const start = performance.now();
    const response = await fetch(base + "/chat", {method:"POST",headers:{...session,"Content-Type":"application/json"},
      body:JSON.stringify({message,conversationId})});
    const data = await response.json();
    console.log(JSON.stringify({message,status:response.status,latencyMs:Math.round(performance.now()-start),...data}));
    assert.equal(response.status, 200);
    assert.equal(data.intent, intent);
    if (message.includes("por año")) {
      assert.ok(data.citations.length);
      assert.ok(data.citations.every((citation) => citation.url?.includes("google.com/")));
      assert.match(data.answer, /15|quince/i);
    }
    if (message.includes("mascotas")) assert.equal(data.escalated, true);
  }
  const {rows} = await query("SELECT datos_json FROM reportes_diarios WHERE fecha=?",[today()]);
  if (rows[0]) {
    const summary = await executiveSummary(typeof rows[0].datos_json === "string" ? JSON.parse(rows[0].datos_json) : rows[0].datos_json);
    assert.equal(summary.provider,"analista-groq");
    console.log("Resumen real (sin reemplazar el reporte histórico):", summary.text);
  }
  console.log("Verificación real completada.");
} finally {
  if(session) await fetch(base + "/auth/logout",{method:"POST",headers:session}).catch(()=>{});
  await query("DELETE FROM consultas_chat WHERE conversacion_id=?",[conversationId]);
  if (server) await new Promise((resolve)=>server.close(resolve));
  await pool.end();
}
