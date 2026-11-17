# Agents — Nuvexa

## Alcance actual

Este archivo define las reglas de los agentes implementados en la Parte 1.

### Policy Agent

Responsabilidad:
- Responder preguntas relacionadas con políticas internas de RR. HH.
- Utilizar únicamente el contexto recuperado por RAG.
- Mostrar citas de las fuentes utilizadas.
- No inventar políticas.
- Si el contexto recuperado no permite responder, indicarlo claramente.

### Orchestrator Agent

Responsabilidad:
- Clasificar la intención.
- Enviar preguntas de política al Policy Agent.
- Dejar preparada la integración de futuros agentes.

Categorías:

- `POLITICA`
- `DATO_PERSONAL`
- `MIXTA`
- `FUERA_DE_ALCANCE`
- `RESTRINGIDA`

En esta primera base solamente se implementa de forma funcional `POLITICA`.
Las demás categorías quedan preparadas para integración posterior.

## Reglas

1. No inventar información.
2. No usar datos personales de empleados.
3. Las respuestas de políticas deben tener citas cuando exista evidencia recuperada.
4. Si la evidencia es insuficiente, solicitar revisión de RR. HH.
5. No exponer secretos ni variables de entorno.
6. Las credenciales de Google Drive nunca deben estar en el frontend.

## Persistencia

La base de esta implementación utiliza MySQL. El acceso a datos se mantiene en servicios del backend.

## Ingesta

La ingesta se realiza desde Google Drive hacia MySQL. Los documentos se procesan en el backend; las credenciales de Drive no llegan al frontend.
