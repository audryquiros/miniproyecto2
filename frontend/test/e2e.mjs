import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "../../backend/node_modules/dotenv/lib/main.js";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
dotenv.config({
  path: fileURLToPath(new URL("../../backend/.env", import.meta.url)),
});
// Prueba de interfaz aislada; no consume la cuota del proveedor de lenguaje.
process.env.LLM_PROVIDER = "mock";
process.env.EMBEDDING_PROVIDER = "mock";
const { default: app } = await import("../../backend/src/app.js");
const { pool } = await import("../../backend/src/config/database.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
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
let browser;
const errors = [];
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("test-results", { recursive: true });
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}`);
  async function login(email) {
    await page.getByLabel("Correo de trabajo").fill(email);
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill(process.env.SEED_PASSWORD);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.getByRole("heading", { name: "Asistente de RR. HH." }).waitFor();
  }
  await login("colaborador@nuvexa.test");
  assert.equal(
    await page.getByRole("button", { name: "Dashboard", exact: true }).count(),
    0,
  );
  await page
    .getByLabel("Tu consulta de recursos humanos")
    .fill("¿Cuántos días de vacaciones me quedan?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await page.getByText(/Tu saldo del período/).waitFor();
  await page
    .getByLabel("Tu consulta de recursos humanos")
    .fill("¿Cuántos días de vacaciones me corresponden al año?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  const citation = page.locator(".citations a").first();
  await citation.waitFor();
  const source = await page.request.get(
    new URL(await citation.getAttribute("href"), page.url()).href,
  );
  assert.equal(
    source.status(),
    200,
    "La fuente citada debe abrirse con la sesión actual",
  );
  await page.screenshot({
    path: "test-results/chat-citas.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mi perfil", exact: true }).click();
  await page
    .getByRole("heading", { name: "Colaborador Simulado 003" })
    .waitFor();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login("rrhh@nuvexa.test");
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByRole("heading", { name: "Panorama del equipo" }).waitFor();
  await page.locator(".executive").waitFor();
  assert.equal(await page.locator(".metrics article").count(), 4);
  assert.equal(await page.getByRole("img").count(), 2);
  const history = await page
    .getByLabel("Historial")
    .locator("option")
    .allTextContents();
  assert.ok(history.length >= 2);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Historial").selectOption(history.at(-1));
  await page.getByText(new RegExp(`Publicado: ${history.at(-1)}`)).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  const sidebar = await page.locator(".sidebar").boundingBox();
  assert.ok(
    sidebar.width >= 380 && sidebar.height < 300,
    "El menú móvil debe ocupar el ancho sin una columna vacía de pantalla completa",
  );
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  assert.equal(
    overflow,
    false,
    "El dashboard no debe desbordar la pantalla móvil",
  );
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.getByRole("heading", { name: "Bienvenido de nuevo" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "E2E: login, chat personal, perfil, roles, dashboard, historial, móvil y logout correctos. Sin errores React.",
  );
} finally {
  if (browser) await browser.close();
  await vite.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
