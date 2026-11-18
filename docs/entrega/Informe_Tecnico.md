# Nuvexa · Informe técnico

Implementación sobre la base existente · rama feature-wayner · demostración local


## 1. Problema, alcance y conservación

El portal combina consultas de políticas con datos estructurados y un reporte diario de RRHH. La base existente incluía React, Express, MySQL, cuenta de servicio de Drive, ingesta, embeddings, recuperación y agente de políticas. La ampliación utiliza esos módulos y mantiene los diez TXT originales. No se inicia un segundo proyecto ni se sustituye el trabajo previo.

El alcance implementado añade personal simulado, sesiones, roles, perfil, agente de datos, consultas mixtas, registros del chat, analista, programación y dashboard. La rama verificada al comenzar fue feature-wayner y el árbol no contenía cambios pendientes. Los cambios permanecen locales y no se hizo push ni despliegue.

El modo elegido por el usuario es demostración: no se configuraron proveedores externos. Esto permite probar SQL, roles y flujos HTTP, pero limita las afirmaciones sobre calidad de generación, sincronización real y latencia del modelo. La interfaz y la documentación distinguen explícitamente las fuentes locales de las fuentes de Drive.


## 2. Stack y organización

Express concentra acceso, controladores, middleware y rutas. React conserva el chat y añade páginas de perfil y dashboard. MySQL mantiene dos dominios lógicos: documentos con sus fragmentos, y personal con movimientos, saldos y reportes. Los servicios se separan en agentes, Drive, RAG, embeddings, personal, reportes y programación.

La base documental almacena embeddings como JSON y el recuperador calcula similitud coseno en Node. Se conserva este diseño por compatibilidad y escala académica, sin presentarlo como un índice vectorial especializado. Su costo crece con la cantidad de fragmentos; una evolución a pgvector o Qdrant debe evaluarse si aumenta el corpus o la concurrencia.

Vite utiliza un proxy /api hacia el backend local. Así las cookies se mantienen en el mismo origen del navegador durante desarrollo. El backend escucha en 127.0.0.1 por defecto y permite configurar HOST para despliegue. El build crea un frontend estático; en producción se requiere un reverse proxy hacia Express y HTTPS.


## 3. Datos, migraciones y simulación

El esquema conserva policy_documents y policy_chunks, y agrega colaboradores, sesiones, saldos_vacaciones, solicitudes, incapacidades, movimientos_personal, calendario_pagos, consultas_chat, reportes_diarios, ejecuciones_programadas y drive_sync_state. Las claves externas protegen las relaciones y los índices cubren conversación por usuario, fechas y estados de solicitudes.

El runner de migraciones registra versiones aplicadas y reutiliza las sentencias del esquema RAG original. La creación de base está separada de la creación de tablas. El generador exige una contraseña de demostración y se niega a continuar si existen colaboradores. Los datos se insertan en una transacción; no se borran tablas para facilitar un reintento.

La carga genera 250 personas ficticias, departamentos, solicitudes e incapacidades en un período aproximado de tres meses (90 días) y movimientos de ingreso, salida y ascenso. Excluye solicitudes anteriores al ingreso y posteriores a la salida. Los pagos son simulados con ajuste de fines de semana y una limitación explícita respecto a feriados. El reporte inicial se publicó para la fecha local de trabajo.


## 4. Autenticación, permisos y memoria

Las contraseñas se derivan con scrypt y sal aleatoria. Una sesión usa un token aleatorio; MySQL conserva su hash, el usuario, un token CSRF y expiración. El navegador recibe una cookie HttpOnly, SameSite=Strict y Secure cuando NODE_ENV=production. Los POST privados requieren el token CSRF. El cierre de sesión elimina el registro y revoca el acceso.

El rol se obtiene de MySQL en cada solicitud. Las rutas de reportes e ingesta requieren RRHH; perfil y agente de datos toman exclusivamente req.user.id. Enviar id=1 o colaborador_id=1 desde una cuenta distinta no cambia la identidad consultada. Hay limitación de intentos de inicio de sesión por dirección IP dentro de cada proceso.

La memoria se recupera de las últimas cuatro interacciones de una conversación filtradas por colaborador y conversationId. El identificador de conversación no otorga acceso. En modo real, el clasificador puede reformular referencias a ese historial; los guardas de herramientas siguen limitando los datos accesibles aun si el modelo clasifica mal una pregunta.


## 5. Agentes, prompts y citas

