import { query } from "../../config/database.js";

export async function listRequests(status = "pendiente") {
  const allowed = new Set(["pendiente", "aprobada", "rechazada", "todas"]);
  if (!allowed.has(status)) {
    throw Object.assign(new Error("Estado de solicitud inválido."), { status: 400 });
  }

  const where = status === "todas" ? "" : "WHERE s.estado=?";
  const params = status === "todas" ? [] : [status];

  const rows = (
    await query(
      `SELECT s.id, s.colaborador_id, c.nombre, c.email, c.departamento, c.puesto,
              s.tipo, s.fecha_inicio, s.fecha_fin, s.estado, s.creada_en,
              a.nombre AS aprobador_nombre
       FROM solicitudes s
       JOIN colaboradores c ON c.id=s.colaborador_id
       LEFT JOIN colaboradores a ON a.id=s.aprobador_id
       ${where}
       ORDER BY CASE s.estado WHEN 'pendiente' THEN 0 ELSE 1 END, s.creada_en DESC`,
      params,
    )
  ).rows;

  return rows.map((r) => ({
    ...r,
    dias: Math.floor(
      (new Date(`${r.fecha_fin}T00:00:00Z`) -
        new Date(`${r.fecha_inicio}T00:00:00Z`)) /
        86400000,
    ) + 1,
  }));
}

export async function updateRequestStatus(id, status, approverId) {
  if (!["aprobada", "rechazada"].includes(status)) {
    throw Object.assign(new Error("La solicitud solo puede aprobarse o rechazarse."), {
      status: 400,
    });
  }

  const existing = (
    await query("SELECT id, estado FROM solicitudes WHERE id=?", [id])
  ).rows[0];

  if (!existing) {
    throw Object.assign(new Error("Solicitud no encontrada."), { status: 404 });
  }

  if (existing.estado !== "pendiente") {
    throw Object.assign(new Error("Esta solicitud ya fue revisada."), { status: 409 });
  }

  await query(
    "UPDATE solicitudes SET estado=?, aprobador_id=? WHERE id=?",
    [status, approverId, id],
  );

  return (
    await query(
      `SELECT s.id, s.colaborador_id, c.nombre, c.email, c.departamento, c.puesto,
              s.tipo, s.fecha_inicio, s.fecha_fin, s.estado, s.creada_en,
              a.nombre AS aprobador_nombre
       FROM solicitudes s
       JOIN colaboradores c ON c.id=s.colaborador_id
       LEFT JOIN colaboradores a ON a.id=s.aprobador_id
       WHERE s.id=?`,
      [id],
    )
  ).rows[0];
}
