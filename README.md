# Nuvexa · Portal de RRHH

Ampliación de la base de políticas, RAG y Drive existente. Desarrollo local en la rama feature-wayner. El chat y los servicios originales se reutilizan; se agregan personal, acceso, reportes y dashboard.

## Inicio local con MySQL instalado

Requisitos: Node.js 22.12 o superior (probado con 24.13), npm y MySQL 8.0/8.4 instalado localmente. El proyecto se ejecuta sin Docker.

1. En backend: npm install. Copia .env.example a .env si aún no existe. Define DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME. Usa una base dedicada, por ejemplo nuvexa.
2. Define SEED_PASSWORD con al menos 12 caracteres. No la publiques. En esta sesión se preparó un archivo local privado con una contraseña aleatoria para las cuentas de prueba.
3. Para demostración: EMBEDDING_PROVIDER=mock y LLM_PROVIDER=mock. SCHEDULER_ENABLED=true activa el reporte diario; el proceso debe permanecer ejecutándose.
4. Ejecuta en backend, en orden: npm run db:create; npm run migrate; npm run seed; npm run ingest:local; npm run report; npm run dev.
5. En otra terminal, dentro de frontend: npm install; npm run dev.
6. Abre http://127.0.0.1:5173. Vite envía /api al backend mediante proxy. No mezcles localhost con 127.0.0.1 entre pestañas al probar las cookies.

Cuentas ficticias: rrhh@nuvexa.test (rol RRHH), colaborador@nuvexa.test (rol colaborador). Ambas usan el valor de SEED_PASSWORD de backend/.env. No hay contraseñas en los archivos versionados. El seed se niega a sobrescribir una base con colaboradores.

El seed se ejecuta únicamente en una base nueva. No lo repitas sobre una base poblada.

## Modo de demostración y modo real

La demo usa recuperación léxica con vectores hash y extractos literales; no es una evaluación semántica con un LLM. Sus fuentes locales tienen enlaces autenticados /api/policies/:id. La interfaz las identifica como demostración. Los documentos reales de Drive y los locales se recuperan por separado.

Para modo real configura EMBEDDING_PROVIDER=local, EMBEDDING_MODEL=Xenova/paraphrase-multilingual-MiniLM-L12-v2, EMBEDDING_DIMENSION=384, LLM_PROVIDER=groq, GROQ_API_KEY y las tres variables de Google Drive de .env.example. No se necesita una API de OpenAI. El modelo openai/gpt-oss-20b se ejecuta en Groq con la clave de Groq; el prefijo es su nombre en ese servicio.

También se admite Voyage AI: configura `VOYAGE_API_KEY`, `EMBEDDING_PROVIDER=voyage`, `VOYAGE_MODEL=voyage-3.5-lite` y `VOYAGE_DIMENSION=1024`. Ejecuta `npm run migrate`, `npm run search:prepare` y `npm run sync:drive`, y reinicia el backend. El modelo local conserva sus propias variables; no mezcles sus dimensiones con las de Voyage. Los documentos se envían como `input_type=document` y las consultas como `input_type=query`. Cambiar proveedor exige reindexar; la firma guardada impide consultar vectores de otro modelo, aunque tengan la misma dimensión. Nunca publiques `.env`.

Ejecuta npm run search:prepare y npm run sync:drive dentro de backend. La primera ejecución descarga el modelo multilingüe a backend/.cache/models; las siguientes reutilizan esa caché. Reinicia el backend tras cambiar .env. La cuenta de servicio necesita acceso de lectura a la carpeta. El dashboard de RRHH también permite sincronizar.

Los originales permanecen en Drive. Se extraen fragmentos con metadatos y se construye una base vectorial LanceDB en backend/.cache/vectors, sin servidor adicional. MySQL conserva el catálogo transaccional y los fragmentos del RAG existente como respaldo reconstruible, además del personal, sesiones, actividad y reportes. La recuperación real usa la distancia coseno de LanceDB exclusivamente sobre documentos de Drive; no utiliza los TXT locales de demostración.

El índice conserva nombre, sección, versión, vigencia y enlace. Sincroniza altas, modificaciones y bajas; utiliza changes.list y reconcilia el inventario completo de la carpeta. Un archivo se reemplaza transaccionalmente después de generar todos sus embeddings. El cambio de modelo o dimensión fuerza su reindexación.

## Programación e historial

SCHEDULER_ENABLED=true ejecuta sincronización desde las 06:00 y reporte desde las 07:00 de America/Costa_Rica, con revisión cada minuto y recuperación de la ejecución pendiente al arrancar. El reporte de una fecha es inmutable. El dashboard solo lee reportes publicados; el botón de generación llama al analista. Un proceso detenido no puede ejecutar tareas: usa un servicio del sistema o un scheduler externo en despliegue.

