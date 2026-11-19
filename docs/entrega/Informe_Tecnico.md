# Nuvexa · Informe técnico

Costa Rica · Nuvexa ficticia · 250 colaboradores simulados · 19 de noviembre de 2026


## 1. Problema, alcance y conservación

El portal combina consultas documentales y datos estructurados de personal. El alcance implementado incluye cinco responsabilidades de agente, autenticación, datos propios, registro del chat, reportes y dashboard de RRHH. Los 250 colaboradores son ficticios. El trabajo se mantiene en feature-wayner para revisión conjunta con Persona 1.

Esta entrega conserva los componentes de chat y la integración Drive originales. Añade control de evidencia, soporte Voyage, reportes y pruebas. Las mejoras excluidas por el usuario —nuevas reglas de seguridad, seguimientos, mensajes de espera y trazas individuales por agente— no se incorporan en esta fase.

El repositorio es la fuente reproducible. Las credenciales permanecen en backend/.env, ignorado por Git. Las evidencias versionadas describen el proveedor de cada ejecución y distinguen revisión del asistente de aprobación humana. La demostración no representa un sistema de personal real.

El recorrido de aceptación comienza con una sesión de colaborador: primero se solicita una política con citas y después un saldo propio. Se comprueba una consulta mixta y un rechazo de datos ajenos. Al cambiar a RRHH se verifica el dashboard y un reporte histórico. Este recorrido separa las fuentes de verdad y ayuda a revisar responsabilidades sin depender de una captura de pantalla aislada. La entrega conserva tanto el código como las evidencias editables para que la compañera pueda repetir el procedimiento.


## 2. Stack y organización

La aplicación usa Node.js y Express, React con Vite y MySQL. El enunciado permite estas alternativas; la elección aprovecha el entorno MySQL del usuario. LanceDB conserva una proyección vectorial reconstruible. Los documentos de Drive y el personal se mantienen separados lógicamente.

Voyage AI genera embeddings mediante su API REST con voyage-3.5-lite y 1024 dimensiones. La ingesta usa input_type=document y la búsqueda input_type=query. La firma de proveedor, modelo y dimensión evita consultar vectores de otro modelo. El modelo multilingüe local y el modo mock se conservan como opciones explícitas.

La ingesta usa lotes y pausas configurables con Retry-After y reintentos limitados. El chat tiene una cola independiente y caché temporal de embeddings de preguntas, sin almacenar saldos ni respuestas personales en esa caché. Una cuenta con cuota insuficiente todavía puede limitar la disponibilidad; no se garantiza carga concurrente ilimitada.

La configuración privada define proveedores y modelos, pero la instalación no los necesita para demostrar los flujos básicos: el modo mock es una opción explícita. No se comparan sus tiempos con los del servicio real. La instalación limpia se ejecutó con mock para comprobar dependencias, esquema y contratos sin consumir cuota. La evaluación real se realizó aparte con Voyage y Groq, manteniendo el mismo control de acceso y la misma API.


## 3. Datos, migraciones y simulación

El esquema conserva policy_documents y policy_chunks, y agrega colaboradores, sesiones, saldos_vacaciones, solicitudes, incapacidades, movimientos_personal, calendario_pagos, consultas_chat, reportes_diarios, ejecuciones_programadas y drive_sync_state. Las claves externas protegen las relaciones y los índices cubren conversación por usuario, fechas y estados de solicitudes.

El runner de migraciones registra versiones aplicadas y reutiliza las sentencias del esquema RAG original. La creación de base está separada de la creación de tablas. El generador exige una contraseña de demostración y se niega a continuar si existen colaboradores. Los datos se insertan en una transacción; no se borran tablas para facilitar un reintento.

La carga genera 250 personas ficticias, departamentos, solicitudes e incapacidades en un período aproximado de tres meses (90 días) y movimientos de ingreso, salida y ascenso. Excluye solicitudes anteriores al ingreso y posteriores a la salida. Los pagos son simulados con ajuste de fines de semana y una limitación explícita respecto a feriados. El reporte inicial se publicó para la fecha local de trabajo.

Las relaciones de personal se crean mediante migraciones y la carga usa una transacción para no dejar un seed incompleto. El estado del colaborador y sus movimientos históricos tienen propósitos distintos: el primero controla el acceso y los movimientos permiten reconstruir cifras del período. El reporte conserva metodología e instantáneas. No se generan retrospectivamente estados históricos de solicitudes a partir de su estado actual sin advertir esa limitación.


## 4. Autenticación, permisos y memoria

Las contraseñas se derivan con scrypt y sal aleatoria. Una sesión usa un token aleatorio; MySQL conserva su hash, el usuario, un token CSRF y expiración. El navegador recibe una cookie HttpOnly, SameSite=Strict y Secure cuando NODE_ENV=production. Los POST privados requieren el token CSRF. El cierre de sesión elimina el registro y revoca el acceso.

El rol se obtiene de MySQL en cada solicitud. Las rutas de reportes e ingesta requieren RRHH; perfil y agente de datos toman exclusivamente req.user.id. Enviar id=1 o colaborador_id=1 desde una cuenta distinta no cambia la identidad consultada. Hay limitación de intentos de inicio de sesión por dirección IP dentro de cada proceso.

La memoria se recupera de las últimas cuatro interacciones de una conversación filtradas por colaborador y conversationId. El identificador de conversación no otorga acceso. En modo real, el clasificador puede reformular referencias a ese historial; los guardas de herramientas siguen limitando los datos accesibles aun si el modelo clasifica mal una pregunta.

