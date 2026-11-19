import test from "node:test";
import assert from "node:assert/strict";
import {
  createVoyageRequester,
  retryAfterMs,
} from "../src/services/embeddings/voyage.client.js";

const defaults = {
  minIntervalMs: 21000,
  maxRetries: 5,
  maxRetryWaitMs: 120000,
};
function harness(responses) {
  let clock = 0;
  const calls = [],
    waits = [];
  const request = createVoyageRequester({
    now: () => clock,
    random: () => 0,
    onWait: () => {},
    sleep: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    fetchImpl: async () => {
      calls.push(clock);
      const response = responses.shift();
      assert.ok(response, "Se envió una petición inesperada");
      return response;
    },
  });
  return { request, calls, waits };
}
const response = (status, retryAfter) => ({
  ok: status === 200,
  status,
  headers: new Headers(retryAfter ? { "retry-after": retryAfter } : {}),
  arrayBuffer: async () => new ArrayBuffer(0),
});

test("Voyage: 429 respeta Retry-After y recupera el mismo lote", async () => {
  const h = harness([response(429, "60"), response(200)]);
  await h.request("url", {}, defaults);
  assert.deepEqual(h.calls, [0, 60000]);
  assert.deepEqual(h.waits, [60000]);
});
test("Voyage: solicitudes concurrentes se espacian sin ráfagas", async () => {
  const h = harness([response(200), response(200), response(200)]);
  await Promise.all([
    h.request("url", {}, defaults),
    h.request("url", {}, defaults),
    h.request("url", {}, defaults),
  ]);
  assert.deepEqual(h.calls, [0, 21000, 42000]);
});
test("Voyage: retroceso progresivo sin cabecera y límite de intentos", async () => {
  const h = harness([response(429), response(429), response(429)]);
  await assert.rejects(
    () =>
      h.request("url", {}, { ...defaults, minIntervalMs: 0, maxRetries: 2 }),
    (e) => e.providerStatus === 429 && e.code === "VOYAGE_UNAVAILABLE",
  );
  assert.deepEqual(h.calls, [0, 15000, 45000]);
});
test("Voyage: 401 y 400 no se reintentan; la cola se recupera", async () => {
  const h = harness([response(401), response(400), response(200)]);
  for (const status of [401, 400])
    await assert.rejects(
      () => h.request("url", {}, { ...defaults, minIntervalMs: 0 }),
      (e) => e.providerStatus === status,
    );
  await h.request("url", {}, { ...defaults, minIntervalMs: 0 });
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.waits, []);
});
test("Voyage: espera excesiva termina sin reintentar antes de lo permitido", async () => {
  const h = harness([response(429, "3600")]);
  await assert.rejects(
    () => h.request("url", {}, defaults),
    (e) => e.retryAfterMs === 3600000,
  );
  await assert.rejects(
    () => h.request("url", {}, defaults),
    (e) => e.retryAfterMs === 3600000,
  );
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.waits, []);
});
test("Voyage: Retry-After admite segundos y fecha HTTP", () => {
  assert.equal(retryAfterMs("1.5", 0), 1500);
  assert.equal(
    retryAfterMs(
      "Thu, 19 Nov 2026 15:01:00 GMT",
      Date.parse("2026-11-19T15:00:00Z"),
    ),
    60000,
  );
  assert.equal(retryAfterMs("inválido", 0), null);
  assert.equal(retryAfterMs("-1", 0), null);
  assert.equal(retryAfterMs(null, 0), null);
});
test("Voyage: un fallo temporal de servidor se reintenta", async () => {
  const h = harness([response(503, "2"), response(200)]);
  await h.request("url", {}, { ...defaults, minIntervalMs: 0 });
  assert.deepEqual(h.calls, [0, 2000]);
});
