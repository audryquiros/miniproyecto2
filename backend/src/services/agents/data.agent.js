import { getProfile } from "../personnel/personnel.service.js";
export async function dataAgent(message, user) {
  const data = await getProfile(user.id);
  const text = message.toLowerCase();
  const parts = [];
  if (/vacacion|saldo|días.*quedan|dias.*quedan/.test(text)) {
    const balance = data.saldos[0];
    parts.push(
      balance
        ? `Tu saldo del período ${balance.periodo} es de ${balance.dias_disponibles} días disponibles (${balance.dias_asignados} asignados y ${balance.dias_tomados} tomados).`
        : "No hay un saldo registrado para tu usuario.",
    );
  }
  if (/pago|pagan|planilla/.test(text))
    parts.push(
      data.proximo_pago
        ? `Tu próximo pago registrado es el ${data.proximo_pago.fecha}: ${data.proximo_pago.concepto}.`
        : "No hay una próxima fecha de pago registrada.",
    );
  if (/evaluaci[oó]n|desempeño/.test(text))
    parts.push(
      data.proxima_evaluacion
        ? `Tu próxima evaluación está registrada para el ${data.proxima_evaluacion}.`
        : "No hay una próxima evaluación registrada.",
    );
  if (/solicitud|permiso|estado/.test(text)) {
    parts.push(
      data.solicitudes.length
        ? "Tus solicitudes recientes:\n" +
            data.solicitudes
              .slice(0, 10)
              .map(
                (r) =>
                  `#${r.id}: ${r.tipo}, ${r.fecha_inicio} a ${r.fecha_fin}, estado: ${r.estado}.`,
              )
              .join("\n")
        : "No tienes solicitudes registradas.",
    );
  }
  return {
    answer:
      parts.join("\n\n") ||
      `Tu perfil: ${data.nombre}, ${data.puesto}, departamento ${data.departamento}.`,
    citations: [],
    resolved: true,
    escalated: false,
    fragmentIds: [],
  };
}
