from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
r=json.loads((root/'evaluation/results.json').read_text(encoding='utf-8'))
assert r['embeddings']=='voyage' and r['total']==45
notes={5:'Parcial: Drive conserva duelo antiguo; la versión local 1.1 corrige suegros y referencia la Ley 10589.',6:'Parcial: falta publicar en Drive la duración de paternidad ampliada en la versión local.',7:'Parcial: no calcula importe sin régimen y base; evita inventar montos.',12:'Parcial: reconoce el vacío; falta publicar la explicación local de tres meses.',13:'Parcial: faltan los tramos de preaviso en Drive; ya se ampliaron localmente.',20:'Parcial: remite al calendario sin enumerar los feriados restantes; calendario local preparado.'}
for item in r['results']:
    item['assistantContentComplete']=item['id'] not in notes
    item['assistantReviewNotes']=notes.get(item['id'],'Respuesta contrastada con el banco y la evidencia citada o SQL. Aprobación del equipo pendiente.')
r.update(reviewer='asistente',humanReviewPending=True,reviewCriteria='Cobertura completa, respaldo y manejo seguro. Las respuestas parciales se puntúan No.',assistantContentAccuracy=39/45)
(root/'evaluation/entrega-20261119.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
p=root/'docs/entrega/ESTADO.md'
p.write_text('''# Estado de entrega de Nuvexa

19 de noviembre de 2026. Rama feature-wayner. Personal 100 % ficticio.

## Implementado y comprobado

MySQL con 250 colaboradores, sesiones y roles, datos propios, RAG conectado a Drive, embeddings Voyage y respuestas con pasajes comprobados. Ingesta con pausas y reintentos; cola de consultas independiente y caché de vectores. Las respuestas parciales y los datos ausentes no inflan la resolución. Reporte de ocho componentes, tendencia de treinta días y dashboard protegido para RRHH.

El resumen enlaza etiquetas y valores SQL en código y añade una recomendación de Groq. Drive y reporte se ejecutan como tareas independientes. Se verificó con reloj controlado que una sincronización iniciada antes de las 7:00 no impide iniciar el reporte a esa hora; eso no se presenta como una observación de reloj real a las 7:00.

La instalación limpia pasó en una copia y base nuevas. Los PDF, evaluación Excel, arquitectura y guía de la compañera se actualizaron. El video de respaldo distingue SQL en vivo de dos respuestas documentales reales reproducidas para no consumir cuota. No tiene audio; usa subtítulos.

## Evidencia

33 pruebas de lógica y 8 HTTP correctas. Evaluación con Voyage: 45/45 HTTP 200, 45/45 rutas correctas, p90 de 1920 ms y 45/45 por debajo de ocho segundos, con pausas entre preguntas. Revisión del asistente: 39 respuestas completas y 6 parciales, 86,7 %. No es aprobación humana ni garantía de carga concurrente.

## Pendientes externos explícitos

El equipo debe revisar y publicar las políticas locales 1.1 en Drive y mantener coherentes sus formatos. La cuenta operativa conserva solo lectura. El usuario confirmó que no hay carpeta aislada con permiso editor: la prueba de alta/cambio/baja se dejó preparada y no se ejecutó. La aprobación del contenido y la presentación de quince minutos corresponden al equipo.

Las cuatro mejoras excluidas por el usuario no se implementaron: nuevas reglas/preguntas de seguridad, seguimientos, mensajes de espera en la interfaz y trazas individuales por agente. Consultar ENTREGA_COMPANERA.md.
''',encoding='utf-8')
(root/'docs/entrega/VALIDACION.md').write_text(f'''# Validación de entrega

Fecha: 19 de noviembre de 2026. Rama feature-wayner.

- npm test: 33 pruebas correctas, incluidas resolución parcial, ausencia de datos, asociación de cifras, independencia del scheduler, control de Voyage y caché de consultas.
- npm run test:integration: 8 pruebas HTTP correctas con MySQL.
- npm run verify:report: ocho componentes y treinta puntos de tendencia comprobados independientemente para el reporte del 19. Los reportes históricos no se sobrescribieron.
- Resumen nuevo: ver resumen-validado.json. Groq redactó la recomendación; los valores se vincularon a sus etiquetas. El borrador se validó sin reemplazar el reporte histórico.
- Instalación limpia: ver instalacion-limpia.json. npm ci de backend/frontend, base dedicada nueva, migración, seed, ingesta demo, reporte, pruebas HTTP y build. La base de prueba se eliminó al finalizar; la base operativa se conservó.
- Drive operativo: catorce archivos, incluido PDF, Google Docs y XLSX. El usuario completó la reindexación con Voyage. La prueba aislada de cambios y bajas está preparada, no ejecutada por falta de carpeta editora.
- Evaluación real de {r['generatedAt']}: Voyage + Groq, 45 preguntas, 100 % de rutas y HTTP 200, p90 {r['p90LatencyMs']} ms. Pausa de 22 segundos entre consultas; esa pausa no se incluye en el tiempo de respuesta. No se extrapola a una ráfaga concurrente ni a una cuenta sin cuota.
- Revisión del asistente: cobertura completa de 39/45 (86,7 %); parciales 5, 6, 7, 12, 13 y 20, explicadas en evaluation/entrega-20261119.json y Excel. La revisión humana sigue pendiente. Las políticas locales corrigen/amplían esos documentos, pero no se presentan como ya publicadas en Drive.
- Informes: investigación de seis páginas y técnico de ocho, con extracción y revisión visual. La hoja Excel conserva fórmulas y deja editar la revisión. Video: cinco minutos, sin audio, con subtítulos y distinción expresa de dos respuestas reproducidas y consultas/pantallas en vivo.

## Límites conservados

Los 250 registros representan una empresa ficticia. La cuenta operativa de Drive es de lectura. La prueba a las 7:00 usa un reloj controlado, no una observación de la mañana siguiente. Los resultados no sustituyen revisión normativa del equipo. No se añadieron las mejoras del punto 7 excluidas por el usuario.
''',encoding='utf-8')
print('Evidencia y estado actualizados con resultados reales y límites explícitos.')
