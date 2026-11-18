# Arquitectura de Nuvexa

```mermaid
flowchart TD
  U[Colaborador o RRHH] --> UI[React: acceso, chat, perfil y dashboard]
  UI --> AUTH[Express: sesión HttpOnly, CSRF y rol]
  AUTH --> O[Orquestador: intención y memoria por usuario]
  O --> P[Agente de políticas]
  O --> D[Agente de datos propios]
  O --> R[Reporte publicado: solo RRHH]
  P --> V[Recuperación: fragmentos y embeddings]
  V --> VECTOR[(LanceDB local: búsqueda vectorial)]
  DOC[(MySQL: catálogo y respaldo de fragmentos)] --> VECTOR
  P --> GROQ[Groq: respuesta con fuentes]
  O --> GROQ
  D --> HR[(MySQL: personal, saldos, solicitudes y pagos)]
  O --> LOG[(MySQL: consultas_chat)]
  S[Scheduler: zona Costa Rica] --> I[Agente de ingesta]
  I --> DRIVE[Google Drive: solo lectura]
  I --> DOC
  S --> A[Agente analista]
  A --> HR
  A --> LOG
  A --> LLM[LLM: resumen con cifras del JSON]
  A --> REP[(MySQL: reportes_diarios)]
  R --> REP
  AUTH --> REP
```

Drive conserva los originales. El agente de ingesta descarga únicamente para extraer texto, metadatos y fragmentos; genera embeddings multilingües localmente con Transformers.js. MySQL mantiene el catálogo transaccional de la base existente y los datos del personal en tablas separadas. LanceDB es la base vectorial local reconstruible y ejecuta la búsqueda por coseno. No requiere Docker ni un servidor adicional. Groq clasifica consultas, redacta respuestas documentales con citas y genera el resumen del analista; no se llama a la API de OpenAI.
