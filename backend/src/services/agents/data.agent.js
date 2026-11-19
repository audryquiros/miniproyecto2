import { getProfile } from "../personnel/personnel.service.js";
import { normalize } from "./intent.js";
export function selectRequests(requests, message) {
  const text = normalize(message);
  const id = text.match(/(?:solicitud\s*(?:numero|n[°o.]|#)?\s*|#)(\d+)/)?.[1];
  const date = text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  const weekday = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ].findIndex((d) => text.includes(d));
  return requests.filter(
    (r) =>
      (!id || r.id === Number(id)) &&
      (!/permiso/.test(text) || r.tipo === "permiso") &&
      (!/vacacion/.test(text) || r.tipo === "vacaciones") &&
      (!date || (r.fecha_inicio <= date && r.fecha_fin >= date)) &&
      (weekday < 0 ||
        new Date(r.fecha_inicio + "T12:00:00Z").getUTCDay() === weekday),
  );
}
export async function dataAgent(
  message,
  user,
  { loadProfile = getProfile } = {},
) {
  const data = await loadProfile(user.id);
  const text = message.toLowerCase();
  const parts = [];
  let resolved = true;
  if (/vacacion|saldo|días.*quedan|dias.*quedan/.test(text)) {
    const balance = data.saldos[0];
    if (!balance) resolved = false;
    parts.push(
      balance
        ? `Tu saldo del período ${balance.periodo} es de ${balance.dias_disponibles} días disponibles (${balance.dias_asignados} asignados y ${balance.dias_tomados} tomados).`
        : "No hay un saldo registrado para tu usuario.",
    );
  }
  if (/pago|pagan|planilla/.test(text)) {
    if (!data.proximo_pago) resolved = false;
    parts.push(
      data.proximo_pago
        ? `Tu próximo pago registrado es el ${data.proximo_pago.fecha}: ${data.proximo_pago.concepto}.`
        : "No hay una próxima fecha de pago registrada.",
    );
  }
  if (/evaluaci[oó]n|desempeño/.test(text)) {
    if (!data.proxima_evaluacion) resolved = false;
    parts.push(
      data.proxima_evaluacion
        ? `Tu próxima evaluación está registrada para el ${data.proxima_evaluacion}.`
        : "No hay una próxima evaluación registrada.",
    );
  }
  if (/solicitud|permiso|estado/.test(text)) {
    const requests = selectRequests(data.solicitudes, message);
    if (
      !requests.length ||
      (requests.length > 1 && !/todas|mis solicitudes/i.test(message))
    )
      resolved = false;
    parts.push(
      requests.length
        ? (requests.length > 1 && !/todas|mis solicitudes/i.test(message)
            ? "Hay varias solicitudes que coinciden. Indica su número o fecha para identificar una:\n"
            : "Solicitudes propias que coinciden:\n") +
            requests
              .map(
                (r) =>
                  `#${r.id}: ${r.tipo}, ${r.fecha_inicio} a ${r.fecha_fin}, estado: ${r.estado}.`,
              )
              .join("\n")
        : "No encontré una solicitud propia que coincida. Indica el número o la fecha exacta (AAAA-MM-DD).",
    );
  }
  return {
    answer:
      parts.join("\n\n") ||
      `Tu perfil: ${data.nombre}, ${data.puesto}, departamento ${data.departamento}.`,
    citations: [],
    resolved,
    escalated: false,
    fragmentIds: [],
  };
}
