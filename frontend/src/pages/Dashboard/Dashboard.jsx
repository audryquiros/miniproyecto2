import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
function Trend({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.ausentes));
  const points = rows.map((r, i) => [
    45 + (i * 490) / Math.max(1, rows.length - 1),
    155 - (r.ausentes / max) * 120,
  ]);
  return (
    <figure>
      <figcaption>Personas ausentes · últimos 30 días</figcaption>
      <svg
        viewBox="0 0 570 210"
        role="img"
        aria-label="Tendencia de personas ausentes durante 30 días"
      >
        <line x1="45" y1="155" x2="535" y2="155" stroke="currentColor" />
        <line x1="45" y1="30" x2="45" y2="155" stroke="currentColor" />
        <text x="12" y="40">
          {max}
        </text>
        <text x="25" y="158">
          0
        </text>
        <polyline
          fill="none"
          stroke="#6d5dfc"
          strokeWidth="3"
          points={points.map((p) => p.join(",")).join(" ")}
        />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#6d5dfc">
            <title>
              {rows[i].fecha + ": " + rows[i].ausentes + " personas"}
            </title>
          </circle>
        ))}
        <text x="45" y="182">
          {rows[0]?.fecha}
        </text>
        <text x="450" y="182">
          {rows.at(-1)?.fecha}
        </text>
        <text x="250" y="203">
          Fecha
        </text>
        <text x="50" y="20">
          Personas
        </text>
      </svg>
      <small>
        Fuente: solicitudes aprobadas e incapacidades. Conteo distinto por
        persona.
      </small>
    </figure>
  );
}
function AbsenceChart({ rows }) {
  const types = ["vacaciones", "permiso", "incapacidad"];
  const totals = types.map((tipo) => ({
    tipo,
    total: rows
      .filter((r) => r.tipo === tipo)
      .reduce((n, r) => n + Number(r.total), 0),
  }));
  const max = Math.max(1, ...totals.map((r) => r.total));
  return (
    <figure>
      <figcaption>Ausencias por tipo · fecha del reporte</figcaption>
      <svg
        viewBox="0 0 570 210"
        role="img"
        aria-label="Personas ausentes por tipo"
      >
        {totals.map((r, i) => (
          <g key={r.tipo}>
            <text x="8" y={50 + i * 48}>
              {r.tipo}
            </text>
            <rect
              x="130"
              y={30 + i * 48}
              width={(350 * r.total) / max}
              height="26"
              rx="3"
              fill="#6d5dfc"
            />
            <text x={140 + (350 * r.total) / max} y={50 + i * 48}>
              {r.total}
            </text>
          </g>
        ))}
        <text x="240" y="195">
          Personas por tipo
        </text>
      </svg>
      <small>
        Fuente: SQL del reporte. Una persona puede figurar en más de un tipo.
      </small>
    </figure>
  );
}
export default function Dashboard({ demoMode = false }) {
  const [dates, setDates] = useState([]),
    [date, setDate] = useState(""),
    [report, setReport] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function loadDates() {
    const data = await api("/reports");
    setDates(data.reports);
    if (data.reports.length)
      setDate((previous) => previous || data.reports[0].fecha);
  }
  useEffect(() => {
    loadDates().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!date) return;
    let active = true;
    setBusy(true);
    setError("");
    api("/reports/" + date)
      .then((r) => {
        if (active) setReport(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [date]);
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await api("/reports/generate", { method: "POST" });
      setReport(r);
      setDate(r.fecha);
      await loadDates();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function sync() {
    setBusy(true);
    setError("");
    try {
      const r = await api("/ingestion/drive/sync", { method: "POST" });
      setError(
        "Sincronización completada: " + r.totalFiles + " archivos revisados.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const d = report?.datos_json;
  return (
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">SOLO RRHH · DATOS SIMULADOS</p>
          <h1>Panorama del equipo</h1>
          <p>
            Reportes publicados · programación diaria a las 7:00 a. m. de Costa
            Rica
          </p>
        </div>
        <div className="toolbar">
          <label>
            Historial
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={busy || !dates.length}
            >
              {dates.map((r) => (
                <option key={r.fecha}>{r.fecha}</option>
              ))}
            </select>
          </label>
          <button className="primary" onClick={generate} disabled={busy}>
            Generar reporte de hoy
          </button>
          {!demoMode && (
            <button onClick={sync} disabled={busy}>
              Sincronizar Drive
            </button>
          )}
        </div>
      </header>
      {error && (
        <p className="notice" role="status">
          {error}
        </p>
      )}
      {busy && <p role="status">Procesando…</p>}
      {!d && !busy ? (
        <div className="empty">
          <h2>Aún no hay reportes publicados</h2>
          <p>
            Genera el reporte de hoy después de cargar los datos. Los siguientes
            se publicarán automáticamente con el servidor activo.
          </p>
        </div>
      ) : (
        d && (
          <>
            <div className="metrics">
              {[
                [
                  "Personas ausentes",
                  d.ausentes_total,
                  "Plantilla activa: " + d.colaboradores_activos,
                ],
                [
                  "Solicitudes pendientes",
                  d.pendientes_total,
                  d.pendientes_mas_3_dias + " con más de 3 días",
                ],
                [
                  "Incapacidades activas",
                  d.incapacidades.activas,
                  d.incapacidades.dias_mes + " días acumulados este mes",
                ],
                [
                  "Rotación del mes",
                  d.rotacion_porcentaje + "%",
                  d.vacaciones_riesgo_total + " personas con más de 20 días",
                ],
              ].map(([label, value, hint]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{hint}</small>
                </article>
              ))}
            </div>
            <article className="executive">
              <p className="eyebrow">RESUMEN EJECUTIVO</p>
              <p>{report.resumen_texto}</p>
              <small>
                Publicado: {report.fecha} · Generado por: {report.generado_por}
              </small>
            </article>
            <div className="charts">
              <Trend rows={d.tendencia_30_dias} />
              <AbsenceChart rows={d.ausencias} />
            </div>
            <h2>Solicitudes pendientes</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>Departamento</th>
                    <th>Tipo</th>
                    <th>Desde</th>
                    <th>Espera</th>
                  </tr>
                </thead>
                <tbody>
                  {d.solicitudes_pendientes.map((r) => (
                    <tr key={r.id}>
                      <td>{r.nombre}</td>
                      <td>{r.departamento}</td>
                      <td>{r.tipo}</td>
                      <td>{r.fecha_inicio}</td>
                      <td>
                        <span
                          className={
                            r.dias_espera > 3 ? "badge pendiente" : "badge"
                          }
                        >
                          {r.dias_espera} días
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!d.pendientes_total && <p>No hay solicitudes pendientes.</p>}
            </div>
            <div className="details-grid">
              <article>
                <h2>Uso del asistente</h2>
                <p>
                  {d.uso.consultas} consultas del {d.periodo_uso}
                </p>
                <p>
                  {d.uso.porcentaje_resuelto}% resueltas sin escalar ·{" "}
                  {d.uso.latencia_promedio_ms} ms de latencia promedio
                </p>
                <h3>Temas más consultados</h3>
                {d.temas_frecuentes.length ? (
                  <ul>
                    {d.temas_frecuentes.map((r) => (
                      <li key={r.tema}>
                        {r.tema}: {r.total}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Sin consultas en ese período.</p>
                )}
              </article>
              <article>
                <h2>Preguntas sin evidencia</h2>
                {d.preguntas_sin_respuesta.length ? (
                  <ul>
                    {d.preguntas_sin_respuesta.map((r, i) => (
                      <li key={i}>
                        {r.pregunta} ({r.total})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No se registraron consultas de políticas sin resolver.</p>
                )}
                <h3>Ingresos y salidas del mes</h3>
                <p>
                  {["ingreso", "salida", "ascenso"]
                    .map(
                      (t) =>
                        t +
                        ": " +
                        (d.movimientos.find((r) => r.tipo === t)?.total || 0),
                    )
                    .join(" · ")}
                </p>
              </article>
            </div>
            <details>
              <summary>Vacaciones acumuladas y metodología</summary>
              <ul>
                {d.vacaciones_riesgo.map((r) => (
                  <li key={r.id}>
                    {r.nombre} · {r.departamento}: {r.dias_disponibles} días
                  </li>
                ))}
              </ul>
              <p>{d.metodologia}</p>
            </details>
          </>
        )
      )}
    </section>
  );
}
