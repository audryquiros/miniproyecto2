# Backend Nuvexa

Backend Express para la Parte 1.

## Base de datos

La base de datos MySQL y sus migraciones son responsabilidad del bloque de BD/backend general. Este módulo RAG **no crea tablas ni ejecuta migraciones**.

El contrato requerido para integrar las tablas del RAG está en `RAG_DB_CONTRACT.md`.

```bash
npm install
npm run dev
```

## Endpoints

### Health
`GET /api/health`

### Chat
`POST /api/chat`

```json
{
  "message": "¿Cuántos días de vacaciones establece la política?"
}
```

## Responsabilidades

- Orquestación.
- Agente de políticas.
- RAG.
- Recuperación.
- Integración futura con Google Drive.
- Embeddings semánticos con OpenAI y generación de respuestas con Groq, configurables mediante variables de entorno.

No contiene todavía los agentes que corresponden a la otra parte del proyecto.


## Google Drive

El servicio usa una Service Account y `drive.readonly`.

Endpoint de sincronización:

`POST /api/ingestion/drive/sync`

La carpeta indicada por `GOOGLE_DRIVE_FOLDER_ID` debe estar compartida con la Service Account.

Formatos soportados en esta base:
- Google Docs
- DOCX
- PDF
- TXT
