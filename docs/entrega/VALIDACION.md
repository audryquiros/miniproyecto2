# Validación de entrega

Fecha: 19 de noviembre de 2026. Rama feature-wayner.

- npm test: 33 pruebas correctas, incluidas resolución parcial, ausencia de datos, asociación de cifras, independencia del scheduler, control de Voyage y caché de consultas.
- npm run test:integration: 8 pruebas HTTP correctas con MySQL.
- npm run verify:report: ocho componentes y treinta puntos de tendencia comprobados independientemente para el reporte del 19. Los reportes históricos no se sobrescribieron.
- Resumen nuevo: ver resumen-validado.json. Groq redactó la recomendación; los valores se vincularon a sus etiquetas. El borrador se validó sin reemplazar el reporte histórico.
- Instalación limpia: ver instalacion-limpia.json. npm ci de backend/frontend, base dedicada nueva, migración, seed, ingesta demo, reporte, pruebas HTTP y build. La base de prueba se eliminó al finalizar; la base operativa se conservó.
- Drive operativo: catorce archivos, incluido PDF, Google Docs y XLSX. El usuario completó la reindexación con Voyage. La prueba aislada de cambios y bajas está preparada, no ejecutada por falta de carpeta editora.
- Evaluación real de 2026-11-19T15:56:45.106Z: Voyage + Groq, 45 preguntas, 100 % de rutas y HTTP 200, p90 1920 ms. Pausa de 22 segundos entre consultas; esa pausa no se incluye en el tiempo de respuesta. No se extrapola a una ráfaga concurrente ni a una cuenta sin cuota.
- Revisión del asistente: cobertura completa de 39/45 (86,7 %); parciales 5, 6, 7, 12, 13 y 20, explicadas en evaluation/entrega-20261119.json y Excel. La revisión humana sigue pendiente. Las políticas locales corrigen/amplían esos documentos, pero no se presentan como ya publicadas en Drive.
- Informes: investigación de seis páginas y técnico de ocho, con extracción y revisión visual. La hoja Excel conserva fórmulas y deja editar la revisión. Video: cinco minutos, sin audio, con subtítulos y distinción expresa de dos respuestas reproducidas y consultas/pantallas en vivo.

## Límites conservados

Los 250 registros representan una empresa ficticia. La cuenta operativa de Drive es de lectura. La prueba a las 7:00 usa un reloj controlado, no una observación de la mañana siguiente. Los resultados no sustituyen revisión normativa del equipo. No se añadieron las mejoras del punto 7 excluidas por el usuario.
