export async function generatePolicyAnswer(message, context) {
  if (process.env.LLM_PROVIDER === "mock") {
    return `Respuesta de prueba para: "${message}". La respuesta real se generará utilizando el contexto recuperado de las políticas.`;
  }

  // Punto de integración para el proveedor LLM seleccionado.
  // No se mezcla esta responsabilidad con retrieval.
  throw new Error("Proveedor LLM no configurado.");
}