El orquestador clasifica política, dato personal, mixta, reporte, fuera de alcance o restringida. En modo real usa un prompt versionado y salida JSON validada; si falla, usa reglas conservadoras. El agente de datos realiza consultas SQL parametrizadas. En una consulta mixta, el orquestador solicita datos y política y presenta ambos resultados sin convertir la política en un saldo personal.

El agente de políticas recupera fragmentos y pide una respuesta con identificadores de fuente. El backend valida el formato, los IDs existentes y las referencias mencionadas; devuelve únicamente las fuentes declaradas como utilizadas. Esta comprobación mejora trazabilidad, pero no demuestra por sí sola fidelidad semántica: esa propiedad necesita evaluación humana o un validador adicional.

El modo demo genera vectores hash de vocabulario y muestra extractos literales con sus fuentes locales. No usa un modelo semántico y no debe aprobarse como si lo usara. Si la recuperación no supera el umbral o falta respaldo, el agente reconoce la insuficiencia y ofrece revisión de RRHH. La señal de escalamiento se registra, sin simular un ticket que no existe.


## 6. Ingesta y sincronización

La cuenta de servicio de la base original conserva scope de solo lectura. Se admiten Google Docs, PDF, DOCX, TXT, XLSX y Google Sheets. Los documentos de Google se exportan antes de extraer texto. Las hojas se leen por pestañas y se convierten a texto tabular conservando títulos de hoja.

La sincronización consulta changes.list y conserva un token de continuidad. Además reconcilia el inventario completo de la carpeta para contemplar bajas o archivos movidos fuera de ella. Una revisión incorpora fecha de modificación, versión de archivo, proveedor, modelo y dimensión del embedding. Los archivos sin cambios no se reindexan.

Cada documento se procesa antes de reemplazar su índice: se extrae texto, se crean fragmentos con encabezados y se calculan embeddings; después se sustituye el conjunto en una transacción. Un fallo no debe dejar el documento sin sus fragmentos previos. Un bloqueo MySQL evita sincronizaciones concurrentes. No se verificó este recorrido con Drive real porque el usuario eligió no configurar credenciales externas.


## 7. Reportes, scheduler y dashboard

El analista obtiene las ocho secciones exigidas mediante SQL, usando una instantánea consistente para las cifras. Cuenta ausencias por persona, tipo y departamento, solicitudes pendientes y demora, incapacidades y días dentro del mes, movimientos y rotación, saldos de riesgo, uso del chat, temas y preguntas sin respaldo. El resumen real se solicita al LLM y se rechazan cifras ausentes del JSON permitido.

La rotación divide salidas entre el promedio de plantilla al inicio y cierre del período. Los días de incapacidad son la intersección inclusiva con el mes hasta la fecha. El uso del chatbot corresponde al día anterior en Costa Rica; sus timestamps se escriben en UTC. Las fórmulas y límites se conservan en el JSON del reporte.

El scheduler comprueba cada minuto la zona America/Costa_Rica. Programa Drive desde las seis y reportes desde las siete, registra la ejecución y recupera tareas pendientes al reiniciar. El proceso debe seguir activo. El dashboard, reservado a RRHH, lee reportes publicados y muestra cuatro indicadores, tendencia de treinta días, distribución de ausencias, pendientes, resumen e historial. Los reportes son inmutables por fecha.


## 8. Evaluación, evidencia y limitaciones

Las pruebas de lógica verifican contraseñas, intención, chunking, metadatos, vectores demo, números del resumen, fechas y permisos. Las pruebas HTTP con MySQL verifican login, CSRF, aislamiento, trazabilidad, restricciones, comparación del reporte contra SQL, idempotencia y revocación. El build de React se ejecutó correctamente. El detalle de cada ejecución se registra en VALIDACION.md.

El banco incluye veinticinco preguntas del enunciado y veinte adicionales, con intención, rol, respuesta esperada y fuente. La evaluación conserva respuestas y latencias obtenidas. La ejecución demo posterior a las correcciones clasificó las cuarenta y cinco preguntas correctamente. Esa cifra representa enrutamiento y no exactitud de contenido. La hoja reserva una columna editable para revisión humana y evita presentar una aprobación mientras falte esa revisión.

Quedan pendientes los proveedores reales, la verificación de formatos subidos a Drive, la fidelidad y latencia del LLM, la revisión visual automatizada y la grabación de la demo. Existen avisos npm que la corrección compatible no resolvió; una actualización mayor requiere comprobar nuevamente el bloque de Drive y el frontend. Los documentos que remiten genéricamente a la ley también requieren completar evidencia antes de afirmar que el proyecto supera la evaluación final.
