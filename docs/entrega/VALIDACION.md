# Evidencia de validación local

Fecha: 18 de noviembre de 2026. Rama feature-wayner. Base dedicada MySQL local: nuvexa.

## Comprobaciones realizadas

- npm run db:create: base disponible sin modificar otras bases.
- npm run migrate: esquema completo y reejecución sin errores.
- npm run seed: 250 colaboradores ficticios; tres meses aproximados de movimientos. La primera inserción fallida se revirtió por transacción y se corrigió el orden de aprobadores antes de cargar.
- npm run ingest:local: diez políticas indexadas; documentos TXT originales conservados.
- npm run report: reporte inicial publicado para 2026-11-18.
- npm test: 12 pruebas de lógica, privacidad, metadatos, parser PDF/XLSX y validación de IDs de citas. Todas pasaron.
- npm run test:integration: 8 pruebas HTTP contra MySQL. Todas pasaron. Incluyen sesión, rechazo de contraseña, cookies, CSRF, separación de roles, identidad no manipulable, logs, comparación con SQL, idempotencia y logout.
- npm run evaluate: 45 preguntas ejecutadas por HTTP en modo mock; 45 intenciones correctas. La exactitud de contenido sigue sin aprobarse. Los tiempos exactos de la última ejecución están en evaluation/results.json y la hoja exportada.
- npm run build en frontend: compilación de producción exitosa.
- PDFs: investigación de 6 páginas e informe técnico de 8 páginas. Extracción y render de las páginas revisados; no equivalen a una aprobación del contenido académico o legal.
- XLSX: exportación, fórmulas y vistas de evaluación/calendario comprobadas. Revisión humana de respuestas reservada en columnas editables.

## Límites de la evidencia

No se validaron Drive, OpenAI ni Groq contra servicios externos, según la decisión del usuario de conservar el modo demo. No se afirma el 80% de exactitud de contenido ni el p90 real del LLM. El navegador de automatización no estuvo disponible; la interfaz requiere revisión visual en el equipo. No se grabó el video.

## Dependencias

La instalación produjo lockfiles. npm audit fix compatible no resolvió 4 avisos moderados del árbol de googleapis/uuid en backend y 4 altos del árbol de desarrollo de Vite/picomatch en frontend. No se aplicó --force ni una actualización mayor que pudiera romper la base existente. Deben reevaluarse antes de despliegue.
