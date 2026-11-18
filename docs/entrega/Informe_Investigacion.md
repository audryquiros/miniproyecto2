# Nuvexa · Investigación de RRHH y base documental

Costa Rica · Empresa ficticia · 250 colaboradores simulados · 18 de noviembre de 2026


## 1. Contexto, método y fuentes

Nuvexa Solutions es la empresa ficticia utilizada por el equipo para construir un portal interno de consulta de Recursos Humanos en Costa Rica. El sistema tiene dos necesidades distintas: explicar políticas con evidencia documental y consultar cifras exactas de una base de personal. La implementación contiene 250 personas ficticias; ningún registro representa a un trabajador real.

La investigación parte de los diez documentos TXT existentes, redactados en la primera parte del proyecto. Se conservaron sus contenidos. Se contrastaron los requisitos del enunciado con su cobertura, se identificaron preguntas sin cifras suficientes y se consultaron referencias oficiales del MTSS y el sistema jurídico nacional. Esta revisión documenta hallazgos y vacíos; no constituye una aprobación legal de todas las políticas.

Las fuentes primarias revisadas incluyen el Código de Trabajo publicado por el MTSS, la página de asuntos laborales del ministerio, el artículo 95 en el sistema de normativa de la Procuraduría y criterios ministeriales sobre incapacidades. Debe verificarse la vigencia de cada disposición antes de convertir una propuesta académica en una política operativa.

Fuentes: https://www.mtss.go.cr/temas-laborales/ ; https://www.mtss.go.cr/elministerio/marco-legal/documentos/codigo_trabajo_cr.pdf ; https://www.pgrweb.go.cr/DOCS/NORMAS/1/VIGENTE/L/1940-1949/1940-1944/1943/1F6D/180E63.HTML


## 2. Vacaciones, feriados, permisos y licencias

El documento 01 fija para la empresa quince días hábiles por período anual completo y diez días naturales de anticipación para solicitarlos. La aprobación corresponde a la jefatura y se prevé intervención de RRHH ante conflictos. Estos son datos de la política ficticia aportada por el equipo; el chatbot debe citarlos sin confundirlos con un cálculo individual de saldo.

La misma política condiciona la acumulación y el fraccionamiento a la normativa aplicable. Remite al calendario oficial de feriados, pero no incorpora una lista verificable de fechas restantes. El agente debe reconocer esa limitación cuando el usuario pida un calendario que no está en el contexto recuperado. No debe elaborar una lista de memoria.

El documento 02 diferencia permisos generales, maternidad, paternidad, duelo, matrimonio, estudio y ausencia sin goce. Contiene duraciones internas para duelo y matrimonio, además del procedimiento de solicitud. La duración exacta de paternidad no está desarrollada en ese texto, por lo que la respuesta completa del banco de pruebas requiere ampliar la evidencia.

El artículo 95 consultado regula una licencia de paternidad de dos días por semana durante cuatro semanas desde el nacimiento. La publicación jurídica incluye una nota constitucional sobre comaternidad: una ampliación documental debe revisar tanto el texto como esa nota y el régimen de empleo aplicable. No se incorporaron reglas parciales automáticamente al documento original.


## 3. Incapacidades, jornada y remuneración

El documento 03 establece comunicar la incapacidad a jefatura y RRHH cuanto antes, aportar el comprobante por un canal seguro y limitar el acceso a datos médicos. Separa enfermedad común de riesgo de trabajo y dispone seguimiento de la reincorporación. No aporta una tabla completa de porcentajes, bases de cálculo ni excepciones de subsidios.

El criterio ministerial consultado sobre los primeros tres días de incapacidad describe una obligación patronal equivalente a la mitad del salario en el supuesto examinado. Esa referencia aislada no basta para calcular todo caso: hay diferencias de régimen, continuidad y entidad aseguradora. El portal académico conserva la regla de no inventar un monto cuando faltan los datos y la evidencia necesarios.

El documento 04 define una jornada administrativa de referencia y control de asistencia. Las horas extraordinarias requieren autorización, salvo emergencias justificadas. El teletrabajo es voluntario y permite hasta tres días semanales para puestos elegibles con acuerdo y aprobación. Los límites, descansos y excepciones legales requieren validación específica del puesto.

El documento 05 incluye pago quincenal, comprobante, deducciones autorizadas y aguinaldo. El calendario de demostración se genera aparte como datos estructurados y ajusta fines de semana; no incorpora un calendario jurídico de feriados. Esa simplificación se declara para evitar que el calendario simulado se interprete como una planilla real.

