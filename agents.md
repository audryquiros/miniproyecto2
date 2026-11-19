# Agentes de Nuvexa

La ampliación conserva la base de políticas, RAG, Drive y chat. Solo se permite personal ficticio.

## Responsabilidades

- Orquestador: clasifica intención, recupera memoria por sesión/conversación y combina políticas con datos propios. Rechaza datos ajenos y secretos.
- Políticas: usa exclusivamente fragmentos documentales; muestra las fuentes utilizadas y reconoce evidencia insuficiente. No consulta tablas de personal.
- Datos del colaborador: consultas SQL parametrizadas de solo lectura, filtradas por el usuario autenticado. No acepta IDs arbitrarios de la pregunta.
- Analista: cifras obtenidas de SQL; resumen limitado al JSON; escritura de reportes inmutables. Solo RRHH los consulta.
- Ingesta: única integración con Drive; descarga de solo lectura, extracción, metadatos, embeddings y conciliación de cambios.
- Asistencia: registra entrada/salida del colaborador, calcula horas, genera incidencias para RRHH y nunca aplica una sanción automáticamente.

## Reglas

No inventar información ni usar datos personales reales. Las alertas de asistencia son incidencias administrativas y no equivalen automáticamente a una sanción; RRHH debe revisar el caso antes de registrar una medida disciplinaria. Mantener las credenciales exclusivamente en el backend, nunca en frontend o Git. Si falta evidencia, recomendar revisión de RRHH. No simular que se creó un ticket. En modo demo, identificar las fuentes locales y no presentar resultados como validación del LLM real.

## Persistencia

MySQL conserva separados lógicamente los documentos, el personal, las sesiones, los logs y los reportes. El dashboard lee reportes publicados. Los prompts del orquestador, políticas y analista se versionan en backend/prompts.
