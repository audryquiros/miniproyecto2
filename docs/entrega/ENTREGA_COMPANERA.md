# Revisión conjunta de Nuvexa

Rama de trabajo: `feature-wayner`. Fecha: 19 de noviembre de 2026.

## Cómo revisar

1. Traer esta rama y leer README.md. No copiar las credenciales de otra persona ni versionar `.env`.
2. Instalar dependencias con `npm ci` en backend y frontend.
3. Preparar una base MySQL propia: `npm run db:create`, `npm run migrate`, `npm run seed`. El seed crea 250 colaboradores ficticios y se niega a sobrescribir una base poblada.
4. Para demo local, usar ambos proveedores `mock` y ejecutar `npm run ingest:local`, `npm run report`. Para uso real, configurar Drive, Voyage y Groq y ejecutar `npm run sync:drive`.
5. Iniciar backend con `npm start` y frontend con `npm run dev`. Las cuentas son `colaborador@nuvexa.test` y `rrhh@nuvexa.test`; la contraseña se define localmente en `SEED_PASSWORD`.

## Cambios que deben revisarse

- Ingesta Voyage con lotes, control de 429 y reintentos. La cola del chat se separa de la ingesta y la caché guarda solo embeddings de consulta durante treinta minutos.
- Respuestas incompletas y datos ausentes ya no cuentan como resueltos. Una respuesta mixta necesita resolver ambas partes.
- Las cifras del resumen están ligadas a etiquetas fijas; Groq redacta la recomendación. Esto evita intercambiar valores válidos de distintos indicadores.
- Reporte y Drive se programan independientemente; una sincronización lenta no bloquea el reporte de las 7:00.
- Políticas locales versión 1.1 con metadatos, manifiesto y ampliaciones documentadas. No se cambiaron reglas de seguridad, seguimientos, mensajes de espera en la interfaz ni trazas individuales por agente.

## Publicación de políticas: Persona 1

Los diez TXT de `docs/politicas/` son la versión local propuesta para esta entrega. Revisar el diff, especialmente paternidad/comaternidad, duelo, preaviso, período de prueba y calendario 2026. Conservar las fuentes y las diferencias entre beneficios internos y mínimos legales.

La cuenta operativa del backend es de lectura. Este trabajo no reemplazó archivos de Drive ni cambió permisos. Tras la revisión del equipo, actualizar las copias correspondientes en Drive y sincronizar. Cuando existan PDF y Google Docs del mismo documento, mantener contenido y versión coherentes. Una matriz jurídica no sustituye una política interna. La aprobación humana no se representa como realizada por el asistente.

## Prueba aislada de Drive preparada

El usuario confirmó que no hay carpeta de prueba con acceso editor. `npm run test:drive` requiere `DRIVE_TEST_FOLDER_ID` distinta de la carpeta operativa, compartida como editora con la cuenta de servicio. Solo crea, actualiza y envía a papelera un archivo ficticio con nombre aleatorio. No ejecutar contra la carpeta de políticas. La prueba preparada no se presenta como una validación real ya realizada.

## Evidencia y entregables

- `VALIDACION.md` y `instalacion-limpia.json`: pruebas y entorno aislado.
- `outputs/nuvexa/Evaluacion_45_Preguntas.xlsx`: respuestas y tiempos de la ejecución indicada en la hoja. La columna de revisión humana queda editable.
- Informes PDF de investigación y técnico, junto con sus fuentes editables en esta carpeta.
- `DEMO.md`: guion de quince minutos y recorrido del video de respaldo.
- `outputs/nuvexa/Demo_Nuvexa_5min.webm`: video con subtítulos, sin audio; las respuestas documentales reproducidas están identificadas.
- `evaluation/entrega-20261119.json`: ejecución Voyage real y revisión del asistente. Cobertura completa 39/45; seis parciales por vacíos o versiones antiguas de Drive. No confundir con 45/45 de enrutamiento.

## Antes de subir o integrar

Revisar `git diff`, confirmar que `.env`, cachés y node_modules siguen ignorados y comprobar la evidencia con los comandos del README. Subir la rama de trabajo sin sobrescribir main. Integrar después de la revisión conjunta. El video y los resultados no sustituyen la aprobación del contenido normativo.
