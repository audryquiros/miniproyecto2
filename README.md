# Nuvexa — Base Parte 1

Base full-stack para **RAG + Google Drive + políticas de RR. HH. + agente de políticas + orquestador + chat**.

## Alcance

- Frontend React + Vite.
- Backend Node.js + Express.
- MySQL 8.4.
- Servicio Google Drive.
- Ingesta y chunking.
- Servicio de embeddings desacoplado.
- Recuperación RAG.
- Agente de políticas.
- Orquestador inicial.
- Endpoint `/api/chat`.
- UI de chat con citas.

No implementa el agente de empleados, analista, reportes ni dashboard funcional.

## Estructura

```text
Nuvexa/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── App.jsx
│       └── main.jsx
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── services/
│   │       ├── agents/
│   │       ├── drive/
│   │       ├── embeddings/
│   │       └── rag/
│   └── migrations/
├── docs/
│   └── politicas/
├── .env.example
├── agents.md
└── docker-compose.yml
```

## Arranque

```bash
docker compose up -d mysql

cd backend
npm install
npm run migrate
npm run dev
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

El backend puede probarse inicialmente con `RAG_MODE=mock`.

## Flujo

```text
React
  ↓
POST /api/chat
  ↓
Orchestrator
  ↓
Policy Agent
  ↓
Retrieval Service
  ↓
MySQL
  ↓
Contexto de políticas
  ↓
Respuesta + citas
```


## Google Drive

El backend ya tiene la conexión de solo lectura con Google Drive mediante una Service Account.

1. Crea una Service Account en Google Cloud.
2. Habilita Google Drive API.
3. Comparte la carpeta de políticas con el correo de la Service Account.
4. Copia el ID de la carpeta en `GOOGLE_DRIVE_FOLDER_ID`.
5. Configura `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
6. Configura `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
7. Ejecuta:

```bash
cd backend
npm install
npm run migrate
npm run dev
```

Para sincronizar los documentos:

```http
POST http://localhost:3000/api/ingestion/drive/sync
```

El backend buscará documentos de la carpeta, extraerá texto, dividirá el contenido en chunks y guardará los documentos/chunks en MySQL.

El frontend todavía no expone un botón de sincronización porque esta operación corresponde al proceso de administración/ingesta del backend.
