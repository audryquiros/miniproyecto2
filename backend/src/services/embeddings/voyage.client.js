const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export function retryAfterMs(value, now = Date.now()) {
  if (!value?.trim()) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds))
    return seconds >= 0 ? Math.ceil(seconds * 1000) : null;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

export function voyageSettings() {
  const settings = {
    minIntervalMs: Number(process.env.VOYAGE_MIN_INTERVAL_MS ?? 21000),
    maxRetries: Number(process.env.VOYAGE_MAX_RETRIES ?? 5),
    maxRetryWaitMs: Number(process.env.VOYAGE_MAX_RETRY_WAIT_MS ?? 120000),
    batchSize: Number(process.env.VOYAGE_BATCH_SIZE ?? 16),
  };
  for (const [key, value] of Object.entries(settings)) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error(`Configuración Voyage inválida: ${key}.`);
  }
  if (
    settings.batchSize < 1 ||
    settings.batchSize > 32 ||
    settings.maxRetries > 10
  )
    throw new Error("Voyage requiere lotes de 1 a 32 y hasta 10 reintentos.");
  return settings;
}

function failure(status, waitMs, attempts) {
  const detail =
    status === 429
      ? "Límite de uso: revisa Usage/Limits y la cuota de tu cuenta."
      : "El proveedor no completó la solicitud.";
  return Object.assign(
    new Error(`Voyage HTTP ${status}. ${detail} Intentos: ${attempts}.`),
    {
      code: "VOYAGE_UNAVAILABLE",
      status: 503,
      providerStatus: status,
      retryAfterMs: waitMs,
    },
  );
}

// Una cola por proceso evita que las llamadas concurrentes creen otra ráfaga.
// El reloj y la espera se inyectan para probar minutos sin esperar tiempo real.
export function createVoyageRequester({
  fetchImpl = (...args) => fetch(...args),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
  random = Math.random,
  onWait = ({ ms, reason, attempt }) =>
    console.info(
      `[Voyage] ${reason}: espera ${Math.ceil(ms / 1000)} s${attempt ? `; próximo intento ${attempt}` : ""}.`,
    ),
} = {}) {
  let tail = Promise.resolve();
  let nextRequestAt = 0;
  let cooldownStatus = 429;
  return function request(url, options, settings = voyageSettings()) {
    async function run() {
      const wait = async (ms, reason, attempt) => {
        if (ms <= 0) return;
        onWait({ ms, reason, attempt });
        await sleep(ms);
      };
      for (let attempt = 0; attempt <= settings.maxRetries; attempt++) {
        const pendingWait = Math.max(0, nextRequestAt - now());
        if (pendingWait > settings.maxRetryWaitMs)
          throw failure(cooldownStatus, pendingWait, attempt);
        await wait(pendingWait, "pausa entre solicitudes");
        nextRequestAt = now() + settings.minIntervalMs;
        const response = await fetchImpl(url, {
          ...options,
          signal: AbortSignal.timeout(settings.timeoutMs || 15000),
        });
        if (response.ok) return response;
        const headerWait = retryAfterMs(
          response.headers?.get("retry-after"),
          now(),
        );
        const delay =
          headerWait ??
          Math.min(60000, 15000 * 2 ** attempt) + Math.floor(random() * 1000);
        // Consumir el cuerpo libera la conexión; no se imprime la respuesta ni secretos.
        if (response.arrayBuffer) await response.arrayBuffer().catch(() => {});
        if (RETRYABLE.has(response.status)) {
          nextRequestAt = Math.max(nextRequestAt, now() + delay);
          cooldownStatus = response.status;
        }
        if (
          !RETRYABLE.has(response.status) ||
          attempt === settings.maxRetries ||
          delay > settings.maxRetryWaitMs
        )
          throw failure(response.status, headerWait, attempt + 1);
        await wait(
          Math.max(0, nextRequestAt - now()),
          `HTTP ${response.status}, reintento`,
          attempt + 2,
        );
      }
    }
    const result = tail.then(run);
    tail = result.catch(() => {});
    return result;
  };
}

export const requestVoyage = createVoyageRequester();