Fuente específica sobre incapacidad: https://www.mtss.go.cr/elministerio/estructura/direccion-asuntos-juridicos/pronunciamientos/daj-ae-155-06%20%20pago%20primeros%20tres%20dias.pdf


## 4. Beneficios, ingreso, salida y desempeño

El catálogo 06 contempla seguro colectivo sujeto a póliza y elegibilidad, capacitación con presupuesto interno, programas voluntarios de ahorro y actividades de bienestar. El asistente debe distinguir una posibilidad sujeta a aprobación de un derecho automáticamente concedido. La cobertura médica concreta exige disponer de la póliza; no puede deducirse de la palabra seguro.

El manual 07 reúne onboarding, primer día, seguimiento inicial, período de prueba, renuncia, terminación, prestaciones, devolución de activos y entrevista de salida. Documenta conceptos de liquidación, pero no una calculadora. La consulta sobre el número exacto de días de preaviso necesita antigüedad, régimen y una fuente normativa suficientemente detallada.

La política 08 aborda evaluación y desarrollo. Para responder cuándo es la próxima evaluación de una persona, el agente no debe extraer una fecha genérica del documento: consulta el campo proxima_evaluacion de la persona autenticada. Esta separación evita presentar como cita de política un dato personal que proviene de SQL.

Las necesidades de salida y desempeño también afectan el diseño de datos. Los movimientos de ingreso, salida y ascenso alimentan la rotación; el estado del empleado controla si puede iniciar sesión. La base de demostración conserva movimientos históricos y excluye ausencias anteriores al ingreso o posteriores a una salida registrada. La tasa de rotación declara su numerador, denominador y período.


## 5. Conducta, convivencia y privacidad

El código 09 define conducta y un procedimiento de denuncias. Un portal útil debe recuperar el canal y las condiciones de confidencialidad con citas. No debe prometer anonimato absoluto cuando la fuente solo contempla acceso restringido, ni registrar en un tablero general datos sensibles de una denuncia.

El aviso 10 representa el dominio de protección de datos. En la implementación académica se traduce en sesiones autenticadas, control del rol RRHH y filtros de usuario en las consultas personales. El frontend nunca decide a qué empleado puede consultar: la identidad se obtiene en el backend a partir de la sesión.

Los dos casos restringidos del enunciado —vacaciones de un compañero y salario del gerente— deben rechazarse. La demostración los comprueba mediante pruebas de integración HTTP. La negativa no depende solo de que el modelo interprete una instrucción: las herramientas de datos solo reciben la identidad autenticada y no aceptan un ID arbitrario de la pregunta.

Los registros de chat contienen preguntas y respuestas para trazabilidad. Aunque todos los datos son simulados, su acceso se limita al sistema y al reporte autorizado. Los resultados individuales de evaluación se ignoran por Git. Las credenciales se mantienen en el archivo local .env, las contraseñas se almacenan con scrypt y los tokens de sesión se guardan como hashes. Para un despliegue real se debe definir además la retención, eliminación y gobernanza de estos registros.


## 6. Calidad documental y plan de cierre

Cada política que se publique debe tener título, versión, vigencia y responsable. La copia local original no se modifica para aparentar que ya contiene todos estos campos. Los entregables exportados añaden una portada o encabezado de demostración, y el índice conserva los metadatos disponibles. El equipo debe aprobar una versión documental antes de cargarla como fuente operativa.

La cobertura temática alcanza los diez dominios solicitados. Los principales vacíos de respuesta son el calendario concreto de feriados, detalle de paternidad, cálculo de subsidios y condiciones completas de prueba y preaviso. Reconocer un vacío es un comportamiento seguro, pero no demuestra que el requisito académico de responder correctamente la mayoría del banco esté cumplido.

El plan de cierre es revisar las referencias vigentes, completar únicamente las secciones faltantes con autorización del equipo, publicar los formatos requeridos y sincronizarlos en Drive. Luego se ejecutan las cuarenta y cinco preguntas con el LLM real, se contrasta cada afirmación con la sección citada y se revisan las consultas mixtas y las restricciones de acceso.

Por decisión del usuario, esta sesión dejó las integraciones externas pendientes y habilitó demostración local. El informe permite continuar el trabajo sin rehacer los documentos de la compañera y sin confundir una simulación técnica con una validación normativa. Debe acompañarse con las evidencias finales de Drive, revisión humana, video y presentación del equipo.
