import assert from "node:assert/strict";
import { pool, query } from "../src/config/database.js";
import { today, shiftDate, monthStart } from "../src/utils/dates.js";
import { numbersSupported } from "../src/services/reports/summary.service.js";
const day = process.argv[2] || today(),
  start = monthStart(day),
  previous = shiftDate(day, -1);
try {
  const report = (
    await query("SELECT * FROM reportes_diarios WHERE fecha=?", [day])
  ).rows[0];
  assert.ok(report, "Primero genera el reporte de esta fecha");
  const d =
    typeof report.datos_json === "string"
      ? JSON.parse(report.datos_json)
      : report.datos_json;
  const [people, requests, medical, movements, balances, chats] =
    await Promise.all(
      [
        "colaboradores",
        "solicitudes",
        "incapacidades",
        "movimientos_personal",
        "saldos_vacaciones",
        "consultas_chat",
      ].map((table) => query(`SELECT * FROM ${table}`)),
    );
  // Validación independiente: agregar registros base en JS, sin reutilizar
  // las consultas de agregación ni buildReport.
  const active = (date) =>
    new Set(
      people.rows
        .filter(
          (p) =>
            p.fecha_ingreso <= date &&
            !movements.rows.some(
              (m) =>
                m.colaborador_id === p.id &&
                m.tipo === "salida" &&
                m.fecha <= date,
            ),
        )
        .map((p) => p.id),
    );
  const absence = (date) =>
    new Set(
      [
        ...requests.rows.filter(
          (s) =>
            s.estado === "aprobada" &&
            s.fecha_inicio <= date &&
            s.fecha_fin >= date,
        ),
        ...medical.rows.filter(
          (i) =>
            i.fecha_inicio <= date &&
            shiftDate(i.fecha_inicio, i.dias - 1) >= date,
        ),
      ]
        .filter((r) => active(date).has(r.colaborador_id))
        .map((r) => r.colaborador_id),
    );
  assert.equal(d.ausentes_total, absence(day).size, "Ausencias de hoy");
  assert.equal(d.colaboradores_activos, active(day).size, "Plantilla");
  const pending = requests.rows.filter(
    (r) => r.estado === "pendiente" && r.creada_en.slice(0, 10) <= day,
  );
  assert.equal(d.pendientes_total, pending.length, "Pendientes");
  assert.equal(
    d.pendientes_mas_3_dias,
    pending.filter((r) => r.creada_en.slice(0, 10) < shiftDate(day, -3)).length,
    "Pendientes >3 días",
  );
  assert.equal(
    d.incapacidades.activas,
    new Set(
      medical.rows
        .filter(
          (i) =>
            i.fecha_inicio <= day &&
            shiftDate(i.fecha_inicio, i.dias - 1) >= day,
        )
        .map((i) => i.colaborador_id),
    ).size,
    "Incapacidades activas",
  );
  let medicalDays = 0;
  for (let date = start; date <= day; date = shiftDate(date, 1))
    medicalDays += medical.rows.filter(
      (i) =>
        i.fecha_inicio <= date && shiftDate(i.fecha_inicio, i.dias - 1) >= date,
    ).length;
  assert.equal(d.incapacidades.dias_mes, medicalDays, "Días médicos del mes");
  const exits = movements.rows.filter(
    (m) => m.tipo === "salida" && m.fecha >= start && m.fecha <= day,
  ).length;
  for (const type of ["ingreso", "salida", "ascenso"])
    assert.equal(
      Number(d.movimientos.find((m) => m.tipo === type)?.total || 0),
      movements.rows.filter(
        (m) => m.tipo === type && m.fecha >= start && m.fecha <= day,
      ).length,
      `Movimientos ${type}`,
    );
  const denominator =
    (active(shiftDate(start, -1)).size + active(day).size) / 2;
  assert.equal(
    d.rotacion_porcentaje,
    denominator ? Number(((exits / denominator) * 100).toFixed(2)) : 0,
    "Rotación",
  );
  const risks = balances.rows.filter(
    (b) =>
      b.periodo === Number(day.slice(0, 4)) &&
      Number(b.dias_disponibles) > 20 &&
      people.rows.some(
        (p) => p.id === b.colaborador_id && p.estado === "activo",
      ),
  );
  assert.equal(
    d.vacaciones_riesgo_total,
    risks.length,
    "Vacaciones acumuladas",
  );
  const usage = chats.rows.filter(
    (c) => c.fecha >= `${previous} 06:00:00` && c.fecha < `${day} 06:00:00`,
  );
  assert.equal(d.uso.consultas, usage.length, "Consultas del día anterior");
  const resolved = usage.filter((c) => c.resuelta && !c.escalada).length;
  assert.equal(
    d.uso.porcentaje_resuelto,
    usage.length ? Number(((resolved / usage.length) * 100).toFixed(2)) : 0,
    "Resolución sin escalar",
  );
  assert.equal(
    d.uso.latencia_promedio_ms,
    usage.length
      ? Math.round(usage.reduce((n, c) => n + c.latencia_ms, 0) / usage.length)
      : 0,
    "Latencia media",
  );
  const topics = new Map();
  for (const c of usage) topics.set(c.tema, (topics.get(c.tema) || 0) + 1);
  for (const t of d.temas_frecuentes)
    assert.equal(Number(t.total), topics.get(t.tema), "Conteo por tema");
  assert.equal(d.temas_frecuentes.length, Math.min(5, topics.size), "Top 5");
  for (const gap of d.preguntas_sin_respuesta)
    assert.ok(
      usage.some(
        (c) =>
          c.pregunta === gap.pregunta &&
          !c.resuelta &&
          ["POLITICA", "MIXTA"].includes(c.intencion),
      ),
      "Pregunta sin respuesta",
    );
  assert.equal(d.tendencia_30_dias.length, 30);
  for (const row of d.tendencia_30_dias)
    assert.equal(
      row.ausentes,
      absence(row.fecha).size,
      `Tendencia ${row.fecha}`,
    );
  assert.ok(
    numbersSupported(report.resumen_texto, d),
    "Cifras del resumen respaldadas",
  );
  console.log(
    JSON.stringify({
      fecha: day,
      generadoPor: report.generado_por,
      componentesValidados: 8,
      tendenciaValidada: 30,
      ausentes: d.ausentes_total,
      pendientes: d.pendientes_total,
      resultado: "correcto",
    }),
  );
} finally {
  await pool.end();
}
