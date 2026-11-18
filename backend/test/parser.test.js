import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractText } from "../src/services/drive/document.parser.js";
import { generateGroundedAnswer } from "../src/services/rag/llm.service.js";
test("parser XLSX recorre hojas y conserva fechas y conceptos", async () => {
  const buffer = await readFile(
    new URL("../../outputs/nuvexa/Calendario_Pagos_Demo.xlsx", import.meta.url),
  );
  const text = await extractText(
    buffer,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  assert.match(text, /Hoja: Pagos demo/);
  assert.match(text, /Planilla quincenal simulada/);
  assert.match(text, /2026-11-30/);
});
test("parser PDF extrae la política y TXT conserva acentos", async () => {
  const buffer = await readFile(
    new URL(
      "../../outputs/nuvexa/Politica_Vacaciones_Demo.pdf",
      import.meta.url,
    ),
  );
  const text = await extractText(buffer, "application/pdf");
  assert.match(text, /vacaciones/);
  assert.match(text, /15 d/);
  assert.equal(
    await extractText(Buffer.from("política y evaluación"), "text/plain"),
    "política y evaluación",
  );
  await assert.rejects(
    () => extractText(Buffer.from("x"), "image/png"),
    /no soportado/,
  );
});
test("respuesta fundamentada valida citas y descarta fuentes no mencionadas", async () => {
  const oldFetch = globalThis.fetch,
    oldProvider = process.env.LLM_PROVIDER,
    oldKey = process.env.GROQ_API_KEY;
  process.env.LLM_PROVIDER = "groq";
  process.env.GROQ_API_KEY = "test-no-network";
  const context = [
    { document_name: "A", section: "1", chunk_text: "Quince días." },
    { document_name: "B", section: "2", chunk_text: "Diez días." },
  ];
  let output = {
    answer: "Quince días [Fuente 1]",
    sourceIds: [1, 2],
    sufficient: true,
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(output) } }],
    }),
  });
  try {
    assert.deepEqual(
      (await generateGroundedAnswer("vacaciones", context)).sourceIds,
      [1],
    );
    output = {
      answer: "Inventado [Fuente 99]",
      sourceIds: [99],
      sufficient: true,
    };
    assert.equal(await generateGroundedAnswer("vacaciones", context), null);
    output = { answer: "No sé", sourceIds: [], sufficient: false };
    assert.equal(await generateGroundedAnswer("vacaciones", context), null);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
    if (oldKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = oldKey;
  }
});