Las comprobaciones HTTP prueban solicitudes sin sesión, contraseña incorrecta, CSRF, separación de roles e identidad no manipulable por querystring. Estas pruebas verifican controles existentes, sin ampliar las reglas de clasificación excluidas por el usuario. Los secretos se suministran en variables privadas y no viajan en el frontend. La revisión para Git incluye archivos ignorados y búsqueda de claves literales en los archivos que se van a compartir.


## 5. Agentes, prompts y citas

El orquestador conserva rutas explícitas mediante reglas y utiliza el LLM para resolver expresiones ambiguas. Las herramientas personales reciben la identidad de sesión. Una consulta mixta combina el saldo SQL y la política, y solo se registra como resuelta si ambas partes lo están.

El agente de políticas pide al LLM pasajes e identificadores de fuente. Antes de mostrar cada pasaje se verifica que esté literalmente contenido en su fragmento. La selección incorpora secciones vecinas para conservar condiciones y excepciones. Una referencia válida no autoriza una frase inventada.

Las respuestas parciales conservan la necesidad de aclaración y no inflan el indicador de resolución. Tampoco se marca como resuelto un dato personal ausente o una solicitud ambigua. Se conserva el registro conjunto del chat; no se añadieron trazas individuales por agente, excluidas del alcance por el usuario.

Un ejemplo de respuesta parcial es maternidad y paternidad cuando Drive solo detalla una duración. Puede mostrarse el pasaje respaldado y solicitar aclaración de la otra parte. Esa respuesta se conserva en la evaluación como parcial y no como una solución completa. El control literal prueba presencia del texto, pero no certifica la vigencia de una política ni la pertinencia total de su selección; por eso se conserva revisión del contenido.


## 6. Ingesta y sincronización

La integración real confirmó catorce archivos: un PDF, un Google Docs, un XLSX y once TXT. El usuario ejecutó satisfactoriamente la reindexación con Voyage. La cuenta operativa de servicio mantiene acceso de lectura; los archivos originales no se modificaron desde el backend.

La sincronización usa changes.list, revisión de inventario y reemplazo transaccional por documento. Un documento no pierde su índice anterior hasta completar sus nuevos embeddings. La firma fuerza reindexación al cambiar el modelo. Los archivos sin cambios se conservan.

Las políticas locales incorporan versión 1.1, vigencia, responsable y un manifiesto SHA-256. Persona 1 debe publicar esas versiones en Drive para que el RAG utilice las ampliaciones. La prueba de alta, cambio y baja está preparada para una carpeta aparte con permiso editor; no se ejecutó porque el usuario confirmó que no dispone de ella.

Cambiar el documento de Drive actualiza su revisión y sus embeddings; volver a sincronizar un archivo sin cambios no debería consumir otra generación. La reconciliación contempla archivos ausentes del inventario. Para probarlo de forma destructiva solo se preparó un archivo ficticio en una carpeta aislada: no se reutiliza la carpeta operativa. El equipo debe proporcionar esa carpeta y ejecutar la prueba, conservando la evidencia de cambios y bajas sin alterar políticas reales.


## 7. Reportes, scheduler y dashboard

El reporte conserva los ocho componentes del enunciado y una serie de treinta días. Las cifras salen de SQL y quedan almacenadas en reportes_diarios. La comprobación independiente reconstruye los resultados desde registros base. El dashboard consume reportes publicados, sin pedir al LLM que calcule indicadores.

El resumen usa cuatro frases con etiquetas y valores vinculados en código, más una recomendación operativa escrita por Groq. Se rechazan recomendaciones con cifras o afirmaciones cuantitativas. Así se impide intercambiar números válidos entre indicadores. El modo mock se identifica como plantilla de demostración.

El scheduler trata Drive y reporte como tareas independientes, con exclusión por tarea e idempotencia por fecha. Una sincronización prolongada ya no bloquea el reporte desde las 7:00 de Costa Rica. Se comprobó ese límite horario con reloj controlado. El proceso debe estar activo; un arranque posterior recupera la tarea pendiente y no se presenta como ejecución real a las 7:00.

Los indicadores incluyen ausencias por tipo y departamento, solicitudes pendientes y demora, incapacidades, movimientos y rotación, vacaciones acumuladas, uso del chat, temas y vacíos documentales. El dashboard muestra una instantánea publicada y permite elegir fechas. Una cifra de personas de vacaciones en el chat de RRHH corresponde a ese reporte y se presenta con su fecha, para no prometer que incluye modificaciones posteriores a la publicación.


## 8. Evaluación, evidencia y limitaciones

El banco conserva las veinticinco preguntas del enunciado y veinte del equipo. Cada fila incluye respuesta esperada, obtenida, fuente y latencia. La hoja Excel mantiene una columna editable de revisión humana. El enrutamiento se calcula por separado del contenido. Las pausas entre preguntas no forman parte de la latencia medida.

La ejecución registrada usa voyage: 45 preguntas, p90 1920 ms y enrutamiento 100.0%. Estos valores se actualizan con la ejecución final; no equivalen automáticamente a exactitud de contenido.

La batería de lógica incluye resolución parcial, asociación de cifras, colas de Voyage y scheduler independiente. Se conservan pruebas HTTP con MySQL, compilación y revisión de interfaz. El cierre incluye un video de cinco minutos y un guion de quince minutos. Los límites pendientes —publicación de políticas 1.1, prueba aislada de Drive y aprobación del equipo— se documentan en ENTREGA_COMPANERA.md.

El resultado de la evaluación no se resume únicamente en HTTP 200. Se conservaron respuestas parciales y su causa. El contenido completo se revisó con un criterio conservador por el asistente y se dejó abierto a la validación del equipo. Las ampliaciones locales mejoran la cobertura futura, pero no cambian retroactivamente la evidencia obtenida de Drive. El video de respaldo documenta esa distinción y no presenta una reproducción de respuestas como una llamada nueva al proveedor.
