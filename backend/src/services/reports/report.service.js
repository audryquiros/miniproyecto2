import { pool, query } from "../../config/database.js";
import { today, shiftDate, monthStart } from "../../utils/dates.js";
import { executiveSummary } from "./summary.service.js";
export function parseReport(row) {
  return row
    ? {
        ...row,
        datos_json:
          typeof row.datos_json === "string"
            ? JSON.parse(row.datos_json)
            : row.datos_json,
      }
    : null;
}
export async function listReports() {
  return (
    await query(
      "SELECT fecha,creado_en FROM reportes_diarios ORDER BY fecha DESC LIMIT 90",
    )
  ).rows;
}
export async function getReport(day) {
  return parseReport(
    (await query("SELECT * FROM reportes_diarios WHERE fecha=?", [day]))
      .rows[0],
  );
}
export async function buildReport(day = today()) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    Number.isNaN(Date.parse(day)) ||
    new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day
  )
    throw Object.assign(new Error("Fecha inválida."), { status: 400 });
  const c = await pool.getConnection();
  let lock = false;
  try {
    const [[row]] = await c.query("SELECT GET_LOCK(?,0) acquired", [
      `report:${day}`,
    ]);
    lock = !!row.acquired;
    if (!lock)
      throw Object.assign(new Error("El reporte ya se está generando."), {
        status: 409,
      });
    const existing = await getReport(day);
    if (existing) return existing;
    const start = monthStart(day),
      previous = shiftDate(day, -1),
      trendStart = shiftDate(day, -29);
    // One consistent snapshot keeps the figures used by every section aligned.
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await c.beginTransaction();
    const sql = async (statement, params = []) =>
      (await c.execute(statement, params))[0];
    const absenceUnion = `SELECT s.colaborador_id,s.tipo,c.departamento FROM solicitudes s JOIN colaboradores c ON c.id=s.colaborador_id
      WHERE s.estado='aprobada' AND s.fecha_inicio<=? AND s.fecha_fin>=? AND c.fecha_ingreso<=?
      AND NOT EXISTS(SELECT 1 FROM movimientos_personal m WHERE m.colaborador_id=c.id AND m.tipo='salida' AND m.fecha<=?)
      UNION ALL SELECT i.colaborador_id,'incapacidad',c.departamento FROM incapacidades i JOIN colaboradores c ON c.id=i.colaborador_id
      WHERE i.fecha_inicio<=? AND DATE_ADD(i.fecha_inicio, INTERVAL (i.dias-1) DAY)>=? AND c.fecha_ingreso<=?
      AND NOT EXISTS(SELECT 1 FROM movimientos_personal m WHERE m.colaborador_id=c.id AND m.tipo='salida' AND m.fecha<=?)`;
    const absence = await sql(
      `SELECT tipo,departamento,COUNT(DISTINCT colaborador_id) total FROM (${absenceUnion}) a GROUP BY tipo,departamento`,
      Array(8).fill(day),
    );
    const absentTotal = await sql(
      `SELECT COUNT(DISTINCT colaborador_id) total FROM (${absenceUnion}) a`,
      Array(8).fill(day),
    );
    const pending = await sql(
      `SELECT s.id,c.nombre,c.departamento,s.tipo,s.fecha_inicio,s.fecha_fin,s.creada_en,
      DATEDIFF(?,DATE(s.creada_en)) dias_espera FROM solicitudes s JOIN colaboradores c ON c.id=s.colaborador_id
      WHERE s.estado='pendiente' AND DATE(s.creada_en)<=? ORDER BY s.creada_en`,
      [day, day],
    );
    const medical = await sql(
      `SELECT COUNT(*) activas,COALESCE(SUM(DATEDIFF(LEAST(DATE_ADD(fecha_inicio,INTERVAL (dias-1) DAY),?),GREATEST(fecha_inicio,?))+1),0) dias_mes
      FROM incapacidades WHERE fecha_inicio<=? AND DATE_ADD(fecha_inicio,INTERVAL (dias-1) DAY)>=?`,
      [day, start, day, start],
    );
    const activeMedical = await sql(
      "SELECT COUNT(DISTINCT colaborador_id) total FROM incapacidades WHERE fecha_inicio<=? AND DATE_ADD(fecha_inicio,INTERVAL (dias-1) DAY)>=?",
      [day, day],
    );
    const movements = await sql(
      "SELECT tipo,COUNT(*) total FROM movimientos_personal WHERE fecha BETWEEN ? AND ? GROUP BY tipo",
      [start, day],
    );
    const headcount = await sql(
      `SELECT COUNT(*) total FROM colaboradores c WHERE c.fecha_ingreso<=? AND NOT EXISTS(SELECT 1 FROM movimientos_personal m WHERE m.colaborador_id=c.id AND m.tipo='salida' AND m.fecha<=?)`,
      [day, day],
    );
    const openingHeadcount = await sql(
      `SELECT COUNT(*) total FROM colaboradores c WHERE c.fecha_ingreso<? AND NOT EXISTS(SELECT 1 FROM movimientos_personal m WHERE m.colaborador_id=c.id AND m.tipo='salida' AND m.fecha<?)`,
      [start, start],
    );
    const liability = await sql(
      `SELECT c.id,c.nombre,c.departamento,s.dias_disponibles FROM saldos_vacaciones s JOIN colaboradores c ON c.id=s.colaborador_id
      WHERE s.periodo=? AND s.dias_disponibles>20 AND c.estado='activo' ORDER BY s.dias_disponibles DESC`,
      [+day.slice(0, 4)],
    );
    const usage = await sql(
      `SELECT COUNT(*) consultas,COALESCE(SUM(resuelta=1 AND escalada=0),0) resueltas,COALESCE(AVG(latencia_ms),0) latencia_promedio_ms
      FROM consultas_chat WHERE fecha>=? AND fecha<?`,
      [`${previous} 06:00:00`, `${day} 06:00:00`],
    );
    const topics = await sql(
      `SELECT tema,COUNT(*) total FROM consultas_chat WHERE fecha>=? AND fecha<? GROUP BY tema ORDER BY total DESC,tema LIMIT 5`,
      [`${previous} 06:00:00`, `${day} 06:00:00`],
    );
    // Remove personal questions from the RAG gap list; it is a documentation diagnostic.
    const gaps = await sql(
      `SELECT pregunta,COUNT(*) total FROM consultas_chat WHERE resuelta=0 AND intencion IN ('POLITICA','MIXTA') AND fecha>=? AND fecha<? GROUP BY pregunta ORDER BY total DESC LIMIT 20`,
      [`${previous} 06:00:00`, `${day} 06:00:00`],
    );
    const trend = [];
    for (let n = 0; n < 30; n++) {
      const date = shiftDate(trendStart, n);
      const rows = await sql(
        `SELECT COUNT(DISTINCT colaborador_id) total FROM (${absenceUnion}) a`,
        Array(8).fill(date),
      );
      trend.push({ fecha: date, ausentes: +rows[0].total });
    }
    const exits = +(movements.find((r) => r.tipo === "salida")?.total || 0),
      denominator = (+headcount[0].total + +openingHeadcount[0].total) / 2;
    const data = {
      fecha: day,
      periodo_uso: previous,
      colaboradores_activos: +headcount[0].total,
      ausentes_total: +absentTotal[0].total,
      ausencias: absence,
      solicitudes_pendientes: pending,
      pendientes_total: pending.length,
      pendientes_mas_3_dias: pending.filter((r) => r.dias_espera > 3).length,
      incapacidades: {
        activas: +activeMedical[0].total,
        dias_mes: +medical[0].dias_mes,
      },
      movimientos: movements,
      rotacion_porcentaje: denominator
        ? Number(((exits / denominator) * 100).toFixed(2))
        : 0,
      vacaciones_riesgo: liability,
      vacaciones_riesgo_total: liability.length,
      uso: {
        consultas: +usage[0].consultas,
        resueltas: +usage[0].resueltas,
        porcentaje_resuelto: usage[0].consultas
          ? Number(((usage[0].resueltas / usage[0].consultas) * 100).toFixed(2))
          : 0,
        latencia_promedio_ms: Math.round(usage[0].latencia_promedio_ms),
      },
      temas_frecuentes: topics,
      preguntas_sin_respuesta: gaps,
      tendencia_30_dias: trend,
      metodologia:
        "Rotación mensual: salidas / promedio de plantilla al inicio y cierre del período. Días médicos: intersección inclusiva con el mes hasta la fecha. Uso del chat: día anterior en Costa Rica. Saldos y pendientes: instantánea al generar; los reportes publicados son inmutables.",
    };
    await c.commit();
    const summary = await executiveSummary(data);
    await c.execute(
      "INSERT INTO reportes_diarios(fecha,datos_json,resumen_texto,generado_por) VALUES (?,?,?,?)",
      [day, JSON.stringify(data), summary.text, summary.provider],
    );
    return getReport(day);
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    if (lock) await c.query("SELECT RELEASE_LOCK(?)", [`report:${day}`]);
    c.release();
  }
}
