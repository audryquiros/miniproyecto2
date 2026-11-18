# Contrato de integración RAG

Se conservan policy_documents y policy_chunks. El script npm run migrate incorpora las sentencias CREATE originales y agrega source_revision al documento para detectar cambios y cambios de modelo.

policy_documents: id, drive_file_id único y nullable, document_name, version, effective_date, drive_url, source_revision, created_at, updated_at.
policy_chunks: id, document_id (FK con borrado en cascada), document_name, section, version, effective_date, drive_file_id, drive_url, chunk_index, chunk_text, embedding JSON, created_at.

Los documentos de demostración usan drive_file_id NULL. Los de Drive conservan su ID real. El recuperador separa esas fuentes para no mezclar vectores mock y reales. Los embeddings de modelos distintos requieren reindexar; source_revision incorpora proveedor, modelo y dimensión.

En modo real, los embeddings multilingües se generan localmente con Transformers.js (384 dimensiones), sin API de OpenAI. LanceDB ejecuta la búsqueda vectorial por coseno sobre una proyección reconstruible en backend/.cache/vectors. MySQL conserva los fragmentos y vectores originales como catálogo transaccional compatible con la base de la compañera; los archivos fuente siguen en Drive y nunca se modifican. Cada cambio de IDs o modelo reconstruye la proyección. Las bajas se excluyen de las consultas al reconciliar el catálogo.

La base general añade colaboradores, sesiones, saldos_vacaciones, solicitudes, incapacidades, movimientos_personal, calendario_pagos, consultas_chat, reportes_diarios, ejecuciones_programadas y drive_sync_state. El agente de políticas solo accede a las tablas documentales; el de datos obtiene exclusivamente los registros de la sesión autenticada.
