# Backend Nuvexa

Conserva la ingesta, embeddings, recuperación y agente de políticas originales. Añade autenticación, datos propios, reportes y programación. La guía completa está en ../README.md.

## Comandos

- npm run db:create: crea solo la base dedicada si no existe.
- npm run migrate: aplica esquema RAG y personal de forma reejecutable.
- npm run seed: crea 250 personas ficticias; rechaza bases ya pobladas.
- npm run ingest:local: indexa las diez políticas locales, solo en modo demo.
- npm run report: publica el reporte de hoy, sin sobrescribirlo.
- npm run dev / npm start: inicia HTTP y scheduler si se habilita.
- npm test / npm run test:integration / npm run evaluate.

## API

Públicos: GET /api/health y POST /api/auth/login.
Con sesión: GET /api/auth/me, POST /api/auth/logout, GET /api/personnel/me, POST /api/chat, GET /api/policies/:id (demo).
Solo RRHH: GET /api/reports, GET /api/reports/:date, POST /api/reports/generate, POST /api/ingestion/drive/sync.

POST /api/chat acepta message (máximo 2000 caracteres) y conversationId opcional. La identidad y rol vienen de la sesión, nunca del cuerpo. Todos los POST privados requieren X-CSRF-Token, entregado al iniciar sesión o en /auth/me. El navegador usa cookies HttpOnly y no almacena contraseñas ni tokens de sesión en localStorage.

El seed y las pruebas usan exclusivamente personal ficticio. En producción usa HTTPS, un usuario MySQL con privilegios limitados sobre la base dedicada y un proceso supervisado. Los límites de login son por proceso; un despliegue con varias réplicas debe compartir ese contador.
