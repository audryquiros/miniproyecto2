import { policyAgent } from "./policy.agent.js";

function classify(message) {
  const text = message.toLowerCase();

  const policyTerms = [
    "vacaciones", "feriado", "permiso", "licencia",
    "incapacidad", "teletrabajo", "jornada", "horario",
    "salario", "pago", "beneficio", "onboarding",
    "despido", "salida", "evaluación", "desempeño",
    "conducta", "denuncia", "privacidad", "política"
  ];

  if (policyTerms.some(term => text.includes(term))) {
    return "POLITICA";
  }

  return "FUERA_DE_ALCANCE";
}

export async function orchestrator(message) {
  const intent = classify(message);

  if (intent === "POLITICA") {
    const result = await policyAgent(message);

    return {
      agent: "policy",
      intent,
      ...result
    };
  }

  return {
    agent: "orchestrator",
    intent,
    answer:
      "Esta pregunta no corresponde todavía a los servicios implementados en esta parte del proyecto. Puedo ayudarte con las políticas de RR. HH. de Nuvexa.",
    citations: []
  };
}
