# Backend Nuvexa

Conserva la ingesta, embeddings, recuperación y agente de políticas originales. Añade autenticación, datos propios, reportes y programación. La guía completa está en ../README.md.

## Comandos

- npm run db:create: crea solo la base dedicada si no existe.
- npm run migrate: aplica esquema RAG y personal de forma reejecutable.
- npm run seed: crea 250 personas ficticias; rechaza bases ya pobladas.
- npm run ingest:local: indexa las diez políticas locales, solo en modo demo.
- npm run report: publica el reporte de hoy, sin sobrescribirlo.
- npm run dev / npm start: inicia HTTP y scheduler si se habilita.
- npm run verify:report: valida con registros base los ocho componentes y la tendencia de treinta días.
- node scripts/evaluate.js --self-host: evaluación real contra una API temporal con el código actual.
- npm test / npm run test:integration / npm run evaluate.

## API

Públicos: GET /api/health y POST /api/auth/login.
Con sesión: GET /api/auth/me, POST /api/auth/logout, GET /api/personnel/me, POST /api/chat, GET /api/policies/:id (demo).
Solo RRHH: GET /api/reports, GET /api/reports/:date, POST /api/reports/generate, POST /api/ingestion/drive/sync.

POST /api/chat acepta message (máximo 2000 caracteres) y conversationId opcional. La identidad y rol vienen de la sesión, nunca del cuerpo. Todos los POST privados requieren X-CSRF-Token, entregado al iniciar sesión o en /auth/me. El navegador usa cookies HttpOnly y no almacena contraseñas ni tokens de sesión en localStorage.

El seed y las pruebas usan exclusivamente personal ficticio. En producción usa HTTPS, un usuario MySQL con privilegios limitados sobre la base dedicada y un proceso supervisado. Los límites de login son por proceso; un despliegue con varias réplicas debe compartir ese contador.

## Límites de Voyage AI

La sincronización usa por defecto lotes de 16 fragmentos y una cola con 21 segundos entre solicitudes a Voyage. Reintenta hasta cinco veces los HTTP 429 y errores temporales 500/502/503/504. Respeta `Retry-After` (segundos o fecha); sin cabecera aplica pausas progresivas de 15, 30 y 60 segundos con variación aleatoria. No reintenta errores 400/401/403. La consola muestra las pausas y el estado HTTP al agotar los intentos, sin imprimir claves ni el cuerpo del proveedor.

Las variables opcionales son `VOYAGE_MIN_INTERVAL_MS=21000`, `VOYAGE_BATCH_SIZE=16`, `VOYAGE_MAX_RETRIES=5` y `VOYAGE_MAX_RETRY_WAIT_MS=120000`. Si el servidor pide una espera superior al máximo, termina e informa el plazo, sin reintentar antes. Los valores predeterminados se aplican aunque estas líneas no estén en tu `.env`. Ajusta el intervalo solo según Usage/Limits de tu cuenta. Los reintentos no eliminan cuotas agotadas.

La ingesta y el chat tienen colas independientes. La ingesta mantiene las pausas anteriores; el chat usa `VOYAGE_QUERY_INTERVAL_MS=0` por defecto, caché temporal de vectores y no espera reintentos largos de 429. Una cuota agotada sigue limitando el servicio. Ejecuta `npm run sync:drive` con el backend detenido para no duplicar procesos que consuman la misma cuota. La sincronización puede tardar varios minutos; los documentos completados se reconocen al volver a ejecutar y un documento no se reemplaza hasta disponer de todos sus embeddings.
