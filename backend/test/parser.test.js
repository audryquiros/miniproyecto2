import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractText } from "../src/services/drive/document.parser.js";
import {
  generateGroundedAnswer,
  callLLM,
  validateEvidence,
} from "../src/services/rag/llm.service.js";
import {
  createEmbeddings,
  createEmbedding,
} from "../src/services/embeddings/embedding.service.js";
test("Voyage envía query/document, ordena lotes y rechaza dimensiones incompatibles", async () => {
  const keys = [
    "EMBEDDING_PROVIDER",
    "VOYAGE_API_KEY",
    "VOYAGE_DIMENSION",
    "VOYAGE_MIN_INTERVAL_MS",
  ];
  const old = Object.fromEntries(keys.map((k) => [k, process.env[k]])),
    oldFetch = globalThis.fetch;
  process.env.EMBEDDING_PROVIDER = "voyage";
  process.env.VOYAGE_API_KEY = "test-no-network";
  process.env.VOYAGE_DIMENSION = "2";
  process.env.VOYAGE_MIN_INTERVAL_MS = "0";
  const sent = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    sent.push(body);
    return {
      ok: true,
      json: async () => ({
        data: body.input
          .map((_, index) => ({ index, embedding: [index, 1] }))
          .reverse(),
      }),
    };
  };
  try {
    assert.deepEqual(await createEmbeddings(["A", "B"], "document"), [
      [0, 1],
      [1, 1],
    ]);
    assert.deepEqual(await createEmbedding("pregunta", "query"), [0, 1]);
    assert.equal(sent[0].input_type, "document");
    assert.equal(sent[1].input_type, "query");
    assert.equal(sent[0].truncation, false);
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ data: [{ index: 0, embedding: [1] }] }),
    });
    await assert.rejects(() => createEmbedding("A"), /incompatibles/);
  } finally {
    globalThis.fetch = oldFetch;
    for (const k of keys)
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
  }
});
test("Voyage: el chat no hereda la pausa de ingesta y reutiliza solo el vector de consulta", {timeout:2000}, async()=>{
  const keys=['EMBEDDING_PROVIDER','VOYAGE_API_KEY','VOYAGE_DIMENSION','VOYAGE_MIN_INTERVAL_MS'];
  const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const oldFetch=globalThis.fetch;
  Object.assign(process.env,{EMBEDDING_PROVIDER:'voyage',VOYAGE_API_KEY:'test-only',VOYAGE_DIMENSION:'3',VOYAGE_MIN_INTERVAL_MS:'21000'});
  let calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({data:[{index:0,embedding:[1,0,0]}]})};};
  try {
    await createEmbeddings(['documento de prueba'],'document');
    const [a,b]=await Promise.all([createEmbedding('consulta cache única','query'),createEmbedding('consulta cache única','query')]);
    assert.deepEqual(a,b);assert.equal(calls,2);
    a[0]=99;assert.equal((await createEmbedding('consulta cache única','query'))[0],1);
  } finally {globalThis.fetch=oldFetch;for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
});

test("límites de Groq se distinguen de un error interno y no se reintentan antes del plazo", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-no-network";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return {
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "60" }),
      json: async () => ({ error: { code: "rate_limit_exceeded" } }),
    };
  };
  try {
    await assert.rejects(
      () => callLLM("sistema", "consulta"),
      (e) =>
        e.status === 503 &&
        e.providerStatus === 429 &&
        e.providerCode === "rate_limit_exceeded",
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = oldKey;
  }
});
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
    excerpts: [{ sourceId: 1, quote: "Quince días." }],
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
      excerpts: [{ sourceId: 99, quote: "Texto inventado en la respuesta" }],
      sufficient: true,
    };
    assert.equal(await generateGroundedAnswer("vacaciones", context), null);
    output = { excerpts: [], sufficient: false };
    assert.equal(await generateGroundedAnswer("vacaciones", context), null);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = oldProvider;
    if (oldKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = oldKey;
  }
});
test("evidencia: una cita válida no autoriza datos inventados", () => {
  const context = [
    {
      chunk_text:
        "La acumulación se permite únicamente bajo condiciones legales y con registro.",
    },
  ];
  assert.equal(
    validateEvidence(
      {
        sufficient: true,
        excerpts: [
          { sourceId: 1, quote: "Está prohibido acumular vacaciones." },
        ],
      },
      context,
    ),
    null,
  );
  assert.equal(
    validateEvidence(
      {
        sufficient: true,
        excerpts: [{ sourceId: 1, quote: context[0].chunk_text }],
        needsClarification: true,
      },
      context,
    ).sourceIds[0],
    1,
  );
});
