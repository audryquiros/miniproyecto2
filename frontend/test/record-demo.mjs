import { chromium } from "@playwright/test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "../../backend/node_modules/dotenv/lib/main.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
dotenv.config({
  path: fileURLToPath(new URL("../../backend/.env", import.meta.url)),
});
const { default: app } = await import("../../backend/src/app.js");
const { pool, query } = await import("../../backend/src/config/database.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const vite = await createServer({
  configFile: false,
  plugins: [react()],
  server: {
    port: 0,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${server.address().port}`,
        changeOrigin: true,
      },
    },
  },
});
await vite.listen();
let browser, context;
try {
  await fs.mkdir("../.cache/demo-video", { recursive: true });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: "../.cache/demo-video",
      size: { width: 1280, height: 800 },
    },
  });
  const page = await context.newPage();
  const recorded=new Map();
  for(const message of ['¿Cuántos días de vacaciones me corresponden al año?','¿Cuántos días me quedan y puedo pasar los que sobren al otro año?']) {
    const {rows}=await query('SELECT respuesta,documentos_citados,resuelta,escalada FROM consultas_chat WHERE colaborador_id=3 AND pregunta=? ORDER BY id DESC LIMIT 1',[message]);
    assert.ok(rows[0],'Se requiere una respuesta real registrada antes de grabar.');
    const row=rows[0];
    recorded.set(message,{success:true,answer:row.respuesta,citations:typeof row.documentos_citados==='string'?JSON.parse(row.documentos_citados):row.documentos_citados,resolved:!!row.resuelta,escalated:!!row.escalada});
  }
  await page.route('**/api/chat',async route=>{
    const body=route.request().postDataJSON();
    if(recorded.has(body.message)) await route.fulfill({json:recorded.get(body.message)});
    else await route.continue();
  });
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}`);
  const started = performance.now();
  const at = async (seconds) => {
    const left = seconds * 1000 - (performance.now() - started);
    if (left > 0) await page.waitForTimeout(left);
  };
  const caption = async (text) =>
    page.evaluate((text) => {
      let el = document.querySelector("#video-caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "video-caption";
        el.style.cssText =
          "position:fixed;bottom:8px;left:16px;right:16px;z-index:9999;padding:14px 20px;background:#111827;color:white;border-radius:8px;font:16px Arial;pointer-events:none";
        document.body.append(el);
      }
      el.textContent = text;
    }, text);
  const login = async (email) => {
    await page.getByLabel("Correo de trabajo").fill(email);
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill(process.env.SEED_PASSWORD);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.getByRole("heading", { name: "Asistente de RR. HH." }).waitFor();
  };
  const ask = async (message) => {
    await page.getByLabel("Tu consulta de recursos humanos").fill(message);
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/api/chat") && r.request().method() === "POST",
      { timeout: 30000 },
    );
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    const r = await response;
    assert.equal(r.status(), 200);
    const data = await r.json();
    assert.notEqual(data.unavailable, true);
    return data;
  };
  await caption(
    "Nuvexa · 250 colaboradores ficticios. Pantallas y SQL en vivo; respuestas documentales reproducidas de registros reales. Sin audio.",
  );
  await at(20);
  await login("colaborador@nuvexa.test");
  await caption(
    "Colaborador: consulta políticas con fuentes de Drive y datos propios obtenidos de MySQL.",
  );
  await at(35);
  const policy = await ask(
    "¿Cuántos días de vacaciones me corresponden al año?",
  );
  assert.ok(policy.citations.length);
  await caption(
    "Política: reproducción de una respuesta real registrada, con citas de Drive. La evaluación completa usa Voyage y Groq en vivo.",
  );
  await at(65);
  await ask("¿Cuántos días de vacaciones me quedan disponibles?");
  await caption(
    "Dato personal: el saldo procede del usuario autenticado; el texto de una política no sustituye a la base de datos.",
  );
  await at(90);
  await page.getByRole("button", { name: "Mi perfil", exact: true }).click();
  await caption(
    "Mi perfil: vacaciones, próxima fecha de pago, evaluación y solicitudes del colaborador.",
  );
  await at(110);
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  const mixed = await ask(
    "¿Cuántos días me quedan y puedo pasar los que sobren al otro año?",
  );
  assert.ok(mixed.citations.length);
  await caption(
    "Consulta mixta: reproducción de saldo y política citada de una respuesta registrada. No se simula una nueva llamada al proveedor.",
  );
  await at(140);
  await ask("¿Cuántos días de vacaciones tiene mi compañero Juan?");
  await caption(
    "Privacidad: se rechazan los datos de otras personas. Las herramientas personales usan la identidad de sesión.",
  );
  await at(160);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login("rrhh@nuvexa.test");
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.locator(".executive").waitFor();
  await caption(
    "Rol RRHH: cuatro indicadores, resumen publicado y dos gráficos. Los valores se calculan en SQL.",
  );
  await at(195);
  await page
    .getByRole("heading", { name: "Solicitudes pendientes" })
    .scrollIntoViewIfNeeded();
  await caption(
    "Solicitudes pendientes y demora de aprobación. La tendencia muestra treinta días de ausencias.",
  );
  await at(220);
  await page
    .getByRole("heading", { name: "Uso del asistente" })
    .scrollIntoViewIfNeeded();
  await caption(
    "Analítica: consultas del día anterior, resolución sin escalar, latencia, temas y preguntas sin evidencia.",
  );
  await at(245);
  await page
    .getByRole("heading", { name: "Panorama del equipo" })
    .scrollIntoViewIfNeeded();
  const dates = await page
    .getByLabel("Historial")
    .locator("option")
    .allTextContents();
  if (dates.length > 1)
    await page.getByLabel("Historial").selectOption(dates.at(-1));
  await caption(
    "Historial: reportes inmutables por fecha. El scheduler de reportes es independiente de una sincronización larga.",
  );
  await at(275);
  await caption(
    "Entrega: evaluación de 45 preguntas, informes actualizados y guía para la compañera. Publicación de políticas 1.1 y aprobación del equipo pendientes.",
  );
  await at(303);
  const video = page.video();
  await context.close();
  context = null;
  await video.saveAs("../.cache/demo-video/real-capture.webm");
  console.log("Recorrido grabado con pantallas en vivo y respuestas documentales reproducidas, identificadas en los subtítulos.");
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  await vite.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  await pool.end();
}
