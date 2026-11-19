import { query } from "../../config/database.js";
import { today, TIME_ZONE } from "../../utils/dates.js";

const MIN_HOURS = Number(process.env.WORKDAY_MIN_HOURS || 8);
const WORKDAY_START = process.env.WORKDAY_START || "08:00";
const WORKDAY_END = process.env.WORKDAY_END || "17:00";

function costaRicaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
}

function nowUtcMysql() {
  const d = new Date();
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function parseMysqlUtc(value) {
  if (value instanceof Date) return value;
  return new Date(String(value).replace(" ", "T") + "Z");
}

function minutesBetween(entrada, salida) {
  return Math.max(0, Math.round((parseMysqlUtc(salida).getTime() - parseMysqlUtc(entrada).getTime()) / 60000));
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

function isWeekday(day) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(new Date(`${day}T12:00:00Z`));
  return weekday !== "Sat" && weekday !== "Sun";
}

async function getAttendance(userId, day = today()) {
  return (await query(
    `SELECT a.id,a.fecha,a.hora_entrada,a.hora_salida,a.minutos_trabajados,a.estado,a.observacion,
      CASE WHEN a.minutos_trabajados IS NULL THEN NULL ELSE ROUND(a.minutos_trabajados/60,2) END horas_trabajadas
     FROM asistencias a WHERE a.colaborador_id=? AND a.fecha=?`,
    [userId, day],
  )).rows[0] || null;
}

async function ensureAlert({ attendanceId, collaboratorId, type, message }) {
  const existing = await query(
    "SELECT id FROM alertas_asistencia WHERE asistencia_id=? AND tipo=? AND estado='pendiente' LIMIT 1",
    [attendanceId, type],
  );
  if (existing.rows.length) return existing.rows[0].id;
  const result = await query(
    "INSERT INTO alertas_asistencia(asistencia_id,colaborador_id,tipo,mensaje) VALUES (?,?,?,?)",
    [attendanceId, collaboratorId, type, message],
  );
  return result.rows.insertId;
}

async function maybeCreateAutomaticSanction(alertId, collaboratorId, alertType) {
  const enabled = String(process.env.AUTO_ATTENDANCE_SANCTIONS || "true").toLowerCase() !== "false";
  const threshold = Math.max(2, Number(process.env.AUTO_SANCTION_THRESHOLD || 3));
  if (!enabled || alertType !== "horas_insuficientes") return null;
  const repeated = await query(
    `SELECT COUNT(*) total FROM alertas_asistencia
     WHERE colaborador_id=? AND tipo='horas_insuficientes'
       AND creada_en >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)`,
    [collaboratorId],
  );
  if (Number(repeated.rows[0]?.total || 0) < threshold) return null;
  const existing = await query("SELECT id FROM sanciones_asistencia WHERE alerta_id=? LIMIT 1", [alertId]);
  if (existing.rows.length) return existing.rows[0].id;
  const result = await query(
    `INSERT INTO sanciones_asistencia(alerta_id,colaborador_id,aplicada_por,tipo,motivo,observaciones,estado,origen)
     VALUES (?,?,(SELECT id FROM colaboradores WHERE rol='RRHH' AND estado='activo' ORDER BY id LIMIT 1),'advertencia',?,?, 'registrada','automatica')`,
    [alertId, collaboratorId, `Regla automática: se registraron ${Number(repeated.rows[0].total)} incidencias de horas insuficientes en los últimos 30 días.`, "Pendiente de revisión por RR. HH. La medida puede revocarse si existe justificación, permiso, incapacidad o error de marcación."],
  );
  return result.rows.insertId;
}

export async function getTodayAttendance(userId) {
  const day = today();
  const attendance = await getAttendance(userId, day);
  return {
    fecha: day,
    entrada_referencia: WORKDAY_START,
    salida_referencia: WORKDAY_END,
    minimo_horas: MIN_HOURS,
    asistencia: attendance,
  };
}

export async function checkIn(userId) {
  const day = today();
  if (!isWeekday(day)) throw Object.assign(new Error("La jornada de referencia es de lunes a viernes."), { status: 400 });
  const current = await getAttendance(userId, day);
  if (current?.hora_entrada) throw Object.assign(new Error("Ya registraste tu hora de entrada hoy."), { status: 409 });
  const result = await query(
    `INSERT INTO asistencias(colaborador_id,fecha,hora_entrada,estado) VALUES (?,?,?, 'incompleta')`,
    [userId, day, nowUtcMysql()],
  );
  return getTodayAttendance(userId);
}

export async function checkOut(userId) {
  const day = today();
  const current = await getAttendance(userId, day);
  if (!current?.hora_entrada) throw Object.assign(new Error("Primero debes registrar tu hora de entrada."), { status: 400 });
  if (current.hora_salida) throw Object.assign(new Error("Ya registraste tu hora de salida hoy."), { status: 409 });

  const salida = nowUtcMysql();
  const minutes = minutesBetween(current.hora_entrada, salida);
  const insufficient = minutes < MIN_HOURS * 60;
  const status = insufficient ? "incidencia" : "completa";
  await query(
    "UPDATE asistencias SET hora_salida=?,minutos_trabajados=?,estado=? WHERE id=?",
    [salida, minutes, status, current.id],
  );
  if (insufficient) {
    await ensureAlert({
      attendanceId: current.id,
      collaboratorId: userId,
      type: "horas_insuficientes",
      message: `El colaborador registró ${formatHours(minutes)} de trabajo el ${day}; el mínimo configurado para la jornada de referencia es de ${MIN_HOURS} horas.`,
    });
    const alert = await query("SELECT id FROM alertas_asistencia WHERE asistencia_id=? AND tipo=? ORDER BY id DESC LIMIT 1", [current.id, "horas_insuficientes"]);
    if (alert.rows[0]) await maybeCreateAutomaticSanction(alert.rows[0].id, userId, "horas_insuficientes");
  }
  return getTodayAttendance(userId);
}

export async function editAttendance(hrUserId, attendanceId, { hora_entrada, hora_salida, observacion = "" }) {
  const current = (await query("SELECT * FROM asistencias WHERE id=?", [attendanceId])).rows[0];
  if (!current) throw Object.assign(new Error("Registro de asistencia no encontrado."), { status: 404 });
  const entrada = hora_entrada ? new Date(hora_entrada) : null;
  const salida = hora_salida ? new Date(hora_salida) : null;
  if (entrada && Number.isNaN(entrada.getTime())) throw Object.assign(new Error("Hora de entrada inválida."), { status: 400 });
  if (salida && Number.isNaN(salida.getTime())) throw Object.assign(new Error("Hora de salida inválida."), { status: 400 });
  if (entrada && salida && salida <= entrada) throw Object.assign(new Error("La salida debe ser posterior a la entrada."), { status: 400 });
  const minutes = entrada && salida ? Math.max(0, Math.round((salida.getTime() - entrada.getTime()) / 60000)) : null;
  const status = !entrada && !salida ? "incidencia" : !salida ? "incompleta" : minutes < MIN_HOURS * 60 ? "incidencia" : "completa";
  await query("UPDATE asistencias SET hora_entrada=?,hora_salida=?,minutos_trabajados=?,estado=?,observacion=? WHERE id=?", [
    entrada ? entrada.toISOString().slice(0,19).replace("T"," ") : null,
    salida ? salida.toISOString().slice(0,19).replace("T"," ") : null,
    minutes, status, String(observacion || "").slice(0,500), attendanceId,
  ]);
  if (minutes != null && minutes < MIN_HOURS * 60) {
    const alertId = await ensureAlert({ attendanceId, collaboratorId: current.colaborador_id, type: "horas_insuficientes", message: `RR. HH. ajustó el registro y resultan ${formatHours(minutes)} de trabajo; el mínimo configurado es de ${MIN_HOURS} horas.` });
    await maybeCreateAutomaticSanction(alertId, current.colaborador_id, "horas_insuficientes");
  }
  if (entrada && salida && minutes >= MIN_HOURS * 60) await query("UPDATE alertas_asistencia SET estado='cerrada',revisada_por=?,revisada_en=UTC_TIMESTAMP() WHERE asistencia_id=? AND tipo='horas_insuficientes' AND estado='pendiente'", [hrUserId, attendanceId]);
  return getAttendance(current.colaborador_id, current.fecha);
}

export async function revokeSanction(hrUserId, sanctionId, reason) {
  const clean = String(reason || "").trim();
  if (clean.length < 5) throw Object.assign(new Error("Debes indicar el motivo de la revocación."), { status: 400 });
  const result = await query("UPDATE sanciones_asistencia SET estado='anulada',anulada_por=?,anulada_en=UTC_TIMESTAMP(),motivo_anulacion=? WHERE id=? AND estado='registrada'", [hrUserId, clean.slice(0,500), sanctionId]);
  if (!result.rows.affectedRows) throw Object.assign(new Error("La medida no existe o ya fue anulada."), { status: 404 });
  return { success: true };
}

export async function listMyAttendance(userId, limit = 30) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 90);
  return (await query(
    `SELECT id,fecha,hora_entrada,hora_salida,minutos_trabajados,estado,observacion,
      CASE WHEN minutos_trabajados IS NULL THEN NULL ELSE ROUND(minutos_trabajados/60,2) END horas_trabajadas
     FROM asistencias WHERE colaborador_id=? ORDER BY fecha DESC LIMIT ${safeLimit}`,
    [userId],
  )).rows;
}

