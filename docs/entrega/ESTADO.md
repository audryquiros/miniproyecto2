# Estado verificable de entrega

Fecha de trabajo: 18 de noviembre de 2026. Rama: feature-wayner.

## Implementado y probado localmente

Esquema MySQL, 250 colaboradores simulados, solicitudes y movimientos de tres meses, sesiones y roles, agente de datos, enrutamiento mixto, logs del chat, analista, reporte persistido, dashboard y fuentes locales de demostración. La compilación React y las pruebas de lógica e integración se ejecutaron. Consultar VALIDACION.md para resultados de la última ejecución.

## Implementado sin validación contra servicios externos

Cuenta de servicio y lector de Drive de la base existente, detección de cambios/bajas, reemplazo transaccional, XLSX/Google Sheets y programación diaria. Embeddings OpenAI, generación Groq y clasificación con LLM. No se proporcionaron credenciales por decisión del usuario; no se ejecutaron llamadas externas ni se alteró Drive.

## Pendientes que no se pueden presentar como completos

- Conectar la carpeta real de Drive y comprobar al menos PDF, Google Docs y hoja de cálculo.
- Ejecutar las 45 preguntas con los proveedores reales y revisar cada respuesta contra su fuente. El umbral de 80% y p90 menor a ocho segundos siguen pendientes para ese modo.
- Completar con RRHH las políticas que remiten a la ley sin detallar cifras. Se conservan los documentos originales de la compañera.
- Revisar contenido normativo con fuentes vigentes; la investigación documenta fuentes y vacíos, no una aprobación legal.
- Revisión visual en navegador: el host de automatización no estuvo disponible. Build e integración HTTP no sustituyen revisión de presentación.
- Grabar el video de cinco minutos y realizar la presentación de quince minutos.
- Revisar los avisos npm pendientes. audit fix compatible no los corrigió y no se forzó una actualización mayor del bloque de Drive.

## Conservación

Los diez TXT originales no se reemplazan. Se reutilizan los componentes de chat/citas y los servicios RAG/Drive; se modifican únicamente para integrar acceso, metadatos, sincronización y respaldo de citas. No se cambió de rama, no se hizo push ni se publicó el portal.
