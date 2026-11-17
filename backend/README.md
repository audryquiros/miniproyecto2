# Backend Nuvexa

Backend Express para la Parte 1.

## Base de datos

Se utiliza **MySQL 8.4**.

```bash
docker compose up -d mysql
npm install
npm run migrate
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
- Integración futura con embeddings y LLM.

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