export async function listHRAlerts({ status = "pendiente", limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const allowed = new Set(["pendiente", "revisada", "cerrada", "todas"]);
  if (!allowed.has(status)) throw Object.assign(new Error("Estado de alerta inválido."), { status: 400 });
  const where = status === "todas" ? "" : "WHERE a.estado=?";
  const params = status === "todas" ? [] : [status];
  return (await query(
    `SELECT a.id,a.tipo,a.mensaje,a.estado,a.creada_en,a.revisada_en,
      s.id AS sancion_id,s.tipo AS sancion_tipo,s.estado AS sancion_estado,s.origen AS sancion_origen,
      c.id AS colaborador_id,c.nombre,c.email,c.departamento,c.puesto,
      ar.id AS asistencia_id,ar.fecha,ar.hora_entrada,ar.hora_salida,ar.minutos_trabajados,ar.observacion,
      CASE WHEN ar.minutos_trabajados IS NULL THEN NULL ELSE ROUND(ar.minutos_trabajados/60,2) END horas_trabajadas
     FROM alertas_asistencia a
     JOIN colaboradores c ON c.id=a.colaborador_id
     JOIN asistencias ar ON ar.id=a.asistencia_id
     LEFT JOIN sanciones_asistencia s ON s.alerta_id=a.id AND s.estado='registrada'
     ${where}
     ORDER BY a.creada_en DESC LIMIT ${safeLimit}`,
    params,
  )).rows;
}

export async function reviewAlert(hrUserId, alertId) {
  const result = await query(
    "UPDATE alertas_asistencia SET estado='revisada',revisada_por=?,revisada_en=UTC_TIMESTAMP() WHERE id=? AND estado='pendiente'",
    [hrUserId, alertId],
  );
  if (!result.rows.affectedRows) throw Object.assign(new Error("La alerta no existe o ya fue revisada."), { status: 404 });
  return { success: true };
}

export async function applySanction(hrUserId, { alertId, type, reason, observations = "" }) {
  const allowed = new Set(["advertencia", "amonestacion_escrita", "plan_correctivo", "suspension", "otra"]);
  if (!allowed.has(type)) throw Object.assign(new Error("Tipo de medida disciplinaria inválido."), { status: 400 });
  if (typeof reason !== "string" || reason.trim().length < 5 || reason.length > 4000)
    throw Object.assign(new Error("Debes indicar un motivo válido para la medida."), { status: 400 });

  const alert = (await query(
    "SELECT id,colaborador_id FROM alertas_asistencia WHERE id=?",
    [alertId],
  )).rows[0];
  if (!alert) throw Object.assign(new Error("La alerta no existe."), { status: 404 });

  const existing = await query(
    "SELECT id FROM sanciones_asistencia WHERE alerta_id=? AND estado='registrada' LIMIT 1",
    [alertId],
  );
  if (existing.rows.length) throw Object.assign(new Error("Esta alerta ya tiene una medida disciplinaria registrada."), { status: 409 });

  const result = await query(
    `INSERT INTO sanciones_asistencia(alerta_id,colaborador_id,aplicada_por,tipo,motivo,observaciones)
     VALUES (?,?,?,?,?,?)`,
    [alertId, alert.colaborador_id, hrUserId, type, reason.trim(), String(observations || "").slice(0, 4000)],
  );
  await query(
    "UPDATE alertas_asistencia SET estado='cerrada',revisada_por=?,revisada_en=UTC_TIMESTAMP() WHERE id=?",
    [hrUserId, alertId],
  );
  return { success: true, id: result.rows.insertId };
}

export async function listSanctions(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return (await query(
    `SELECT s.id,s.tipo,s.motivo,s.observaciones,s.estado,s.origen,s.creada_en,s.anulada_en,s.motivo_anulacion,
      c.nombre,c.email,c.departamento,
      h.nombre AS aplicada_por_nombre
     FROM sanciones_asistencia s
     JOIN colaboradores c ON c.id=s.colaborador_id
     JOIN colaboradores h ON h.id=s.aplicada_por
     ORDER BY s.creada_en DESC LIMIT ${safeLimit}`,
    [],
  )).rows;
}

export async function closeOpenAttendanceAlerts(day = today()) {
  if (!isWeekday(day)) return { created: 0 };
  const active = (await query(
    `SELECT c.id,c.nombre FROM colaboradores c
     WHERE c.estado='activo' AND NOT EXISTS(
       SELECT 1 FROM solicitudes s WHERE s.colaborador_id=c.id AND s.estado='aprobada' AND s.fecha_inicio<=? AND s.fecha_fin>=?
     ) AND NOT EXISTS(
       SELECT 1 FROM incapacidades i WHERE i.colaborador_id=c.id AND i.fecha_inicio<=? AND DATE_ADD(i.fecha_inicio, INTERVAL (i.dias-1) DAY)>=?
     )`,
    [day, day, day, day],
  )).rows;
  let created = 0;
  for (const person of active) {
    const attendance = await getAttendance(person.id, day);
    if (!attendance) {
      const result = await query(
        "INSERT INTO asistencias(colaborador_id,fecha,estado,observacion) VALUES (?,?, 'incidencia', 'Sin marcación registrada al cierre de la jornada.')",
        [person.id, day],
      );
      await ensureAlert({
        attendanceId: result.rows.insertId,
        collaboratorId: person.id,
        type: "sin_marcacion",
        message: `El colaborador ${person.nombre} no registra entrada ni salida para el ${day}.`,
      });
      created++;
    } else if (!attendance.hora_salida && attendance.hora_entrada) {
      await query("UPDATE asistencias SET estado='incidencia',observacion='No se registró hora de salida al cierre de la jornada.' WHERE id=?", [attendance.id]);
      await ensureAlert({
        attendanceId: attendance.id,
        collaboratorId: person.id,
        type: "sin_salida",
        message: `El colaborador ${person.nombre} registró entrada pero no registra hora de salida para el ${day}.`,
      });
      created++;
    }
  }
  return { created };
}

export { MIN_HOURS, WORKDAY_START, WORKDAY_END, formatHours };
