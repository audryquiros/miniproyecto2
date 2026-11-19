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
  V --> E[Voyage: embedding de consulta y caché temporal]
  V --> VECTOR[(LanceDB local: búsqueda vectorial)]
  DOC[(MySQL: catálogo y respaldo de fragmentos)] --> VECTOR
  P --> GROQ[Groq: respuesta con fuentes]
  O --> GROQ
  D --> HR[(MySQL: personal, saldos, solicitudes y pagos)]
  O --> LOG[(MySQL: consultas_chat)]
  S[Scheduler: zona Costa Rica] --> I[Agente de ingesta]
  I --> DRIVE[Google Drive: solo lectura]
  I --> DOC
  I --> E2[Voyage: embeddings de documentos con pausas y reintentos]
  S --> A[Agente analista]
  A --> HR
  A --> LOG
  A --> LLM[LLM: resumen con cifras del JSON]
  A --> REP[(MySQL: reportes_diarios)]
  R --> REP
  AUTH --> REP
```

Drive conserva los originales. El agente de ingesta extrae texto y metadatos y genera embeddings de documentos con Voyage; sus pausas no se transfieren a la cola del chat. Las consultas usan el mismo modelo y dimensión, con caché temporal de sus vectores. MySQL conserva catálogo, fragmentos y personal separados. LanceDB ejecuta la búsqueda vectorial. Groq selecciona pasajes que se validan literalmente y redacta la recomendación del resumen; las cifras del reporte se vinculan a etiquetas en código. El scheduler inicia reporte y Drive independientemente. No se llama a la API de OpenAI; se mantienen proveedores local y mock como alternativas explícitas.

Las políticas locales 1.1 están preparadas para revisión/publicación. La evidencia real corresponde a los archivos de Drive durante la evaluación; no se asume que la copia local ya fue publicada.