Los saldos y estados de solicitudes son instantáneas actuales. La tendencia usa movimientos con fechas; no se reconstruyen artificialmente reportes históricos completos con estados actuales.

## Validación

Backend: npm test (lógica), npm run test:integration (API con MySQL y cuentas simuladas), npm run evaluate (45 preguntas contra servidor activo). Frontend: npm run build.

`node scripts/evaluate.js --self-host` en backend inicia una API aislada con el código actual, sin depender de un servidor anterior. La evaluación deja 22 segundos entre preguntas con Voyage y doce con el proveedor local para respetar cuotas; `EVAL_DELAY_MS` permite ajustar esa pausa. No cuenta una respuesta temporalmente no disponible como validación de contenido. `npm run verify:report` valida independientemente los ocho componentes y los treinta puntos de tendencia a partir de registros de MySQL. En frontend, `npm run test:e2e` comprueba el portal con Edge instalado, cuentas ficticias y modo demo aislado; guarda capturas en `test-results/` (ignorado por Git).

El agente de políticas selecciona pasajes mediante el LLM y valida literalmente cada pasaje contra su fragmento antes de mostrarlo. No se acepta una cita válida pegada a una frase inventada. El contexto incorpora secciones vecinas de la misma política; las matrices jurídicas y archivos de revisión se excluyen de las políticas operativas. Si falta una parte se solicita aclaración a RRHH.

La evaluación escribe evaluation/results.json con respuestas y latencias reales de la ejecución, separa enrutamiento de revisión humana y no inventa un porcentaje de exactitud RAG. El archivo de resultados se ignora por Git porque puede contener consultas. El banco versionado está en evaluation/questions.json.

## Carpetas

- backend/src/config, controllers, middleware, routes: configuración HTTP, sesión y permisos.
- backend/src/services/agents: orquestador, políticas y datos.
- backend/src/services/drive, rag, embeddings: base de tu compañera ampliada.
- backend/src/services/personnel, reports, scheduler: nuevos módulos de personal y analítica.
- backend/migrations y scripts: esquema, datos ficticios, evaluación y herramientas de arranque.
- backend/prompts: instrucciones versionadas del orquestador y políticas.
- frontend/src/pages/Chat, Profile, Dashboard: vistas del portal.
- docs/politicas: documentos originales conservados.
- docs/entrega: investigación, informe técnico, arquitectura, guía de demo y evidencia.
- outputs/nuvexa: entregables documentales de esta sesión.

## Pendientes externos de entrega

Drive y Groq se configuran exclusivamente mediante backend/.env. La evaluación real y la revisión de fidelidad de las 45 respuestas se documentan por separado de las pruebas de demostración. Los documentos jurídicos en revisión no equivalen a políticas aprobadas. El video de cinco minutos está incluido: distingue consultas SQL en vivo de respuestas documentales reproducidas de la evaluación real. La presentación de quince minutos y la aprobación del contenido corresponden al equipo. Consulta docs/entrega/ESTADO.md.

## Archivos para revisión

- [Investigación, 6 páginas](outputs/nuvexa/Informe_Investigacion.pdf)
- [Informe técnico, 8 páginas](outputs/nuvexa/Informe_Tecnico.pdf)
- [Hoja de las 45 preguntas](outputs/nuvexa/Evaluacion_45_Preguntas.xlsx)
- [Política en PDF para demostración](outputs/nuvexa/Politica_Vacaciones_Demo.pdf)
- [Calendario de pagos simulado en XLSX](outputs/nuvexa/Calendario_Pagos_Demo.xlsx)
- [Estado de requisitos pendientes](docs/entrega/ESTADO.md)
- [Guion para grabar la demo](docs/entrega/DEMO.md)

## Entrega para revisión conjunta

Consultar docs/entrega/ENTREGA_COMPANERA.md para instalación, cambios y publicación de las políticas 1.1. Las respuestas parciales no cuentan como resueltas. Reporte y Drive se programan independientemente. El resumen asocia cifras y etiquetas SQL y añade una recomendación de Groq. La cola del chat se separa de la ingesta y utiliza caché de embeddings; la cuota de Voyage sigue condicionando la disponibilidad.

- [Guía para la compañera](docs/entrega/ENTREGA_COMPANERA.md)
- [Video de cinco minutos](outputs/nuvexa/Demo_Nuvexa_5min.webm)
- [Evidencia de la evaluación con Voyage](evaluation/entrega-20261119.json)
